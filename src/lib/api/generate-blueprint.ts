import {
  blueprintApiErrorSchema,
  generateBlueprintResponseSchema,
} from "@/lib/schemas/generate-blueprint";
import type { Blueprint } from "@/types/blueprint";

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
