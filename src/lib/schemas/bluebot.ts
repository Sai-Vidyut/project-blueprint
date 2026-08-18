import { z } from "zod";

import { blueprintSchema } from "@/lib/schemas/blueprint";

/** Top-level Blueprint keys BlueBot may report as changed. */
export const blueprintSectionKeys = [
  "projectSummary",
  "targetUsers",
  "keyFeatures",
  "mvpScope",
  "architecture",
  "techStack",
  "databaseSchema",
  "apiEndpoints",
  "authentication",
  "deployment",
  "estimatedComplexity",
  "risks",
  "futureEnhancements",
  "roadmap",
] as const;

export const blueprintSectionKeySchema = z.enum(blueprintSectionKeys);

export type BlueprintSectionKey = z.infer<typeof blueprintSectionKeySchema>;

export const bluebotChangedItemSchema = z.object({
  section: blueprintSectionKeySchema,
  item: z.string().min(1).optional(),
  description: z.string().min(1),
});

export const bluebotChangesSchema = z.object({
  changedSections: z.array(blueprintSectionKeySchema).min(1),
  changedItems: z.array(bluebotChangedItemSchema).optional(),
});

export const bluebotMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const bluebotChatRequestSchema = z.object({
  blueprint: blueprintSchema,
  messages: z.array(bluebotMessageSchema).max(50),
  userMessage: z.string().trim().min(1).max(2000),
});

export const bluebotResponseSchema = z
  .object({
    message: z.string().min(1),
    modifiesBlueprint: z.boolean(),
    blueprint: blueprintSchema.optional(),
    changes: bluebotChangesSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.modifiesBlueprint) {
      if (!data.blueprint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blueprint"],
          message: "Blueprint is required when modifiesBlueprint is true.",
        });
      }

      if (!data.changes) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["changes"],
          message: "Change metadata is required when modifiesBlueprint is true.",
        });
      }
    } else if (data.blueprint !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blueprint"],
        message: "Blueprint must be omitted when modifiesBlueprint is false.",
      });
    } else if (data.changes !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["changes"],
        message: "Change metadata must be omitted when modifiesBlueprint is false.",
      });
    }
  });

export const bluebotApiErrorSchema = z.object({
  error: z.string(),
  issues: z
    .array(
      z.object({
        message: z.string().optional(),
      }),
    )
    .optional(),
});

export type BluebotMessage = z.infer<typeof bluebotMessageSchema>;
export type BluebotChanges = z.infer<typeof bluebotChangesSchema>;
export type BluebotChangedItem = z.infer<typeof bluebotChangedItemSchema>;
export type BluebotChatRequest = z.infer<typeof bluebotChatRequestSchema>;
export type BluebotResponse = z.infer<typeof bluebotResponseSchema>;
