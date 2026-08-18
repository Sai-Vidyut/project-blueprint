import { chatWithProvider } from "@/lib/ai/bluebot-chat";
import { buildFailoverChain } from "@/lib/ai/failover-chain";
import {
  AIProviderError,
  isProviderAvailabilityFailure,
  shouldContinueToNextProvider,
  type AIProviderConfig,
  type AIProviderKind,
  type BluebotChatInput,
  type BluebotProvider,
} from "@/lib/ai/types";

function createServiceUnavailableError(
  lastError: unknown,
  attemptedProviders: readonly AIProviderKind[],
): AIProviderError {
  const root = lastError instanceof AIProviderError ? lastError : undefined;

  console.error(
    `[bluebot] All configured AI providers unavailable. Attempted: ${
      attemptedProviders.length > 0 ? attemptedProviders.join(", ") : "(none)"
    }`,
  );

  return new AIProviderError(
    "All configured AI providers failed to complete the BlueBot request.",
    lastError,
    "service_unavailable",
    root?.statusCode,
    root?.provider,
    attemptedProviders,
  );
}

/**
 * BlueBot provider factory. Reuses the same failover chain as blueprint
 * generation: Gemini → Cerebras → Groq → Hugging Face → OpenRouter.
 */
export function createBluebotProvider(config: AIProviderConfig): BluebotProvider {
  const steps = buildFailoverChain(config);

  return {
    async chat(input: BluebotChatInput) {
      let lastError: unknown;
      const attemptedProviders: AIProviderKind[] = [];

      for (const [index, step] of steps.entries()) {
        try {
          if (index > 0) {
            console.log(`[bluebot] Falling back to ${step.label}`);
          }

          attemptedProviders.push(step.kind);
          return await chatWithProvider(step.kind, step.config, input);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`[bluebot] ${step.label} failed: ${reason}`);
          lastError = error;

          const hasNextProvider = index < steps.length - 1;

          if (shouldContinueToNextProvider(error, hasNextProvider)) {
            continue;
          }

          if (!hasNextProvider && isProviderAvailabilityFailure(error)) {
            throw createServiceUnavailableError(error, attemptedProviders);
          }

          throw error;
        }
      }

      throw createServiceUnavailableError(lastError, attemptedProviders);
    },
  };
}
