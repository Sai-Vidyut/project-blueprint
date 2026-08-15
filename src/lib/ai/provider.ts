import type { AIProvider, AIProviderConfig, GenerateBlueprintInput } from "@/lib/ai/types";
import type { Blueprint } from "@/types/blueprint";

/**
 * Factory for the AI provider used by `POST /api/blueprint`.
 *
 * This is an interface/contract only — there is no vendor integration yet
 * (see `docs/ROADMAP.md`). The real implementation should:
 *
 * 1. Send `input.idea` plus the system prompt (`src/prompts/`) to the model.
 * 2. Parse the response and validate it with `blueprintSchema`
 *    (`src/lib/schemas/blueprint.ts`) before returning it.
 * 3. Throw `AIProviderError` on any failure, never leak raw provider errors.
 *
 * Swapping providers (OpenRouter, OpenAI, Azure OpenAI, ...) means replacing
 * this function's body — call sites depend only on `AIProvider`.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  return {
    async generateBlueprint(input: GenerateBlueprintInput): Promise<Blueprint> {
      void config;
      void input;
      throw new Error(
        "AI provider not implemented yet. See src/lib/ai/README.md and docs/ROADMAP.md.",
      );
    },
  };
}
