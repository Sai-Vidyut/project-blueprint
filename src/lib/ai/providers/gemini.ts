import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

import { isDevForceFailure } from "@/lib/ai/dev-force-failure";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import {
  AIProviderError,
  type AIProvider,
  type AIProviderConfig,
  type AIProviderErrorKind,
} from "@/lib/ai/types";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import type { Blueprint } from "@/types/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const MAX_OUTPUT_TOKENS = 4096;

/**
 * Hard timeout for a single Gemini attempt. Also disables the SDK's own
 * internal retry/backoff (which retries 429/5xx up to 4x with up to 30s of
 * backoff by default) so a transient failure surfaces immediately and the
 * failover chain in `provider.ts` can move to the next provider without silently
 * burning additional quota on retries that are unlikely to succeed.
 */
const GEMINI_TIMEOUT_MS = 60_000;

/**
 * JSON Schema derived directly from `blueprintSchema`, generated once at
 * module load. Passed to Gemini via `response_format.schema` so field
 * counts, enum values, and required keys are enforced by the model
 * provider itself instead of relying on the prompt being followed exactly.
 *
 * `target: "openapi-3.0"` matches the schema subset Gemini's structured
 * output expects and drops the `$schema` meta-key that draft 2020-12 output
 * would otherwise include. Cross-field checks (e.g. the `architecture`
 * `superRefine` that ties `relationships[].from/to` to `components[].name`)
 * cannot be expressed in JSON Schema and are intentionally not covered here;
 * `blueprintSchema.safeParse()` below remains the source of truth for those.
 */
const BLUEPRINT_JSON_SCHEMA = z.toJSONSchema(blueprintSchema, {
  target: "openapi-3.0",
});

/**
 * Gemini-backed `AIProvider` using the current Interactions API
 * (`ai.interactions.create`), not the legacy `models.generateContent` path.
 */
export function createGeminiProvider(config: AIProviderConfig): AIProvider {
  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const model = config.model;

  return {
    async generateBlueprint(input) {
      if (isDevForceFailure("FORCE_GEMINI_FAILURE")) {
        console.log("[gemini] Forced failure for fallback testing");
        throw new AIProviderError(
          "Forced Gemini failure for fallback testing.",
          undefined,
          "unavailable",
          undefined,
          "gemini",
        );
      }

      if (!model) {
        throw new AIProviderError(
          "AI provider is not configured.",
          undefined,
          "config",
          undefined,
          "gemini",
        );
      }

      console.log(`[gemini] model = ${model}`);
      console.log(`[gemini] Attempt 1: ${model}`);

      try {
        return await requestBlueprintFromGemini({
          client,
          model,
          userPrompt: buildBlueprintUserPrompt(input.idea),
        });
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        throw new AIProviderError(
          "Failed to reach the AI provider.",
          error,
          "unknown",
          undefined,
          "gemini",
        );
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
    const interaction = await client.interactions.create(
      {
        model,
        input: userPrompt,
        system_instruction: BLUEPRINT_SYSTEM_PROMPT,
        store: false,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: BLUEPRINT_JSON_SCHEMA,
        },
        generation_config: {
          max_output_tokens: MAX_OUTPUT_TOKENS,
          thinking_level: "minimal",
          thinking_summaries: "none",
        },
      },
      {
        timeout_ms: GEMINI_TIMEOUT_MS,
        retries: { strategy: "none" },
      },
    );

    content = interaction.output_text?.trim();
  } catch (error) {
    const { kind, statusCode } = classifyGeminiError(error);
    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      kind,
      statusCode,
      "gemini",
    );
  }

  if (!content) {
    throw new AIProviderError(
      "AI provider returned no content.",
      undefined,
      "empty_response",
      undefined,
      "gemini",
    );
  }

  const parsed = parseJsonFromModelContent(content);

  console.log(
    "[blueprint] Raw AI response:",
    JSON.stringify(parsed, null, 2),
  );

  const validated = blueprintSchema.safeParse(parsed);

  if (!validated.success) {
    console.error(
      "[blueprint] blueprintSchema validation failed (formatted):\n",
      JSON.stringify(validated.error.format(), null, 2),
    );

    console.error(
      "[blueprint] blueprintSchema validation issues:\n",
      JSON.stringify(validated.error.issues, null, 2),
    );

    console.error(
      "[blueprint] Parsed blueprint received from Gemini:\n",
      JSON.stringify(parsed, null, 2),
    );

    throw new AIProviderError(
      "AI provider returned an invalid blueprint shape.",
      undefined,
      "invalid_shape",
      undefined,
      "gemini",
    );
  }

  return validated.data;
}

/**
 * Classifies a raw Gemini SDK error into a fallback-decision-ready category.
 * Reads the actual HTTP status (`statusCode`/`status`) rather than relying
 * solely on message-text pattern matching, since the Interactions API's
 * error objects expose the real status code directly (confirmed via a live
 * 429 response: `{ statusCode: 429, error: { code: "too_many_requests" } }`).
 */
function classifyGeminiError(error: unknown): {
  kind: AIProviderErrorKind;
  statusCode?: number;
} {
  const statusCode = extractStatusCode(error);
  const text = toFailureReason(error).toLowerCase();

  if (statusCode === 429 || /too_many_requests|quota exceeded/.test(text)) {
    return { kind: "rate_limited", statusCode: statusCode ?? 429 };
  }

  if (
    statusCode === 404 ||
    /not_found/.test(text) ||
    /no longer available/.test(text) ||
    /model.*unavailable/.test(text) ||
    /deprecated/.test(text) ||
    /interactions api/.test(text)
  ) {
    return { kind: "unavailable", statusCode: statusCode ?? 404 };
  }

  if (isTimeoutError(error)) {
    return { kind: "timeout", statusCode };
  }

  if (statusCode !== undefined && statusCode >= 500 && statusCode < 600) {
    return { kind: "server_error", statusCode };
  }

  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return { kind: "bad_request", statusCode };
  }

  if (isNetworkError(error)) {
    return { kind: "network", statusCode };
  }

  return { kind: "unknown", statusCode };
}

function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const record = error as { statusCode?: unknown; status?: unknown };
  const raw = record.statusCode ?? record.status;

  return typeof raw === "number" ? raw : undefined;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timeout|aborted/i.test(error.message)
  );
}

function isNetworkError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const record = error as { code?: unknown; cause?: { code?: unknown } };
  const code = String(record.code ?? record.cause?.code ?? "");

  return ["ECONNREFUSED", "ENOTFOUND", "ECONNRESET", "EAI_AGAIN", "ETIMEDOUT"].includes(
    code,
  );
}

function toFailureReason(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const record = error as {
      status?: unknown;
      statusCode?: unknown;
      code?: unknown;
      message?: unknown;
      statusText?: unknown;
      error?: { message?: unknown; code?: unknown };
    };
    const parts = [
      record.status,
      record.statusCode,
      record.code,
      record.statusText,
      record.message,
      record.error?.message,
      record.error?.code,
    ]
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
