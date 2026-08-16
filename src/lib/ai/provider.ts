import { getCachedBlueprint, setCachedBlueprint } from "@/lib/ai/blueprint-cache";
import {
  getCerebrasFallbackConfig,
  getGroqFallbackConfig,
  getHuggingFaceFallbackConfig,
  getOpenRouterFallbackConfig,
} from "@/lib/ai/config";
import { createCerebrasProvider } from "@/lib/ai/providers/cerebras";
import { createGeminiProvider } from "@/lib/ai/providers/gemini";
import { createGroqProvider } from "@/lib/ai/providers/groq";
import { createHuggingFaceProvider } from "@/lib/ai/providers/huggingface";
import { createOpenRouterProvider } from "@/lib/ai/providers/openrouter";
import {
  AIProviderError,
  isOptionalProviderAccessFailure,
  isProviderAvailabilityFailure,
  shouldContinueToNextProvider,
  type AIProvider,
  type AIProviderConfig,
  type AIProviderKind,
  type GenerateBlueprintInput,
} from "@/lib/ai/types";
import type { Blueprint } from "@/types/blueprint";

type ChainStep = {
  kind: AIProviderKind;
  label: string;
  provider: AIProvider;
};

const cerebrasFallbackConfig = getCerebrasFallbackConfig();
const groqFallbackConfig = getGroqFallbackConfig();
const huggingFaceFallbackConfig = getHuggingFaceFallbackConfig();
const openRouterFallbackConfig = getOpenRouterFallbackConfig();

if (process.env.GEMINI_API_KEY?.trim()) {
  console.log("[provider] Gemini enabled");
} else {
  console.log("[provider] Gemini disabled — GEMINI_API_KEY not set");
}

if (cerebrasFallbackConfig) {
  console.log(
    `[provider] Cerebras fallback enabled (model = ${cerebrasFallbackConfig.model})`,
  );
} else {
  console.log(
    "[provider] Cerebras fallback disabled — CEREBRAS_API_KEY not set",
  );
}

if (groqFallbackConfig) {
  console.log(
    `[provider] Groq fallback enabled (model = ${groqFallbackConfig.model})`,
  );
} else {
  console.log("[provider] Groq fallback disabled — GROQ_API_KEY not set");
}

if (huggingFaceFallbackConfig) {
  console.log(
    `[provider] Hugging Face fallback enabled (model = ${huggingFaceFallbackConfig.model})`,
  );
} else {
  console.log(
    "[provider] Hugging Face fallback disabled — HF_TOKEN not set",
  );
}

if (openRouterFallbackConfig) {
  console.log(
    openRouterFallbackConfig.model
      ? `[provider] OpenRouter fallback enabled (preferred model = ${openRouterFallbackConfig.model}, then free catalog)`
      : "[provider] OpenRouter fallback enabled (dynamic free catalog)",
  );
} else {
  console.log(
    "[provider] OpenRouter fallback disabled — OPENROUTER_API_KEY not set",
  );
}

/**
 * Ordered failover chain. Unconfigured optional providers are omitted so
 * Gemini-only setups keep working. Later providers are never called after
 * an earlier success. Transient infra failures and payment/account-access
 * failures skip to the next configured provider. Invalid JSON, invalid Zod
 * shape, and bad requests stop the chain.
 *
 * Gemini → Cerebras → Groq → Hugging Face → OpenRouter
 */
