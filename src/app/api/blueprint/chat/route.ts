import { NextResponse } from "next/server";

import { createBluebotProvider } from "@/lib/ai/bluebot-provider";
import { getAIProviderConfig } from "@/lib/ai/config";
import {
  AI_SERVICE_UNAVAILABLE,
  AIProviderError,
  isAiServiceUnavailable,
  type AIProviderKind,
} from "@/lib/ai/types";
import {
  bluebotApiErrorSchema,
  bluebotChatRequestSchema,
  bluebotResponseSchema,
} from "@/lib/schemas/bluebot";

export async function POST(request: Request) {
  console.log("[bluebot] POST /api/blueprint/chat request started");

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, { stage: "request_json" });
  }

  const parsedRequest = bluebotChatRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    console.error(
      "[bluebot] Request validation failed:",
      JSON.stringify(parsedRequest.error.issues, null, 2),
    );
    return jsonError(
      "Invalid request.",
      400,
      {
        stage: "request_validation",
        issues: parsedRequest.error.issues.map((issue) => ({
          message: issue.message,
        })),
      },
    );
  }

  const requestHasBlueprint = Boolean(parsedRequest.data.blueprint);
  console.log("[bluebot] Request validated", {
    hasBlueprint: requestHasBlueprint,
    hasIdea: Boolean(parsedRequest.data.idea?.trim()),
    messageCount: parsedRequest.data.messages.length,
    userMessageLength: parsedRequest.data.userMessage.length,
  });

  try {
    const provider = createBluebotProvider(getAIProviderConfig());
    const result = await provider.chat({
      blueprint: parsedRequest.data.blueprint,
      idea: parsedRequest.data.idea,
      messages: parsedRequest.data.messages,
      userMessage: parsedRequest.data.userMessage,
    });

    console.log("[bluebot] Provider returned response", {
      modifiesBlueprint: result.modifiesBlueprint,
      messageLength: result.message.length,
      hasBlueprint: Boolean(result.blueprint),
      changedSections: result.changes?.changedSections,
    });

    const parsedResponse = bluebotResponseSchema.safeParse(result);

    if (!parsedResponse.success) {
      console.error(
        "[bluebot] Response validation failed after provider success:",
        JSON.stringify(parsedResponse.error.issues, null, 2),
      );
      return jsonError("BlueBot response failed validation.", 500, {
        stage: "response_validation",
        kind: "invalid_shape",
      });
    }

    if (!parsedRequest.data.blueprint && parsedResponse.data.modifiesBlueprint) {
      return jsonError(
        "BlueBot cannot modify a Blueprint before one exists.",
        500,
        { stage: "response_policy", kind: "invalid_shape" },
      );
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    logBluebotFailure(error);

    if (isAiServiceUnavailable(error)) {
      return jsonError(AI_SERVICE_UNAVAILABLE, 503, {
        stage: "provider_failover",
        kind: "service_unavailable",
        provider: error instanceof AIProviderError ? error.provider : undefined,
      });
    }

    if (error instanceof AIProviderError) {
      return jsonError(
        "BlueBot could not complete your request. Please try again.",
        502,
        {
          stage: providerErrorStage(error),
          kind: error.kind,
          provider: error.provider,
        },
      );
    }

    return jsonError("Something went wrong.", 500, { stage: "unknown" });
  }
}

export function GET() {
  return jsonError("Method not allowed. Use POST.", 405, {
    stage: "method",
  });
}

function logBluebotFailure(error: unknown) {
  if (error instanceof AIProviderError) {
    console.error("[bluebot] Request failed", {
      kind: error.kind,
      provider: error.provider,
      status: error.statusCode,
      stage: providerErrorStage(error),
      message: error.message,
      attemptedProviders: error.attemptedProviders,
    });
    return;
  }

  console.error("[bluebot] Caught unexpected error during chat:", error);
}

function providerErrorStage(error: AIProviderError): string {
  switch (error.kind) {
    case "invalid_json":
      return "json_extraction";
    case "invalid_shape":
      return "response_validation";
    case "incomplete_modification":
      return "incomplete_modification";
    case "empty_response":
      return "provider_response";
    default:
      return "provider_request";
  }
}

function jsonError(
  error: string,
  status: number,
  options?: {
    issues?: Array<{ message?: string }>;
    kind?: string;
    provider?: AIProviderKind;
    stage?: string;
  },
) {
  const isDev = process.env.NODE_ENV === "development";
  const payload = bluebotApiErrorSchema.parse({
    error,
    ...(options?.issues?.length ? { issues: options.issues } : {}),
    ...(isDev && options?.kind ? { kind: options.kind } : {}),
    ...(isDev && options?.provider ? { provider: options.provider } : {}),
    ...(isDev && options?.stage ? { stage: options.stage } : {}),
  });

  return NextResponse.json(payload, { status });
}
