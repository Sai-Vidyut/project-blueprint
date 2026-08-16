import Cerebras from "@cerebras/cerebras_cloud_sdk";

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
const MAX_COMPLETION_TOKENS = 4_096;

/**
 * Cerebras-backed `AIProvider` using the official Node SDK
 * (`@cerebras/cerebras_cloud_sdk`) Chat Completions API with JSON-schema
 * structured output. Default model is the current Cerebras quickstart /
 * structured-output model `gpt-oss-120b`, overridable via `CEREBRAS_MODEL`.
 */
export function createCerebrasProvider(config: AIProviderConfig): AIProvider {
  const model = config.model?.trim();
  const client = new Cerebras({
    apiKey: config.apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
    warmTCPConnection: false,
  });

  return {
    async generateBlueprint(input) {
      if (isDevForceFailure("FORCE_CEREBRAS_FAILURE")) {
        console.log("[cerebras] Forced failure for fallback testing");
        throw new AIProviderError(
          "Forced Cerebras failure for fallback testing.",
          undefined,
          "unavailable",
          undefined,
          "cerebras",
        );
      }

      if (!model) {
        throw new AIProviderError(
          "Cerebras is not configured.",
          undefined,
          "config",
          undefined,
          "cerebras",
        );
      }

      console.log(`[cerebras] Attempt: ${model}`);

      let content: string | undefined;

      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
            { role: "user", content: buildBlueprintUserPrompt(input.idea) },
          ],
          max_completion_tokens: MAX_COMPLETION_TOKENS,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "blueprint",
              strict: true,
              schema: BLUEPRINT_JSON_SCHEMA as { [key: string]: unknown },
            },
          },
        });

        if ("error" in completion) {
          throw new AIProviderError(
            completion.error.message || "Failed to reach the AI provider.",
            undefined,
            classifyHttpStatus(completion.status_code),
            completion.status_code,
            "cerebras",
          );
        }

        if (!("object" in completion) || completion.object !== "chat.completion") {
          throw new AIProviderError(
            "AI provider returned no content.",
            undefined,
            "empty_response",
            undefined,
            "cerebras",
          );
        }

        const message = completion.choices[0]?.message?.content;
        content = typeof message === "string" ? message.trim() : undefined;
      } catch (error) {
        if (error instanceof AIProviderError) {
          throw error;
        }

        throw classifyCerebrasError(error);
      }

      if (!content) {
        throw new AIProviderError(
          "AI provider returned no content.",
          undefined,
          "empty_response",
          undefined,
          "cerebras",
        );
      }

      const parsed = parseJsonFromModelContent(content);
      const validated = blueprintSchema.safeParse(parsed);

      if (!validated.success) {
        console.error(
          "[cerebras] blueprintSchema validation failed:",
          JSON.stringify(validated.error.issues, null, 2),
        );
        throw new AIProviderError(
          "AI provider returned an invalid blueprint shape.",
          undefined,
          "invalid_shape",
          undefined,
          "cerebras",
        );
      }

      console.log(`[cerebras] Success: ${model}`);
      return validated.data;
    },
  };
}

function classifyCerebrasError(error: unknown): AIProviderError {
  if (
    error instanceof Cerebras.APIConnectionTimeoutError ||
    error instanceof Cerebras.APIUserAbortError ||
    isAbortTimeoutError(error)
  ) {
    return new AIProviderError(
      "Blueprint generation timed out.",
      error,
      "timeout",
      undefined,
      "cerebras",
    );
  }

  if (
    error instanceof Cerebras.AuthenticationError ||
    error instanceof Cerebras.PermissionDeniedError
  ) {
    return new AIProviderError(
      "Cerebras is not configured.",
      error,
      "config",
      error.status,
      "cerebras",
    );
  }

  if (error instanceof Cerebras.APIError) {
    const status = error.status;
    const kind =
      status === undefined
        ? error instanceof Cerebras.APIConnectionError
          ? "network"
          : "unknown"
        : classifyHttpStatus(status);

    return new AIProviderError(
      error.message || "Failed to reach the AI provider.",
      error,
      kind,
      typeof status === "number" ? status : undefined,
      "cerebras",
    );
  }

  if (error instanceof Cerebras.APIConnectionError) {
    return new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "network",
      undefined,
      "cerebras",
    );
  }

  return new AIProviderError(
    "Failed to reach the AI provider.",
    error,
    "unknown",
    undefined,
    "cerebras",
  );
}