function buildFailoverChain(primary: AIProviderConfig): ChainStep[] {
  const steps: ChainStep[] = [];

  const appendRemainingFallbacks = (
    after: "gemini" | "cerebras" | "groq" | "huggingface",
  ) => {
    if (
      after === "gemini" &&
      cerebrasFallbackConfig &&
      primary.kind !== "cerebras"
    ) {
      steps.push({
        kind: "cerebras",
        label: "Cerebras",
        provider: createCerebrasProvider(cerebrasFallbackConfig),
      });
    }

    if (
      (after === "gemini" || after === "cerebras") &&
      groqFallbackConfig &&
      primary.kind !== "groq"
    ) {
      steps.push({
        kind: "groq",
        label: "Groq",
        provider: createGroqProvider(groqFallbackConfig),
      });
    }

    if (
      (after === "gemini" || after === "cerebras" || after === "groq") &&
      huggingFaceFallbackConfig &&
      primary.kind !== "huggingface"
    ) {
      steps.push({
        kind: "huggingface",
        label: "Hugging Face",
        provider: createHuggingFaceProvider(huggingFaceFallbackConfig),
      });
    }

    if (openRouterFallbackConfig && primary.kind !== "openrouter") {
      steps.push({
        kind: "openrouter",
        label: "OpenRouter",
        provider: createOpenRouterProvider(openRouterFallbackConfig),
      });
    }
  };

  if (primary.kind === "openrouter") {
    return [
      {
        kind: "openrouter",
        label: "OpenRouter",
        provider: createOpenRouterProvider(primary),
      },
    ];
  }

  if (primary.kind === "huggingface") {
    steps.push({
      kind: "huggingface",
      label: "Hugging Face",
      provider: createHuggingFaceProvider(primary),
    });
    appendRemainingFallbacks("huggingface");
    return steps;
  }

  if (primary.kind === "groq") {
    steps.push({
      kind: "groq",
      label: "Groq",
      provider: createGroqProvider(primary),
    });
    appendRemainingFallbacks("groq");
    return steps;
  }

  if (primary.kind === "cerebras") {
    steps.push({
      kind: "cerebras",
      label: "Cerebras",
      provider: createCerebrasProvider(primary),
    });
    appendRemainingFallbacks("cerebras");
    return steps;
  }

  steps.push({
    kind: "gemini",
    label: "Gemini",
    provider: createGeminiProvider(primary),
  });
  appendRemainingFallbacks("gemini");
  return steps;
}

function createFailoverProvider(primary: AIProviderConfig): AIProvider {
  const steps = buildFailoverChain(primary);

  return {
    async generateBlueprint(input: GenerateBlueprintInput): Promise<Blueprint> {
      let lastError: unknown;
      const attemptedProviders: AIProviderKind[] = [];

      for (const [index, step] of steps.entries()) {
        try {
          if (index > 0) {
            console.log(`[provider] Falling back to ${step.label}`);
          }

          attemptedProviders.push(step.kind);
          return await step.provider.generateBlueprint(input);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          console.error(`[provider] ${step.label} failed: ${reason}`);
          lastError = error;

          const hasNextProvider = index < steps.length - 1;

          if (isOptionalProviderAccessFailure(error)) {
            const providerTag =
              error instanceof AIProviderError && error.provider
                ? error.provider
                : step.kind;
            const status =
              error instanceof AIProviderError ? (error.statusCode ?? 402) : 402;
            console.log(
              `[${providerTag}] Payment/access unavailable (${status})`,
            );
          }

          if (shouldContinueToNextProvider(error, hasNextProvider)) {
            const why = isOptionalProviderAccessFailure(error)
              ? "payment/account access"
              : "transient failure";
            console.log(
              `[provider] ${step.label} skipped (${why}); continuing to next provider`,
            );
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

function createServiceUnavailableError(
  lastError: unknown,
  attemptedProviders: readonly AIProviderKind[],
): AIProviderError {
  const root = lastError instanceof AIProviderError ? lastError : undefined;

  console.error(
    `[provider] All configured AI providers unavailable. Attempted: ${
      attemptedProviders.length > 0 ? attemptedProviders.join(", ") : "(none)"
    }`,
  );

  return new AIProviderError(
    "All configured AI providers failed to generate a blueprint.",
    lastError,
    "service_unavailable",
    root?.statusCode,
    root?.provider,
    attemptedProviders,
  );
}

/**
 * Factory for the AI provider used by `POST /api/blueprint`.
 *
 * Default (`AI_PROVIDER=gemini` or unset): Gemini with Cerebras → Groq →
 * Hugging Face → OpenRouter failover for any step that is configured.
 * Explicit `AI_PROVIDER=openrouter` (or cerebras / groq / huggingface)
 * starts the chain at that provider. Call sites depend only on `AIProvider`.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  const inner = createFailoverProvider(config);

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
