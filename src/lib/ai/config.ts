import { AIProviderError, type AIProviderConfig } from "@/lib/ai/types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemma-4-31b-it:free";

/** Read server-only AI env vars. Throws `AIProviderError` when misconfigured. */
export function getAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
  const baseUrl = process.env.AI_BASE_URL?.trim() || DEFAULT_BASE_URL;

  if (!apiKey) {
    throw new AIProviderError("AI provider is not configured.");
  }

  return { apiKey, model, baseUrl };
}
