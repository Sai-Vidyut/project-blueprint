import Groq from "groq-sdk";

import { BLUEPRINT_JSON_SCHEMA } from "@/lib/ai/blueprint-json-schema";
import { isDevForceFailure } from "@/lib/ai/dev-force-failure";
import { classifyHttpStatus, isAbortTimeoutError } from "@/lib/ai/http-error";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import { AIProviderError, type AIProvider, type AIProviderConfig } from "@/lib/ai/types";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import {
  BLUEPRINT_SYSTEM_PROMPT,
  buildBlueprintUserPrompt,
} from "@/prompts/blueprint";

const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Groq's 8k TPM budget counts **input tokens + max_completion_tokens**.
 * Observed rejection: input ~2.1k + max_completion 8192 ≈ 10334 requested
 * vs 8000 TPM. 4500 output leaves ~3.5k headroom for prompts + schema
 * (target combined request ~6–7k).
 */
const MAX_COMPLETION_TOKENS = 4_500;

const SCHEMA_SIZE_KEYWORDS = new Set([
  "minLength",
  "maxLength",
  "minItems",
  "maxItems",
  "minimum",
  "maximum",
]);

const GROQ_STRICT_BLUEPRINT_SCHEMA = toGroqStrictJsonSchema(BLUEPRINT_JSON_SCHEMA);

const GROQ_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "blueprint",
    strict: true,
    schema: GROQ_STRICT_BLUEPRINT_SCHEMA,
  },
};

/**
 * Groq-backed `AIProvider`. Default model is `openai/gpt-oss-20b` — Groq's
 * smaller strict JSON-schema model (constrained decoding). `llama-3.1-8b-instant`
 * only supports JSON Object Mode, which does not enforce `string[]` vs object
 * array shapes. `GROQ_MODEL` still overrides the default.
 *
 * Success requires parseJsonFromModelContent + blueprintSchema.safeParse.
 */
export function createGroqProvider(config: AIProviderConfig): AIProvider {
  const model = config.model?.trim();
  const client = new Groq({
    apiKey: config.apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 0,
  });

  return {
    async generateBlueprint(input) {
      if (isDevForceFailure("FORCE_GROQ_FAILURE")) {
        console.log("[groq] Forced failure for fallback testing");
        throw new AIProviderError(
          "Forced Groq failure for fallback testing.",
          undefined,
          "unavailable",
          undefined,
          "groq",
        );
      }

      if (!model) {
        throw new AIProviderError(
          "Groq is not configured.",
          undefined,
          "config",
          undefined,
          "groq",
        );
      }

      console.log(`[groq] Attempt: ${model}`);
      console.log(
        "[groq] response_format = json_schema (name=blueprint, strict=true)",
      );
      logGroqRequestBudget(buildBlueprintUserPrompt(input.idea));

      const content = await requestGroqContent({
        client,
        model,
        userPrompt: buildBlueprintUserPrompt(input.idea),
      });

      const parsed = omitNullProperties(parseJsonFromModelContent(content));
      const validated = blueprintSchema.safeParse(parsed);

      if (!validated.success) {
        console.error(
          "[groq] blueprintSchema validation failed:",
          JSON.stringify(validated.error.issues, null, 2),
        );
        throw new AIProviderError(
          "AI provider returned an invalid blueprint shape.",
          undefined,
          "invalid_shape",
          undefined,
          "groq",
        );
      }

      console.log(`[groq] Success: ${model}`);
      return validated.data;
    },
  };
}

async function requestGroqContent(args: {
  client: Groq;
  model: string;
  userPrompt: string;
}): Promise<string> {
  try {
    const completion = await args.client.chat.completions.create({
      model: args.model,
      messages: [
        { role: "system", content: BLUEPRINT_SYSTEM_PROMPT },
        { role: "user", content: args.userPrompt },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.4,
      // gpt-oss: reasoning tokens share max_completion_tokens. "medium"
      // produced truncated nested objects (json_validate_failed). "low"
      // keeps extra product reasoning without starving the JSON.
      reasoning_effort: "low",
      include_reasoning: false,
      response_format: GROQ_RESPONSE_FORMAT,
    });

    const message = completion.choices[0]?.message?.content;
    const content = typeof message === "string" ? message.trim() : undefined;

    if (!content) {
      throw new AIProviderError(
        "AI provider returned no content.",
        undefined,
        "empty_response",
        undefined,
        "groq",
      );
    }

    return content;
  } catch (error) {
    throw classifyGroqError(error);
  }
}

/**
 * Groq `strict: true` requires every object property in `required` and
 * `additionalProperties: false`. Optional Zod fields are kept and encoded
 * as required + nullable (`type: [T, "null"]`) so the model may emit
 * `constraints` / table `relationships` without violating additionalProperties.
 * Nulls are stripped before Zod, which still uses `.optional()`. Size
 * keywords are stripped; types, enums, and array item shapes remain.
 */
export function toGroqStrictJsonSchema(schema: unknown): { [key: string]: unknown } {
  const cloned = structuredClone(schema) as Record<string, unknown>;
  delete cloned.$schema;
  applyGroqStrictConstraints(cloned);
  stripSchemaSizeKeywords(cloned);
  return cloned;
}

function applyGroqStrictConstraints(node: unknown): void {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    return;
  }

  const obj = node as Record<string, unknown>;

  if (obj.$defs && typeof obj.$defs === "object" && obj.$defs !== null) {
    for (const definition of Object.values(obj.$defs as Record<string, unknown>)) {
      applyGroqStrictConstraints(definition);
    }
  }

  if (obj.properties && typeof obj.properties === "object" && obj.properties !== null) {
    const properties = obj.properties as Record<string, unknown>;
    const originalRequired = new Set(
      Array.isArray(obj.required)
        ? obj.required.filter((key): key is string => typeof key === "string")
        : [],
    );

    for (const [key, property] of Object.entries(properties)) {
      applyGroqStrictConstraints(property);
      if (!originalRequired.has(key)) {
        properties[key] = asGroqNullable(property);
      }
    }

    obj.additionalProperties = false;
    obj.required = Object.keys(properties);
  }

  if ("items" in obj) {
    applyGroqStrictConstraints(obj.items);
  }

  if (Array.isArray(obj.anyOf)) {
    for (const option of obj.anyOf) {
      applyGroqStrictConstraints(option);
    }
  }
}

