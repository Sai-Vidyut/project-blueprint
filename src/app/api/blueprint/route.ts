import { NextResponse } from "next/server";

import { getAIProviderConfig } from "@/lib/ai/config";
import { createAIProvider } from "@/lib/ai/provider";
import { AIProviderError } from "@/lib/ai/types";
import {
  blueprintApiErrorSchema,
  generateBlueprintResponseSchema,
} from "@/lib/schemas/generate-blueprint";
import { ideaRequestSchema } from "@/lib/schemas/idea";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsedRequest = ideaRequestSchema.safeParse(body);

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
    const provider = createAIProvider(getAIProviderConfig());
    const blueprint = await provider.generateBlueprint({
      idea: parsedRequest.data.idea,
    });

    const parsedResponse = generateBlueprintResponseSchema.safeParse(blueprint);

    if (!parsedResponse.success) {
      return jsonError("Generated blueprint failed validation.", 500);
    }

    return NextResponse.json(parsedResponse.data);
  } catch (error) {
    if (error instanceof AIProviderError) {
      return jsonError(
        "Failed to generate blueprint. Please try again.",
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
  const payload = blueprintApiErrorSchema.parse({
    error,
    ...(issues?.length ? { issues } : {}),
  });

  return NextResponse.json(payload, { status });
}
