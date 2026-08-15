import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 600_000;

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
      const userPrompt = buildBlueprintUserPrompt(input.idea);
      const promptLength = BLUEPRINT_SYSTEM_PROMPT.length + userPrompt.length;

      console.log("[blueprint] OpenRouter model:", config.model);
      console.log("[blueprint] OpenRouter URL:", url);
      console.log("[blueprint] Prompt length:", promptLength);

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
              { role: "user", content: userPrompt },
            ],
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "TimeoutError") {
          console.error("[blueprint] Request timed out:", {
            model: config.model,
            timeoutMs: REQUEST_TIMEOUT_MS,
            promptLength,
          });
          throw new AIProviderError("Blueprint generation timed out.", error);
        }

        throw new AIProviderError("Failed to reach the AI provider.", error);
      }

      console.log("[blueprint] OpenRouter response status:", response.status);
      console.log("[blueprint] OpenRouter response statusText:", response.statusText);

      const rawBody = await response.text();
      console.log("[blueprint] OpenRouter raw response body:", rawBody);

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

      const parsed = parseJsonFromModelContent(content);
      console.log(
        "[blueprint] Parsed model output:",
        JSON.stringify(parsed, null, 2),
      );

      const validated = blueprintSchema.safeParse(parsed);

      if (!validated.success) {
        console.error(
          "[blueprint] blueprintSchema validation failed:",
          validated.error.issues,
        );
        throw new AIProviderError("AI provider returned an invalid blueprint shape.");
      }

      return validated.data;
    },
  };
}
