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
          if (error instanceof AIProviderError) {
            console.error(`[bluebot] ${step.label} failed`, {
              provider: step.kind,
              model: step.config.model,
              kind: error.kind,
              status: error.statusCode,
              message: reason,
              stage:
                error.kind === "invalid_json"
                  ? "json_extraction"
                  : error.kind === "invalid_shape"
                    ? "response_validation"
                    : error.kind === "incomplete_modification"
                      ? "incomplete_modification"
                      : "provider_request",
            });
          } else {
            console.error(`[bluebot] ${step.label} failed: ${reason}`);
          }
          lastError = error;

          const hasNextProvider = index < steps.length - 1;

          if (
            shouldContinueToNextProvider(error, hasNextProvider) ||
            shouldBluebotContinueToNextProvider(error, hasNextProvider)
          ) {
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

/** Retry when a provider returns a modification without the required blueprint body. */
function shouldBluebotContinueToNextProvider(
  error: unknown,
  hasNextProvider: boolean,
): boolean {
  if (!hasNextProvider) {
    return false;
  }

  return (
    error instanceof AIProviderError &&
    error.kind === "incomplete_modification"
  );
}