function asGroqNullable(schema: unknown): unknown {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return { anyOf: [schema, { type: "null" }] };
  }

  const obj = schema as Record<string, unknown>;

  if (typeof obj.type === "string") {
    return { ...obj, type: [obj.type, "null"] };
  }

  if (Array.isArray(obj.type) && !obj.type.includes("null")) {
    return { ...obj, type: [...obj.type, "null"] };
  }

  return { anyOf: [obj, { type: "null" }] };
}

/** Groq strict optional fields arrive as `null`; Zod `.optional()` expects absence. */
export function omitNullProperties(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitNullProperties);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const result: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === null) {
      continue;
    }

    result[key] = omitNullProperties(nested);
  }

  return result;
}

function stripSchemaSizeKeywords(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      stripSchemaSizeKeywords(item);
    }
    return;
  }

  if (typeof node !== "object" || node === null) {
    return;
  }

  const obj = node as Record<string, unknown>;

  for (const key of SCHEMA_SIZE_KEYWORDS) {
    delete obj[key];
  }

  for (const value of Object.values(obj)) {
    stripSchemaSizeKeywords(value);
  }
}

function logGroqRequestBudget(userPrompt: string): void {
  const schemaChars = JSON.stringify(GROQ_STRICT_BLUEPRINT_SCHEMA).length;
  const systemChars = BLUEPRINT_SYSTEM_PROMPT.length;
  const userChars = userPrompt.length;
  const inputChars = systemChars + userChars + schemaChars;
  const estimatedInputTokens = Math.ceil(inputChars / 4);
  const estimatedReserved = estimatedInputTokens + MAX_COMPLETION_TOKENS;

  console.log(
    `[groq] request size: system=${systemChars}c user=${userChars}c schema=${schemaChars}c estInputTokens=${estimatedInputTokens} max_completion_tokens=${MAX_COMPLETION_TOKENS} estReserved=${estimatedReserved}`,
  );
}

function classifyGroqError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) {
    return error;
  }

  if (
    error instanceof Groq.APIConnectionTimeoutError ||
    error instanceof Groq.APIUserAbortError ||
    isAbortTimeoutError(error)
  ) {
    return new AIProviderError(
      "Blueprint generation timed out.",
      error,
      "timeout",
      undefined,
      "groq",
    );
  }

  if (
    error instanceof Groq.AuthenticationError ||
    error instanceof Groq.PermissionDeniedError
  ) {
    return new AIProviderError(
      "Groq is not configured.",
      error,
      "config",
      error.status,
      "groq",
    );
  }

  if (isGroqTokenLimitError(error)) {
    return new AIProviderError(
      "Groq token limit exceeded.",
      error,
      "rate_limited",
      error instanceof Groq.APIError ? error.status : 413,
      "groq",
    );
  }

  if (error instanceof Groq.BadRequestError && isJsonSchemaUnsupported(error)) {
    console.log(
      "[groq] JSON schema structured output is not supported by this model",
    );
    return new AIProviderError(
      "Groq model does not support JSON-schema structured output.",
      error,
      "unavailable",
      error.status,
      "groq",
    );
  }

  if (error instanceof Groq.APIError) {
    const status = error.status;
    const kind =
      status === undefined
        ? error instanceof Groq.APIConnectionError
          ? "network"
          : "unknown"
        : classifyHttpStatus(status);

    return new AIProviderError(
      error.message || "Failed to reach the AI provider.",
      error,
      kind,
      typeof status === "number" ? status : undefined,
      "groq",
    );
  }

  if (error instanceof Groq.APIConnectionError) {
    return new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "network",
      undefined,
      "groq",
    );
  }

  return new AIProviderError(
    "Failed to reach the AI provider.",
    error,
    "unknown",
    undefined,
    "groq",
  );
}

function isGroqTokenLimitError(error: unknown): boolean {
  if (!(error instanceof Groq.APIError)) {
    return false;
  }

  const status = error.status;
  const details = groqErrorDetails(error);
  const isTpmOrRequestTooLarge =
    /tokens per minute|\bTPM\b|Request too large for model|requested \d+/i.test(
      details,
    );
  const isRateLimitCode = /rate_limit_exceeded/i.test(details);

  if (!isTpmOrRequestTooLarge && !isRateLimitCode) {
    return false;
  }

  if (status === 413) {
    return isTpmOrRequestTooLarge || isRateLimitCode;
  }

  if (status === 429 || error instanceof Groq.RateLimitError) {
    return true;
  }

  return isTpmOrRequestTooLarge && isRateLimitCode;
}

function groqErrorDetails(error: {
  message: string;
  status?: number;
  error?: unknown;
}): string {
  const body =
    error.error !== undefined && error.error !== null
      ? JSON.stringify(error.error)
      : "";
  return `${error.message} ${body} ${error.status ?? ""}`;
}

function isJsonSchemaUnsupported(error: { message: string }): boolean {
  return /json_schema|structured output|response_format|does not support/i.test(
    error.message,
  );
}
