import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientInputError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientRoutingError,
} from "@huggingface/inference";

import { BLUEPRINT_JSON_SCHEMA } from "@/lib/ai/blueprint-json-schema";
import { isDevForceFailure } from "@/lib/ai/dev-force-failure";
import { classifyHttpStatus, isAbortTimeoutError } from "@/lib/ai/http-error";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_TOKENS = 4_096;

/**
 * Hugging Face Inference Providers `AIProvider` using the official
 * `@huggingface/inference` client. Default model is `Qwen/Qwen3-32B`
 * (current HF chat-completion / structured-output example), overridable
 * via `HF_MODEL`. Routing uses `provider: "auto"`.
 */
export function createHuggingFaceProvider(config: AIProviderConfig): AIProvider {
  const model = config.model?.trim();
  const client = new InferenceClient(config.apiKey);

  return {
    async generateBlueprint(input) {
      if (isDevForceFailure("FORCE_HF_FAILURE")) {
        console.log("[huggingface] Forced failure for fallback testing");
        throw new AIProviderError(
          "Forced Hugging Face failure for fallback testing.",
          undefined,
          "unavailable",
          undefined,
          "huggingface",
        );
      }

      if (!model) {
        throw new AIProviderError(
          "Hugging Face is not configured.",
          undefined,
          "config",
          undefined,
          "huggingface",
        );
      }

      console.log(`[huggingface] Attempt: ${model}`);

      let content: string | undefined;

      try {
        const completion = await client.chatCompletion(
          {
            model,
            provider: "auto",
            messages: [
              { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
              { role: "user", content: buildBlueprintUserPrompt(input.idea) },
            ],
            max_tokens: MAX_TOKENS,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "blueprint",
                strict: true,
                schema: BLUEPRINT_JSON_SCHEMA as { [key: string]: unknown },
              },
            },
          },
          {
            retry_on_error: false,
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );

        const message = completion.choices[0]?.message?.content;
        content = typeof message === "string" ? message.trim() : undefined;
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        throw classifyHuggingFaceError(error);
      }

      if (!content) {
        throw new AIProviderError(
          "AI provider returned no content.",
          undefined,
          "empty_response",
          undefined,
          "huggingface",
        );
      }

      const parsed = parseJsonFromModelContent(content);
      const validated = blueprintSchema.safeParse(parsed);

      if (!validated.success) {
        console.error(
          "[huggingface] blueprintSchema validation failed:",
          JSON.stringify(validated.error.issues, null, 2),
        );
        throw new AIProviderError(
          "AI provider returned an invalid blueprint shape.",
          undefined,
          "invalid_shape",
          undefined,
          "huggingface",
        );
      }

      console.log(`[huggingface] Success: ${model}`);
      return validated.data;
    },
  };
}

function classifyHuggingFaceError(error: unknown): AIProviderError {
  if (isAbortTimeoutError(error)) {
    return new AIProviderError(
      "Blueprint generation timed out.",
      error,
      "timeout",
      undefined,
      "huggingface",
    );
  }

  if (error instanceof InferenceClientRoutingError) {
    return new AIProviderError(
      error.message || "Hugging Face model is unavailable.",
      error,
      "unavailable",
      undefined,
      "huggingface",
    );
  }

  if (error instanceof InferenceClientInputError) {
    return new AIProviderError(
      error.message || "Invalid Hugging Face request.",
      error,
      "bad_request",
      undefined,
      "huggingface",
    );
  }

  if (error instanceof InferenceClientProviderOutputError) {
    return new AIProviderError(
      error.message || "AI provider returned no content.",
      error,
      "empty_response",
      undefined,
      "huggingface",
    );
  }

  if (
    error instanceof InferenceClientProviderApiError ||
    error instanceof InferenceClientHubApiError
  ) {
    const status = error.httpResponse.status;
    const kind = status === 401 || status === 403 ? "config" : classifyHttpStatus(status);

    return new AIProviderError(
      status === 401 || status === 403
        ? "Hugging Face is not configured."
        : error.message || "Failed to reach the AI provider.",
      error,
      kind,
      status,
      "huggingface",
    );
  }

  return new AIProviderError(
    "Failed to reach the AI provider.",
    error,
    "unknown",
    undefined,
    "huggingface",
  );
}
