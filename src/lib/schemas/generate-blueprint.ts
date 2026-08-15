import { z } from "zod";

import { blueprintSchema } from "@/lib/schemas/blueprint";
import { ideaRequestSchema } from "@/lib/schemas/idea";

/** Request body for `POST /api/blueprint`. */
export const generateBlueprintRequestSchema = ideaRequestSchema;

export type GenerateBlueprintRequest = z.infer<
  typeof generateBlueprintRequestSchema
>;

/** Successful response body for `POST /api/blueprint`. */
export const generateBlueprintResponseSchema = blueprintSchema;

export type GenerateBlueprintResponse = z.infer<
  typeof generateBlueprintResponseSchema
>;

/** Error response body for `POST /api/blueprint`. */
export const blueprintApiErrorSchema = z.object({
  error: z.string(),
  issues: z
    .array(
      z.object({
        message: z.string().optional(),
      }),
    )
    .optional(),
});

export type BlueprintApiError = z.infer<typeof blueprintApiErrorSchema>;
