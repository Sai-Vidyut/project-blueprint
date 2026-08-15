import { AIProviderError, type AIProviderConfig } from "@/lib/ai/types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

/** Read server-only AI env vars. Throws `AIProviderError` when misconfigured. */
export function getAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new AIProviderError("AI provider is not configured.");
  }

  if (!model) {
    throw new AIProviderError("AI model is not configured.");
  }

  return { apiKey, model, baseUrl };
}
