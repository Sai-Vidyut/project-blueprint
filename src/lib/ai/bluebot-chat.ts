import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { GoogleGenAI } from "@google/genai";
import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientInputError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientRoutingError,
} from "@huggingface/inference";
import Groq from "groq-sdk";
import { z } from "zod";

import { BLUEBOT_JSON_SCHEMA } from "@/lib/ai/bluebot-json-schema";
import { isDevForceFailure } from "@/lib/ai/dev-force-failure";
import { classifyHttpStatus, isAbortTimeoutError } from "@/lib/ai/http-error";
import { resolveOpenRouterAttempts } from "@/lib/ai/openrouter-catalog";
import {
  isKnownGoodModel,
  isTransientOpenRouterFailure,
  MAX_OPENROUTER_ATTEMPTS,
  recordOpenRouterSuccess,
  recordOpenRouterTransientFailure,
} from "@/lib/ai/openrouter-health";
import { parseJsonFromModelContent } from "@/lib/ai/parse-json-content";
import {
  omitNullProperties,
  toGroqStrictJsonSchema,
} from "@/lib/ai/providers/groq";
import {
  AIProviderError,
  type AIProviderConfig,
  type AIProviderKind,
  type BluebotChatInput,
} from "@/lib/ai/types";
import { bluebotResponseSchema, type BluebotResponse } from "@/lib/schemas/bluebot";
import {
  BLUEBOT_SYSTEM_PROMPT,
  buildBluebotUserPrompt,
} from "@/prompts/bluebot";

const GEMINI_TIMEOUT_MS = 60_000;
const GEMINI_MAX_OUTPUT_TOKENS = 4096;
const CEREBRAS_TIMEOUT_MS = 25_000;
const GROQ_TIMEOUT_MS = 30_000;
const HF_TIMEOUT_MS = 25_000;
const OPENROUTER_TIMEOUT_MS = 10_000;
const MAX_COMPLETION_TOKENS = 4_500;
const OPENROUTER_MAX_TOKENS = 3_000;

const GEMINI_BLUEBOT_SCHEMA = z.toJSONSchema(bluebotResponseSchema, {
  target: "openapi-3.0",
});

const GROQ_BLUEBOT_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "bluebot_response",
    strict: true,
    schema: toGroqStrictJsonSchema(BLUEBOT_JSON_SCHEMA),
  },
};

export async function chatWithProvider(
  kind: AIProviderKind,
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  switch (kind) {
    case "gemini":
      return chatWithGemini(config, input);
    case "cerebras":
      return chatWithCerebras(config, input);
    case "groq":
      return chatWithGroq(config, input);
    case "huggingface":
      return chatWithHuggingFace(config, input);
    case "openrouter":
      return chatWithOpenRouter(config, input);
    default:
      throw new AIProviderError(
        "Unsupported AI provider.",
        undefined,
        "config",
        undefined,
        kind,
      );
  }
}

function buildUserPrompt(input: BluebotChatInput): string {
  return buildBluebotUserPrompt({
    blueprint: input.blueprint,
    messages: input.messages,
    userMessage: input.userMessage,
  });
}

function parseAndValidateBluebotResponse(
  content: string,
  provider: AIProviderKind,
): BluebotResponse {
  const parsed = omitNullProperties(parseJsonFromModelContent(content));
  const validated = bluebotResponseSchema.safeParse(parsed);

  if (!validated.success) {
    console.error(
      `[bluebot] bluebotResponseSchema validation failed (${provider}):`,
      JSON.stringify(validated.error.issues, null, 2),
    );
    throw new AIProviderError(
      "AI provider returned an invalid BlueBot response shape.",
      undefined,
      "invalid_shape",
      undefined,
      provider,
    );
  }

  return validated.data;
}

async function chatWithGemini(
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  if (isDevForceFailure("FORCE_GEMINI_FAILURE")) {
    throw new AIProviderError(
      "Forced Gemini failure for fallback testing.",
      undefined,
      "unavailable",
      undefined,
      "gemini",
    );
  }

  const model = config.model;
  if (!model) {
    throw new AIProviderError(
      "AI provider is not configured.",
      undefined,
      "config",
      undefined,
      "gemini",
    );
  }

  const client = new GoogleGenAI({ apiKey: config.apiKey });
  const userPrompt = buildUserPrompt(input);

  let content: string | undefined;

  try {
    const interaction = await client.interactions.create(
      {
        model,
        input: userPrompt,
        system_instruction: BLUEBOT_SYSTEM_PROMPT,
        store: false,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: GEMINI_BLUEBOT_SCHEMA,
        },
        generation_config: {
          max_output_tokens: GEMINI_MAX_OUTPUT_TOKENS,
          thinking_level: "minimal",
          thinking_summaries: "none",
        },
      },
      {
        timeout_ms: GEMINI_TIMEOUT_MS,
        retries: { strategy: "none" },
      },
    );

    content = interaction.output_text?.trim();
  } catch (error) {
    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "unknown",
      undefined,
      "gemini",
    );
  }

  if (!content) {
    throw new AIProviderError(
      "AI provider returned no content.",
      undefined,
      "empty_response",
      undefined,
      "gemini",
    );
  }

  return parseAndValidateBluebotResponse(content, "gemini");
}

