import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_TOKENS = 1_200;
const IS_DEV = process.env.NODE_ENV === "development";

function logTiming(label: string, startedAt: number) {
  if (!IS_DEV) {
    return;
  }

  console.log(`[blueprint] ${label}: ${Math.round(performance.now() - startedAt)}ms`);
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Factory for the AI provider used by `POST /api/blueprint`.
 *
 * Uses an OpenAI-compatible chat completions API (OpenRouter by default).
 * Swapping providers means replacing this function's body — call sites depend
 * only on `AIProvider`.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  return {
    async generateBlueprint(input) {
      const requestStarted = performance.now();

      try {
        const url = `${config.baseUrl?.replace(/\/$/, "") ?? "https://openrouter.ai/api/v1"}/chat/completions`;
        const userPrompt = buildBlueprintUserPrompt(input.idea);

        console.log("[blueprint] model:", config.model, "timeoutMs:", REQUEST_TIMEOUT_MS);

        let response: Response;
        const openRouterStarted = performance.now();

        try {
          response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: config.model,
              max_tokens: MAX_TOKENS,
              messages: [
                { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
        } catch (error) {
          logTiming("OpenRouter", openRouterStarted);

          if (error instanceof Error && error.name === "TimeoutError") {
            console.error("[blueprint] timed out", {
              model: config.model,
              timeoutMs: REQUEST_TIMEOUT_MS,
            });
            throw new AIProviderError("Blueprint generation timed out.", error);
          }

          throw new AIProviderError("Failed to reach the AI provider.", error);
        }

        const rawBody = await response.text();
        logTiming("OpenRouter", openRouterStarted);
        console.log("[blueprint] status:", response.status, "bytes:", rawBody.length);

        let payload: ChatCompletionResponse;

        try {
          payload = JSON.parse(rawBody) as ChatCompletionResponse;
        } catch (error) {
          throw new AIProviderError("AI provider returned an unreadable response.", error);
        }

        if (!response.ok) {
          throw new AIProviderError(
            `AI provider rejected the request (${response.status} ${response.statusText}): ${rawBody}`,
          );
        }

        if (payload.error) {
          throw new AIProviderError(
            `OpenRouter error: ${payload.error.message ?? "Unknown error"}`,
          );
        }

        const content = payload.choices?.[0]?.message?.content;

        if (!content) {
          throw new AIProviderError("AI provider returned no content.");
        }

        const parseStarted = performance.now();
        const parsed = parseJsonFromModelContent(content);
        logTiming("Parse JSON", parseStarted);

        const validationStarted = performance.now();
        const validated = blueprintSchema.safeParse(parsed);
        logTiming("Zod validation", validationStarted);

        if (!validated.success) {
          console.error(
            "[blueprint] blueprintSchema validation failed:",
            validated.error.issues,
          );
          throw new AIProviderError("AI provider returned an invalid blueprint shape.");
        }

        return validated.data;
      } finally {
        logTiming("Total request", requestStarted);
      }
    },
  };
}
