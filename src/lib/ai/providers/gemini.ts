import { GoogleGenAI } from "@google/genai";

import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import type { Blueprint } from "@/types/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const MAX_OUTPUT_TOKENS = 4096;

/** Temporary: list models once per process so we can see what this API key can access. */
let listedModelIds: string[] | undefined;

/**
 * Gemini-backed `AIProvider` using the current Interactions API
 * (`ai.interactions.create`), not the legacy `models.generateContent` path.
 */
export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async generateBlueprint(input) {
      const available = await listAvailableModelIds(client);
      const models = buildGeminiAttempts(config.model, available);
      const failures: Array<{ model: string; reason: string }> = [];
      const userPrompt = buildBlueprintUserPrompt(input.idea);

      for (let index = 0; index < models.length; index += 1) {
        const model = models[index];
        console.log(`[gemini] Attempt ${index + 1}: ${model}`);

        try {
          return await requestBlueprintFromGemini({
            client,
            model,
            userPrompt,
          });
        } catch (error) {
          const reason = toFailureReason(error);
          failures.push({ model, reason });
          console.error(`[gemini] Attempt ${index + 1} failed: ${model} — ${reason}`);

          if (!isRetryableModelError(error) || index >= models.length - 1) {
            if (error instanceof AIProviderError) {
              throw error;
            }

            throw new AIProviderError("Failed to reach the AI provider.", error);
          }
        }
      }

      const summary = failures
        .map((failure) => `${failure.model}: ${failure.reason}`)
        .join("; ");

      throw new AIProviderError(
        `Failed to generate blueprint. Attempts: ${summary || "no models attempted"}`,
      );
    },
  };
}

async function requestBlueprintFromGemini(args: {
  client: GoogleGenAI;
  model: string;
  userPrompt: string;
}): Promise<Blueprint> {
  const { client, model, userPrompt } = args;
  let content: string | undefined;

  try {
    const interaction = await client.interactions.create({
      model,
      input: userPrompt,
      system_instruction: BLUEPRINT_SYSTEM_PROMPT,
      store: false,
      response_format: {
        type: "text",
        mime_type: "application/json",
      },
      generation_config: {
        max_output_tokens: MAX_OUTPUT_TOKENS,
        thinking_level: "minimal",
        thinking_summaries: "none",
      },
    });

    content = interaction.output_text?.trim();
  } catch (error) {
    if (isRetryableModelError(error)) {
      throw error;
    }

    throw new AIProviderError("Failed to reach the AI provider.", error);
  }

  if (!content) {
    throw new AIProviderError("AI provider returned no content.");
  }

  const parsed = parseJsonFromModelContent(content);
  const validated = blueprintSchema.safeParse(parsed);

  if (!validated.success) {
    console.error(
      "[blueprint] blueprintSchema validation failed:",
      validated.error.issues,
    );
    throw new AIProviderError("AI provider returned an invalid blueprint shape.");
  }

  return validated.data;
}

async function listAvailableModelIds(client: GoogleGenAI): Promise<string[]> {
  if (listedModelIds) {
    return listedModelIds;
  }

  const ids: string[] = [];

  try {
    const pager = await client.models.list();

    for await (const model of pager) {
      if (model.name) {
        ids.push(toModelId(model.name));
      }
    }

    listedModelIds = ids;
    console.log(
      `[gemini] available models for this API key (${ids.length}): ${ids.join(", ") || "(none)"}`,
    );
  } catch (error) {
    listedModelIds = [];
    console.error("[gemini] failed to list models:", toFailureReason(error));
  }

  return listedModelIds;
}

function buildGeminiAttempts(preferred: string, available: string[]): string[] {
  const attempts: string[] = [];
  const seen = new Set<string>();

  const candidates = [
    preferred,
    ...available.filter((id) => isTextGeminiModel(id)),
  ];

  for (const model of candidates) {
    if (!model || seen.has(model)) {
      continue;
    }

    seen.add(model);
    attempts.push(model);
  }

  return attempts;
}

function toModelId(name: string): string {
  return name.replace(/^models\//, "");
}

function isTextGeminiModel(id: string): boolean {
  if (!id.startsWith("gemini-")) {
    return false;
  }

  return !/image|audio|tts|live|robotics|lyria|embedding|imagen/i.test(id);
}

function isRetryableModelError(error: unknown): boolean {
  const text = toFailureReason(error);

  return (
    /\b404\b/.test(text) ||
    /NOT_FOUND/i.test(text) ||
    /no longer available/i.test(text) ||
    /unavailable/i.test(text) ||
    /deprecated/i.test(text) ||
    /Interactions API/i.test(text)
  );
}

function toFailureReason(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as {
      status?: unknown;
      code?: unknown;
      message?: unknown;
      statusText?: unknown;
    };
    const parts = [record.status, record.code, record.statusText, record.message]
      .filter((part) => part !== undefined && part !== null)
      .map(String);

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return String(error);
}