async function chatWithCerebras(
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  if (isDevForceFailure("FORCE_CEREBRAS_FAILURE")) {
    throw new AIProviderError(
      "Forced Cerebras failure for fallback testing.",
      undefined,
      "unavailable",
      undefined,
      "cerebras",
    );
  }

  const model = config.model?.trim();
  if (!model) {
    throw new AIProviderError(
      "Cerebras is not configured.",
      undefined,
      "config",
      undefined,
      "cerebras",
    );
  }

  const client = new Cerebras({
    apiKey: config.apiKey,
    timeout: CEREBRAS_TIMEOUT_MS,
    maxRetries: 0,
    warmTCPConnection: false,
  });

  const userPrompt = buildUserPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: BLUEBOT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "bluebot_response",
          strict: true,
          schema: BLUEBOT_JSON_SCHEMA as { [key: string]: unknown },
        },
      },
    });

    if ("error" in completion) {
      throw new AIProviderError(
        completion.error.message || "Failed to reach the AI provider.",
        undefined,
        "unknown",
        undefined,
        "cerebras",
      );
    }

    if (!("object" in completion) || completion.object !== "chat.completion") {
      throw new AIProviderError(
        "AI provider returned no content.",
        undefined,
        "empty_response",
        undefined,
        "cerebras",
      );
    }

    const message = completion.choices[0]?.message?.content;
    const content = typeof message === "string" ? message.trim() : undefined;
    if (!content) {
      throw new AIProviderError(
        "AI provider returned no content.",
        undefined,
        "empty_response",
        undefined,
        "cerebras",
      );
    }

    return parseAndValidateBluebotResponse(content, "cerebras");
  } catch (error) {
    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "unknown",
      undefined,
      "cerebras",
    );
  }
}

async function chatWithGroq(
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  if (isDevForceFailure("FORCE_GROQ_FAILURE")) {
    throw new AIProviderError(
      "Forced Groq failure for fallback testing.",
      undefined,
      "unavailable",
      undefined,
      "groq",
    );
  }

  const model = config.model?.trim();
  if (!model) {
    throw new AIProviderError(
      "Groq is not configured.",
      undefined,
      "config",
      undefined,
      "groq",
    );
  }

  const client = new Groq({
    apiKey: config.apiKey,
    timeout: GROQ_TIMEOUT_MS,
    maxRetries: 0,
  });

  const userPrompt = buildUserPrompt(input);

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: BLUEBOT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      temperature: 0.4,
      reasoning_effort: "low",
      include_reasoning: false,
      response_format: GROQ_BLUEBOT_RESPONSE_FORMAT,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new AIProviderError(
        "AI provider returned no content.",
        undefined,
        "empty_response",
        undefined,
        "groq",
      );
    }

    return parseAndValidateBluebotResponse(content, "groq");
  } catch (error) {
    if (error instanceof AIProviderError) {
      throw error;
    }

    if (
      error instanceof Groq.APIConnectionTimeoutError ||
      error instanceof Groq.APIUserAbortError ||
      isAbortTimeoutError(error)
    ) {
      throw new AIProviderError(
        "BlueBot request timed out.",
        error,
        "timeout",
        undefined,
        "groq",
      );
    }

    if (error instanceof Groq.APIError) {
      throw new AIProviderError(
        error.message || "Failed to reach the AI provider.",
        error,
        error.status ? classifyHttpStatus(error.status) : "unknown",
        error.status,
        "groq",
      );
    }

    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "unknown",
      undefined,
      "groq",
    );
  }
}

async function chatWithHuggingFace(
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  if (isDevForceFailure("FORCE_HF_FAILURE")) {
    throw new AIProviderError(
      "Forced Hugging Face failure for fallback testing.",
      undefined,
      "unavailable",
      undefined,
      "huggingface",
    );
  }

  const model = config.model?.trim();
  if (!model) {
    throw new AIProviderError(
      "Hugging Face is not configured.",
      undefined,
      "config",
      undefined,
      "huggingface",
    );
  }

  const client = new InferenceClient(config.apiKey);
  const userPrompt = buildUserPrompt(input);

  try {
    const completion = await client.chatCompletion(
      {
        model,
        provider: "auto",
        messages: [
          { role: "system", content: BLUEBOT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: MAX_COMPLETION_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "bluebot_response",
            strict: true,
            schema: BLUEBOT_JSON_SCHEMA as { [key: string]: unknown },
          },
        },
      },
      {
        signal: AbortSignal.timeout(HF_TIMEOUT_MS),
        retry_on_error: false,
      },
    );

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new AIProviderError(
        "AI provider returned no content.",
        undefined,
        "empty_response",
        undefined,
        "huggingface",
      );
    }

    return parseAndValidateBluebotResponse(content, "huggingface");
  } catch (error) {
    if (error instanceof AIProviderError) {
      throw error;
    }

    if (isAbortTimeoutError(error)) {
      throw new AIProviderError(
        "BlueBot request timed out.",
        error,
        "timeout",
        undefined,
        "huggingface",
      );
    }

    if (
      error instanceof InferenceClientHubApiError ||
      error instanceof InferenceClientInputError ||
      error instanceof InferenceClientProviderApiError ||
      error instanceof InferenceClientProviderOutputError ||
      error instanceof InferenceClientRoutingError
    ) {
      throw new AIProviderError(
        error.message || "Failed to reach the AI provider.",
        error,
        "unknown",
        undefined,
        "huggingface",
      );
    }

    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "unknown",
      undefined,
      "huggingface",
    );
  }
}

