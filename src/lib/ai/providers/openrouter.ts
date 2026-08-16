import { z } from "zod";

import { isDevForceFailure } from "@/lib/ai/dev-force-failure";
import { resolveOpenRouterAttempts } from "@/lib/ai/openrouter-catalog";
import {
  isKnownGoodModel,
  isTransientOpenRouterFailure,
  MAX_OPENROUTER_ATTEMPTS,
  recordOpenRouterSuccess,
  recordOpenRouterTransientFailure,
} from "@/lib/ai/openrouter-health";
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

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_TOKENS = 3_000;

const BLUEPRINT_JSON_SCHEMA = z.toJSONSchema(blueprintSchema, {
  target: "openapi-3.0",
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
    code?: number | string;
  };
}

/**
 * OpenRouter-backed `AIProvider`. Used either as the explicit provider
 * (`AI_PROVIDER=openrouter`) or as the automatic fallback target when
 * Gemini fails transiently (see `provider.ts`).
 *
 * Tries at most three models per request: optional `OPENROUTER_MODEL` first,
 * then dynamically discovered zero-cost catalog models. Paid models are
 * never selected unless the user set `OPENROUTER_MODEL` explicitly.
 */
export function createOpenRouterProvider(config: AIProviderConfig): AIProvider {
  const baseUrl =
    config.baseUrl?.replace(/\/$/, "") ?? "https://openrouter.ai/api/v1";
  const completionsUrl = `${baseUrl}/chat/completions`;

  return {
    async generateBlueprint(input) {
      if (isDevForceFailure("FORCE_OPENROUTER_FAILURE")) {
        console.log("[openrouter] Forced failure for fallback testing");
        throw new AIProviderError(
          "Forced OpenRouter failure for fallback testing.",
          undefined,
          "unavailable",
          undefined,
          "openrouter",
        );
      }

      const userPrompt = buildBlueprintUserPrompt(input.idea);
      const attempts = (
        await resolveOpenRouterAttempts({
          apiKey: config.apiKey,
          baseUrl,
          preferredModel: config.model,
        })
      ).slice(0, MAX_OPENROUTER_ATTEMPTS);

      let lastError: unknown;

      for (const [index, attempt] of attempts.entries()) {
        const attemptNumber = index + 1;
        if (isKnownGoodModel(attempt.id)) {
          console.log(`[openrouter] Trying known-good model: ${attempt.id}`);
        }
        console.log(`[openrouter] Attempt ${attemptNumber}: ${attempt.id}`);

        try {
          const blueprint = await requestBlueprintFromOpenRouter({
            completionsUrl,
            apiKey: config.apiKey,
            model: attempt.id,
            supportsJsonSchema: attempt.supportsJsonSchema,
            supportsReasoning: attempt.supportsReasoning,
            maxCompletionTokens: attempt.maxCompletionTokens,
            userPrompt,
          });

          recordOpenRouterSuccess(attempt.id);
          console.log(`[openrouter] OpenRouter success: ${attempt.id}`);
          return blueprint;
        } catch (error) {
          const classified = classifyOpenRouterAttemptError(error);
          console.error(
            `[openrouter] Attempt ${attemptNumber} failed: ${classified.message}`,
          );
          lastError = classified;

          if (isTransientOpenRouterFailure(classified)) {
            recordOpenRouterTransientFailure(attempt.id);
            continue;
          }

          throw classified;
        }
      }

      if (lastError instanceof AIProviderError) {
        throw lastError;
      }

      throw new AIProviderError(
        "OpenRouter failed to generate a blueprint.",
        lastError,
        "unknown",
        undefined,
        "openrouter",
      );
    },
  };
}

