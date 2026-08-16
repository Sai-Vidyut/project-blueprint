import { AI_SERVICE_UNAVAILABLE } from "@/lib/ai/types";
import {
  blueprintApiErrorSchema,
  generateBlueprintResponseSchema,
} from "@/lib/schemas/generate-blueprint";
import type { Blueprint } from "@/types/blueprint";

export class AiServiceUnavailableError extends Error {
  readonly code = AI_SERVICE_UNAVAILABLE;

  constructor() {
    super("AI service unavailable.");
    this.name = "AiServiceUnavailableError";
  }
}

export async function generateBlueprint(idea: string): Promise<Blueprint> {
  const response = await fetch("/api/blueprint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idea }),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = blueprintApiErrorSchema.safeParse(data);
    const code = parsedError.success ? parsedError.data.error : undefined;

    if (response.status === 503 && code === AI_SERVICE_UNAVAILABLE) {
      throw new AiServiceUnavailableError();
    }

    const message = parsedError.success
      ? parsedError.data.error
      : "Failed to generate blueprint.";
    throw new Error(message);
  }

  const parsedBlueprint = generateBlueprintResponseSchema.safeParse(data);

  if (!parsedBlueprint.success) {
    throw new Error("The server returned an invalid blueprint.");
  }

  return parsedBlueprint.data;
}
