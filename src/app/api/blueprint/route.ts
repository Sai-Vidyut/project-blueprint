import { NextResponse } from "next/server";

import {
  blueprintApiErrorSchema,
  generateBlueprintResponseSchema,
} from "@/lib/schemas/generate-blueprint";
import { ideaRequestSchema } from "@/lib/schemas/idea";
import { mockBlueprint } from "@/lib/utils/mockBlueprint";

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

  const parsedResponse = generateBlueprintResponseSchema.safeParse(mockBlueprint);

  if (!parsedResponse.success) {
    return jsonError("Blueprint fixture is invalid.", 500);
  }

  return NextResponse.json(parsedResponse.data);
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
