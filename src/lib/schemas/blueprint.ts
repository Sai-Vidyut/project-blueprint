import { z } from "zod";

/**
 * The Blueprint contract — defined once, here, as a Zod schema.
 *
 * This is the single source of truth. Types are inferred from the schema
 * (`z.infer`) rather than declared by hand, so the runtime validator and the
 * TypeScript type can never drift apart. `src/types/blueprint.ts` re-exports
 * these types for consumers that only need the shape, not the validator.
 *
 * The AI model never generates a diagram. `architecture.components` and
 * `architecture.relationships` are structured data; Mermaid syntax is
 * derived from them programmatically (see `src/lib/utils/generate-mermaid.ts`).
 */

export const projectSummarySchema = z.object({
  title: z.string().min(1),
  elevatorPitch: z.string().min(1),
  problemStatement: z.string().min(1),
});

export const targetUserSchema = z.object({
  persona: z.string().min(1),
  description: z.string().min(1),
});

export const keyFeatureSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["must-have", "should-have"]),
});

export const mvpScopeSchema = z.object({
  inScope: z.array(z.string().min(1)).min(2),
  outOfScope: z.array(z.string().min(1)).min(2),
});

export const architectureComponentSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().min(1),
});

export const architectureRelationshipSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  description: z.string().min(1),
});

export const architectureSchema = z
  .object({
    style: z.string().min(1),
    summary: z.string().min(1),
    reasoning: z.string().min(1),
    components: z.array(architectureComponentSchema).min(2),
    relationships: z.array(architectureRelationshipSchema).min(1),
  })
  .superRefine((architecture, ctx) => {
    const componentNames = new Set(
      architecture.components.map((component) => component.name),
    );

    architecture.relationships.forEach((relationship, index) => {
      if (!componentNames.has(relationship.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["relationships", index, "from"],
          message: `"${relationship.from}" does not match any component name.`,
        });
      }

      if (!componentNames.has(relationship.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["relationships", index, "to"],
          message: `"${relationship.to}" does not match any component name.`,
        });
      }
    });
  });

export const techStackSchema = z.object({
  frontend: z.string().min(1),
  backend: z.string().min(1),
  database: z.string().min(1),
  hosting: z.string().min(1),
  tooling: z.array(z.string().min(1)).min(1),
});

export const databaseColumnSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  constraints: z.string().min(1).optional(),
});

export const databaseTableSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  columns: z.array(databaseColumnSchema).min(2),
  relationships: z.array(z.string().min(1)).optional(),
});

export const apiEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  description: z.string().min(1),
  authRequired: z.boolean(),
});

export const authenticationStrategySchema = z.object({
  approach: z.string().min(1),
  rationale: z.string().min(1),
  implementation: z.array(z.string().min(1)).min(1),
});

export const deploymentComponentSchema = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  purpose: z.string().min(1),
});

export const deploymentArchitectureSchema = z.object({
  summary: z.string().min(1),
  components: z.array(deploymentComponentSchema).min(2),
});

export const estimatedComplexitySchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  timelineWeeks: z.number().int().min(1).max(12),
  rationale: z.string().min(1),
});

export const riskSchema = z.object({
  risk: z.string().min(1),
  impact: z.enum(["low", "medium", "high"]),
  mitigation: z.string().min(1),
});

export const roadmapTaskSchema = z.object({
  task: z.string().min(1),
  deliverable: z.string().min(1),
});

export const roadmapWeekSchema = z.object({
  theme: z.string().min(1),
  goals: z.array(z.string().min(1)).min(2).max(3),
  tasks: z.array(roadmapTaskSchema).min(3).max(5),
});

export const roadmapSchema = z.array(roadmapWeekSchema).min(4).max(8);

export const blueprintSchema = z.object({
  projectSummary: projectSummarySchema,
  targetUsers: z.array(targetUserSchema).min(1),
  keyFeatures: z.array(keyFeatureSchema).min(3),
  mvpScope: mvpScopeSchema,
  architecture: architectureSchema,
  techStack: techStackSchema,
  databaseSchema: z.array(databaseTableSchema).min(1),
  apiEndpoints: z.array(apiEndpointSchema).min(3),
  authentication: authenticationStrategySchema,
  deployment: deploymentArchitectureSchema,
  estimatedComplexity: estimatedComplexitySchema,
  risks: z.array(riskSchema).min(2),
  futureEnhancements: z.array(z.string().min(1)).min(2),
  roadmap: roadmapSchema,
});

export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type TargetUser = z.infer<typeof targetUserSchema>;
export type KeyFeature = z.infer<typeof keyFeatureSchema>;
export type MvpScope = z.infer<typeof mvpScopeSchema>;
export type ArchitectureComponent = z.infer<typeof architectureComponentSchema>;
export type ArchitectureRelationship = z.infer<
  typeof architectureRelationshipSchema
>;
export type Architecture = z.infer<typeof architectureSchema>;
export type TechStack = z.infer<typeof techStackSchema>;
export type DatabaseColumn = z.infer<typeof databaseColumnSchema>;
export type DatabaseTable = z.infer<typeof databaseTableSchema>;
export type ApiEndpoint = z.infer<typeof apiEndpointSchema>;
export type AuthenticationStrategy = z.infer<
  typeof authenticationStrategySchema
>;
export type DeploymentComponent = z.infer<typeof deploymentComponentSchema>;
export type DeploymentArchitecture = z.infer<
  typeof deploymentArchitectureSchema
>;
export type EstimatedComplexity = z.infer<typeof estimatedComplexitySchema>;
export type Risk = z.infer<typeof riskSchema>;
export type RoadmapTask = z.infer<typeof roadmapTaskSchema>;
export type RoadmapWeek = z.infer<typeof roadmapWeekSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
