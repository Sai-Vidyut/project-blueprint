import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 60_000;
const MAX_TOKENS = 3_000;

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
 * OpenRouter-backed `AIProvider`. Kept behind `AI_PROVIDER=openrouter`.
 * Single model call — no fallback chain.
 */
export function createOpenRouterProvider(config: AIProviderConfig): AIProvider {
  const url = `${config.baseUrl?.replace(/\/$/, "") ?? "https://openrouter.ai/api/v1"}/chat/completions`;

  return {
    async generateBlueprint(input) {
      const userPrompt = buildBlueprintUserPrompt(input.idea);
      let response: Response;

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
            reasoning: { exclude: true },
            messages: [
              { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (isTimeoutError(error)) {
          throw new AIProviderError("Blueprint generation timed out.", error);
        }

        throw new AIProviderError("Failed to reach the AI provider.", error);
      }

      const rawBody = await response.text();
      let payload: ChatCompletionResponse;

      try {
        payload = JSON.parse(rawBody) as ChatCompletionResponse;
      } catch (error) {
        throw new AIProviderError(
          "AI provider returned an unreadable response.",
          error,
        );
      }

      if (!response.ok) {
        throw new AIProviderError(
          `AI provider rejected the request (${response.status} ${response.statusText})`,
        );
      }

      if (payload.error) {
        throw new AIProviderError(
          `OpenRouter error: ${payload.error.message ?? "Unknown error"}`,
        );
      }

      const content = payload.choices?.[0]?.message?.content?.trim();

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
        throw new AIProviderError(
          "AI provider returned an invalid blueprint shape.",
        );
      }

      return validated.data;
    },
  };
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
