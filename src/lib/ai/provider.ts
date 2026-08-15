import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 28_000;

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
      const url = `${config.baseUrl?.replace(/\/$/, "") ?? "https://openrouter.ai/api/v1"}/chat/completions`;

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
            messages: [
              { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
              { role: "user", content: buildBlueprintUserPrompt(input.idea) },
            ],
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new AIProviderError("Blueprint generation timed out.", error);
        }

        throw new AIProviderError("Failed to reach the AI provider.", error);
      }

      let payload: ChatCompletionResponse;

      try {
        payload = (await response.json()) as ChatCompletionResponse;
      } catch (error) {
        throw new AIProviderError("AI provider returned an unreadable response.", error);
      }

      if (!response.ok) {
        throw new AIProviderError(
          payload.error?.message ?? "AI provider rejected the request.",
        );
      }

      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIProviderError("AI provider returned no content.");
      }

      const parsed = parseJsonFromModelContent(content);
      const validated = blueprintSchema.safeParse(parsed);

      if (!validated.success) {
        throw new AIProviderError("AI provider returned an invalid blueprint shape.");
      }

      return validated.data;
    },
  };
}
