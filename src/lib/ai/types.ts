import type { Blueprint } from "@/types/blueprint";

/**
 * Types for the AI abstraction layer. No vendor SDK types leak past this
 * file — `provider.ts` and any future implementation depend only on these.
 */
export interface GenerateBlueprintInput {
  /** The raw idea text submitted by the user. */
  idea: string;
}

export type AIProviderKind = "gemini" | "openrouter";

export interface AIProviderConfig {
  kind: AIProviderKind;
  apiKey: string;
  /** Override the API base (OpenRouter, a proxy, etc). Unused for Gemini. */
  baseUrl?: string;
  model: string;
}

/**
 * The contract every AI provider implementation must satisfy. Route
 * handlers and components depend on this interface, never on a specific
 * vendor, so swapping providers means writing one new file.
 */
export interface AIProvider {
  generateBlueprint(input: GenerateBlueprintInput): Promise<Blueprint>;
}

/** Thrown by provider implementations on request failure or invalid output. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