async function chatWithOpenRouter(
  config: AIProviderConfig,
  input: BluebotChatInput,
): Promise<BluebotResponse> {
  if (isDevForceFailure("FORCE_OPENROUTER_FAILURE")) {
    throw new AIProviderError(
      "Forced OpenRouter failure for fallback testing.",
      undefined,
      "unavailable",
      undefined,
      "openrouter",
    );
  }

  const baseUrl =
    config.baseUrl?.replace(/\/$/, "") ?? "https://openrouter.ai/api/v1";
  const completionsUrl = `${baseUrl}/chat/completions`;
  const userPrompt = buildUserPrompt(input);

  const attempts = (
    await resolveOpenRouterAttempts({
      apiKey: config.apiKey,
      baseUrl,
      preferredModel: config.model,
    })
  ).slice(0, MAX_OPENROUTER_ATTEMPTS);

  let lastError: unknown;

  for (const [index, attempt] of attempts.entries()) {
    if (isKnownGoodModel(attempt.id)) {
      console.log(`[bluebot/openrouter] Trying known-good model: ${attempt.id}`);
    }
    console.log(`[bluebot/openrouter] Attempt ${index + 1}: ${attempt.id}`);

    try {
      const response = await requestOpenRouterBluebot({
        completionsUrl,
        apiKey: config.apiKey,
        model: attempt.id,
        supportsJsonSchema: attempt.supportsJsonSchema,
        supportsReasoning: attempt.supportsReasoning,
        maxCompletionTokens: attempt.maxCompletionTokens,
        userPrompt,
      });

      recordOpenRouterSuccess(attempt.id);
      return response;
    } catch (error) {
      lastError = error;
      if (error instanceof AIProviderError && isTransientOpenRouterFailure(error)) {
        recordOpenRouterTransientFailure(attempt.id);
        continue;
      }

      throw error;
    }
  }

  if (lastError instanceof AIProviderError) {
    throw lastError;
  }

  throw new AIProviderError(
    "OpenRouter failed to complete the BlueBot request.",
    lastError,
    "unknown",
    undefined,
    "openrouter",
  );
}

async function requestOpenRouterBluebot(args: {
  completionsUrl: string;
  apiKey: string;
  model: string;
  supportsJsonSchema: boolean;
  supportsReasoning: boolean;
  maxCompletionTokens?: number;
  userPrompt: string;
}): Promise<BluebotResponse> {
  const maxTokens = Math.min(
    OPENROUTER_MAX_TOKENS,
    args.maxCompletionTokens ?? OPENROUTER_MAX_TOKENS,
  );

  const body: Record<string, unknown> = {
    model: args.model,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: BLUEBOT_SYSTEM_PROMPT },
      { role: "user", content: args.userPrompt },
    ],
  };

  if (args.supportsReasoning) {
    body.reasoning = { exclude: true };
  }

  if (args.supportsJsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name: "bluebot_response",
        strict: true,
        schema: BLUEBOT_JSON_SCHEMA,
      },
    };
  }

  let response: Response;
  let rawBody: string;

  try {
    response = await fetch(args.completionsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
    });
    rawBody = await response.text();
  } catch (error) {
    if (isAbortTimeoutError(error)) {
      throw new AIProviderError(
        "BlueBot request timed out.",
        error,
        "timeout",
        undefined,
        "openrouter",
      );
    }

    throw new AIProviderError(
      "Failed to reach the AI provider.",
      error,
      "network",
      undefined,
      "openrouter",
    );
  }

  let payload: {
    choices?: Array<{ message?: { content?: string | null } }>;
    error?: { message?: string };
  };

  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch (error) {
    throw new AIProviderError(
      "AI provider returned an unreadable response.",
      error,
      "invalid_json",
      response.status,
      "openrouter",
    );
  }

  if (response.status === 402) {
    throw new AIProviderError(
      "OpenRouter requires credits for the configured fallback model.",
      payload.error,
      "payment_required",
      402,
      "openrouter",
    );
  }

  if (!response.ok) {
    throw new AIProviderError(
      `AI provider rejected the request (${response.status})`,
      payload.error,
      classifyHttpStatus(response.status),
      response.status,
      "openrouter",
    );
  }

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new AIProviderError(
      "AI provider returned no content.",
      undefined,
      "empty_response",
      undefined,
      "openrouter",
    );
  }

  return parseAndValidateBluebotResponse(content, "openrouter");
}
