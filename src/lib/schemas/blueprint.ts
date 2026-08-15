import { z } from "zod";

/**
 * The Blueprint contract — defined once, here, as a Zod schema.
 *
 * This is the single source of truth. Types are inferred from the schema
 * (`z.infer`) rather than declared by hand, so the runtime validator and the
 * TypeScript type can never drift apart. `src/types/blueprint.ts` re-exports
 * these types for consumers that only need the shape, not the validator.
 */
export const techStackSchema = z.object({
  frontend: z.string().min(1),
  backend: z.string().min(1),
  database: z.string().min(1),
  hosting: z.string().min(1),
});

const weekTasksSchema = z.array(z.string().min(1)).min(1, "Each week needs at least one task.");

export const roadmapSchema = z.object({
  week1: weekTasksSchema,
  week2: weekTasksSchema,
  week3: weekTasksSchema,
  week4: weekTasksSchema,
});

export const blueprintSchema = z.object({
  architecture: z.string().min(1),
  architectureReasoning: z.string().min(1),
  techStack: techStackSchema,
  /** Mermaid diagram source (e.g. `flowchart` or `graph`), not an image. */
  diagram: z.string().min(1),
  roadmap: roadmapSchema,
});

export type TechStack = z.infer<typeof techStackSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
