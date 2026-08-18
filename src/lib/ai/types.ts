import type { BluebotMessage, BluebotResponse } from "@/lib/schemas/bluebot";
import type { Blueprint } from "@/types/blueprint";

/**
 * Types for the AI abstraction layer. No vendor SDK types leak past this
 * file — `provider.ts` and any future implementation depend only on these.
 */
export interface GenerateBlueprintInput {
  /** The raw idea text submitted by the user. */
  idea: string;
}

export interface BluebotChatInput {
  blueprint: Blueprint;
  messages: BluebotMessage[];
  userMessage: string;
}

export type AIProviderKind =
  | "gemini"
  | "cerebras"
  | "groq"
  | "huggingface"
  | "openrouter";

export interface AIProviderConfig {
  kind: AIProviderKind;
  apiKey: string;
  /** Override the API base (OpenRouter, a proxy, etc). Unused for Gemini. */
  baseUrl?: string;
  /**
   * Model id. Required for Gemini. Optional for OpenRouter: when omitted,
   * OpenRouter discovers currently available free models from the catalog.
   * When set (`OPENROUTER_MODEL`), that model is tried first.
   */
  model?: string;
}

/**
 * The contract every AI provider implementation must satisfy. Route
 * handlers and components depend on this interface, never on a specific
 * vendor, so swapping providers means writing one new file.
 */
export interface AIProvider {
  generateBlueprint(input: GenerateBlueprintInput): Promise<Blueprint>;
}

/** BlueBot uses the same provider chain but a dedicated chat contract. */
export interface BluebotProvider {
  chat(input: BluebotChatInput): Promise<BluebotResponse>;
}

/**
 * Machine-readable failure category. Used by the failover chain to decide
 * whether a Gemini failure is transient/infra-level (safe to retry against
 * OpenRouter) or a deterministic problem with the response itself (never
 * safe to retry against a different provider, since a different model is
 * not expected to fix a parsing/shape mismatch).
 */
export type AIProviderErrorKind =
  | "rate_limited"
  | "unavailable"
  | "timeout"
  | "network"
  | "server_error"
  | "bad_request"
  | "invalid_json"
  | "invalid_shape"
  | "empty_response"
  | "payment_required"
  | "config"
  | "service_unavailable"
  | "unknown";

/** Machine-readable API code when every usable provider is down. */
export const AI_SERVICE_UNAVAILABLE = "AI_SERVICE_UNAVAILABLE";

const FALLBACK_ELIGIBLE_KINDS: ReadonlySet<AIProviderErrorKind> = new Set([
  "rate_limited",
  "unavailable",
  "timeout",
  "network",
  "server_error",
]);

/** Thrown by provider implementations on request failure or invalid output. */
export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
    readonly kind: AIProviderErrorKind = "unknown",
    readonly statusCode?: number,
    readonly provider?: AIProviderKind,
    readonly attemptedProviders: readonly AIProviderKind[] = [],
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

/**
 * Transient/infra-level failures (429, unavailable, timeout, network,
 * transient 5xx). Safe to retry against a different provider.
 *
 * Not included: invalid JSON, invalid blueprint shape, bad request, auth
 * config, or payment/quota. Payment is handled separately so it is never
 * treated as a model-health signal.
 */
export function isFallbackEligible(error: unknown): boolean {
  return (
    error instanceof AIProviderError && FALLBACK_ELIGIBLE_KINDS.has(error.kind)
  );
}

/**
 * Account billing, quota, or payment restriction (typically HTTP 402).
 * This is a provider-account condition, not a model-quality or model-health
 * failure. Optional providers should be skipped. If every remaining
 * provider is an access failure, the chain reports service unavailable.
 */
export function isOptionalProviderAccessFailure(error: unknown): boolean {
  return (
    error instanceof AIProviderError &&
    (error.kind === "payment_required" || error.statusCode === 402)
  );
}

/**
 * Central chain decision: continue to the next configured provider, or stop.
 *
 * - Transient infra failures → continue when another provider remains
 * - Payment/account access → skip this optional provider when another remains
 * - Invalid JSON / invalid shape / bad request / config → stop
 * - Last provider + availability/access failure → service_unavailable
 * - Last provider + validation/config → surface that error
 */
export function shouldContinueToNextProvider(
  error: unknown,
  hasNextProvider: boolean,
): boolean {
  if (!hasNextProvider) {
    return false;
  }

  return isFallbackEligible(error) || isOptionalProviderAccessFailure(error);
}

/**
 * Failures that mean a provider could not serve the request, so the chain
 * may continue. When every configured provider fails this way, the AI
 * service is unavailable — not an application/validation error.
 */
export function isProviderAvailabilityFailure(error: unknown): boolean {
  return isFallbackEligible(error) || isOptionalProviderAccessFailure(error);
}

export function isAiServiceUnavailable(error: unknown): boolean {
  return (
    error instanceof AIProviderError && error.kind === "service_unavailable"
  );
}
