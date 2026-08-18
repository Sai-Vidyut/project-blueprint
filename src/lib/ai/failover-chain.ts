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
import type { AIProvider, AIProviderConfig, AIProviderKind } from "@/lib/ai/types";

export type FailoverChainStep = {
  kind: AIProviderKind;
  label: string;
  provider: AIProvider;
  config: AIProviderConfig;
};

const cerebrasFallbackConfig = getCerebrasFallbackConfig();
const groqFallbackConfig = getGroqFallbackConfig();
const huggingFaceFallbackConfig = getHuggingFaceFallbackConfig();
const openRouterFallbackConfig = getOpenRouterFallbackConfig();

/**
 * Ordered failover chain. Unconfigured optional providers are omitted.
 * Gemini → Cerebras → Groq → Hugging Face → OpenRouter
 */
export function buildFailoverChain(
  primary: AIProviderConfig,
): FailoverChainStep[] {
  const steps: FailoverChainStep[] = [];

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
        config: cerebrasFallbackConfig,
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
        config: groqFallbackConfig,
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
        config: huggingFaceFallbackConfig,
      });
    }

    if (openRouterFallbackConfig && primary.kind !== "openrouter") {
      steps.push({
        kind: "openrouter",
        label: "OpenRouter",
        provider: createOpenRouterProvider(openRouterFallbackConfig),
        config: openRouterFallbackConfig,
      });
    }
  };

  if (primary.kind === "openrouter") {
    return [
      {
        kind: "openrouter",
        label: "OpenRouter",
        provider: createOpenRouterProvider(primary),
        config: primary,
      },
    ];
  }

  if (primary.kind === "huggingface") {
    steps.push({
      kind: "huggingface",
      label: "Hugging Face",
      provider: createHuggingFaceProvider(primary),
      config: primary,
    });
    appendRemainingFallbacks("huggingface");
    return steps;
  }

  if (primary.kind === "groq") {
    steps.push({
      kind: "groq",
      label: "Groq",
      provider: createGroqProvider(primary),
      config: primary,
    });
    appendRemainingFallbacks("groq");
    return steps;
  }

  if (primary.kind === "cerebras") {
    steps.push({
      kind: "cerebras",
      label: "Cerebras",
      provider: createCerebrasProvider(primary),
      config: primary,
    });
    appendRemainingFallbacks("cerebras");
    return steps;
  }

  steps.push({
    kind: "gemini",
    label: "Gemini",
    provider: createGeminiProvider(primary),
    config: primary,
  });
  appendRemainingFallbacks("gemini");
  return steps;
}
