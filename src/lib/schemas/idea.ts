import { z } from "zod";

/** Validates the request body for `POST /api/blueprint`. */
export const ideaRequestSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(10, "Describe your idea in a bit more detail.")
    .max(2000, "Keep your idea under 2000 characters."),
});

export type IdeaRequest = z.infer<typeof ideaRequestSchema>;