async function requestBlueprintFromOpenRouter(args: {
  completionsUrl: string;
  apiKey: string;
  model: string;
  supportsJsonSchema: boolean;
  supportsReasoning: boolean;
  maxCompletionTokens?: number;
  userPrompt: string;
}): Promise<Blueprint> {
  const maxTokens = Math.min(
    MAX_TOKENS,
    args.maxCompletionTokens ?? MAX_TOKENS,
  );

  const body: Record<string, unknown> = {
    model: args.model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
      { role: "user", content: args.userPrompt },
    ],
  };

  if (args.supportsReasoning) {
    body.reasoning = { exclude: true };
  }

  if (args.supportsJsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "blueprint",
        strict: true,
        schema: BLUEPRINT_JSON_SCHEMA,
      },
    };
  }

  let response: Response;
  let rawBody: string;
  const startedAt = Date.now();

  try {
    // Timeout must cover headers AND body. AbortSignal.timeout can fire
    // after fetch() resolves (headers received) while response.text() is
    // still reading — that abort previously escaped this catch and skipped
    // the kind:"timeout" conversion, so Attempt 2/3 never ran.
    response = await fetch(args.completionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    rawBody = await response.text();
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;

    if (isTimeoutError(error)) {
      console.error(
        `[openrouter] ${args.model} timed out after ${elapsedMs}ms (limit ${REQUEST_TIMEOUT_MS}ms)`,
      );
      throw new AIProviderError(
        "Blueprint generation timed out.",
        error,
        "timeout",
        undefined,
        "openrouter",
      );
    }

    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "network",
      undefined,
      "openrouter",
    );
  }

  let payload: ChatCompletionResponse;

  try {
    payload = JSON.parse(rawBody) as ChatCompletionResponse;
  } catch (error) {
    throw new AIProviderError(
      "AI provider returned an unreadable response.",
      error,
      "invalid_json",
      response.status,
      "openrouter",
    );
  }

  if (response.status === 402) {
    throw new AIProviderError(
      "OpenRouter requires credits for the configured fallback model.",
      payload.error,
      "payment_required",
      402,
      "openrouter",
    );
  }

  if (!response.ok) {
    throw new AIProviderError(
      `AI provider rejected the request (${response.status} ${response.statusText})`,
      payload.error,
      classifyHttpStatus(response.status),
      response.status,
      "openrouter",
    );
  }

  if (payload.error) {
    throw new AIProviderError(
      `OpenRouter error: ${payload.error.message ?? "Unknown error"}`,
      payload.error,
      "bad_request",
      response.status,
      "openrouter",
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new AIProviderError(
      "AI provider returned no content.",
      undefined,
      "empty_response",
      undefined,
      "openrouter",
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
      "[blueprint] blueprintSchema validation failed:",
      JSON.stringify(validated.error.issues, null, 2),
    );
    throw new AIProviderError(
      "AI provider returned an invalid blueprint shape.",
      undefined,
      "invalid_shape",
      undefined,
      "openrouter",
    );
  }

  return validated.data;
}

function classifyOpenRouterAttemptError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) {
    if (
      error.kind === "invalid_json" ||
      error.kind === "invalid_shape" ||
      error.kind === "empty_response" ||
      error.kind === "bad_request" ||
      error.kind === "payment_required" ||
      error.kind === "config"
    ) {
      return error;
    }

    if (error.kind === "timeout") {
      return error;
    }

    if (isTimeoutError(error.cause) || isTimeoutError(error)) {
      return new AIProviderError(
        "Blueprint generation timed out.",
        error,
        "timeout",
        error.statusCode,
        "openrouter",
      );
    }

    return error;
  }

  if (isTimeoutError(error)) {
    return new AIProviderError(
      "Blueprint generation timed out.",
      error,
      "timeout",
      undefined,
      "openrouter",
    );
  }

  return new AIProviderError(
    error instanceof Error
      ? error.message
      : "OpenRouter failed to generate a blueprint.",
    error,
    "unknown",
    undefined,
    "openrouter",
  );
}

function classifyHttpStatus(status: number): AIProviderErrorKind {
  if (status === 402) {
    return "payment_required";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status === 404) {
    return "unavailable";
  }

  if (status === 408) {
    return "timeout";
  }

  if (status >= 500 && status < 600) {
    return "server_error";
  }

  return "bad_request";
}

function isTimeoutError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout|timed out|aborted/i.test(error.message)
    );
  }

  if (error instanceof Error) {
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout|timed out|aborted/i.test(error.message)
    ) {
      return true;
    }

    if (error.cause !== undefined && error.cause !== error) {
      return isTimeoutError(error.cause);
    }

    return false;
  }

  if (typeof error === "object") {
    const record = error as {
      name?: unknown;
      message?: unknown;
      code?: unknown;
      cause?: unknown;
    };
    const name = String(record.name ?? "");
    const message = String(record.message ?? "");
    const code = String(record.code ?? "");

    if (name === "TimeoutError" || name === "AbortError") {
      return true;
    }

    if (code === "ABORT_ERR" || code === "TIMEOUT" || code === "ETIMEDOUT") {
      return true;
    }

    if (/timeout|timed out|aborted/i.test(message)) {
      return true;
    }

    if (record.cause !== undefined && record.cause !== error) {
      return isTimeoutError(record.cause);
    }
  }

  return /timeout|timed out|aborted/i.test(String(error));
}
