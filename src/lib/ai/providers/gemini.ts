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

/**
 * Gemini-backed `AIProvider` using the current Interactions API
 * (`ai.interactions.create`), not the legacy `models.generateContent` path.
 */
export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });

  return {
    async generateBlueprint(input) {
      console.log(`[gemini] model = ${config.model}`);
      console.log(`[gemini] Attempt 1: ${config.model}`);

      try {
        return await requestBlueprintFromGemini({
          client,
          model: config.model,
          userPrompt: buildBlueprintUserPrompt(input.idea),
        });
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        throw new AIProviderError("Failed to reach the AI provider.", error);
      }
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
