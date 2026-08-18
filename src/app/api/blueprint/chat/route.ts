import { NextResponse } from "next/server";

import { createBluebotProvider } from "@/lib/ai/bluebot-provider";
import { getAIProviderConfig } from "@/lib/ai/config";
import {
  AI_SERVICE_UNAVAILABLE,
  AIProviderError,
  isAiServiceUnavailable,
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
    return jsonError("Invalid JSON body.", 400);
  }

  const parsedRequest = bluebotChatRequestSchema.safeParse(body);

  if (!parsedRequest.success) {
    return jsonError(
      "Invalid request.",
      400,
      parsedRequest.error.issues.map((issue) => ({
        message: issue.message,
      })),
    );
  }

  try {
    const provider = createBluebotProvider(getAIProviderConfig());
    const result = await provider.chat({
      blueprint: parsedRequest.data.blueprint,
      messages: parsedRequest.data.messages,
      userMessage: parsedRequest.data.userMessage,
    });

    const parsedResponse = bluebotResponseSchema.safeParse(result);

    if (!parsedResponse.success) {
      return jsonError("BlueBot response failed validation.", 500);
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    console.error("[bluebot] Caught error during chat:", error);

    if (isAiServiceUnavailable(error)) {
      return jsonError(AI_SERVICE_UNAVAILABLE, 503);
    }

    if (error instanceof AIProviderError) {
      return jsonError(
        "BlueBot could not complete your request. Please try again.",
        502,
      );
    }

    return jsonError("Something went wrong.", 500);
  }
}

export function GET() {
  return jsonError("Method not allowed. Use POST.", 405);
}

function jsonError(
  error: string,
  status: number,
  issues?: Array<{ message?: string }>,
) {
  const payload = bluebotApiErrorSchema.parse({
    error,
    ...(issues?.length ? { issues } : {}),
  });

  return NextResponse.json(payload, { status });
}
