import { getCachedBlueprint, setCachedBlueprint } from "@/lib/ai/blueprint-cache";
import { createGeminiProvider } from "@/lib/ai/providers/gemini";
import { createOpenRouterProvider } from "@/lib/ai/providers/openrouter";
import type { AIProvider, AIProviderConfig } from "@/lib/ai/types";

/**
 * Factory for the AI provider used by `POST /api/blueprint`.
 *
 * Default: Gemini (`AI_PROVIDER=gemini`). OpenRouter remains available
 * behind `AI_PROVIDER=openrouter`. Call sites depend only on `AIProvider`.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  const inner =
    config.kind === "openrouter"
      ? createOpenRouterProvider(config)
      : createGeminiProvider(config);

  return {
    async generateBlueprint(input) {
      const cached = getCachedBlueprint(input.idea);

      if (cached) {
        console.log("[blueprint] Cache hit");
        return cached;
      }

      console.log("[blueprint] Cache miss");

      const blueprint = await inner.generateBlueprint(input);
      setCachedBlueprint(input.idea, blueprint);
      return blueprint;
    },
  };
}
