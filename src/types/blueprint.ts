/**
 * The Blueprint contract, re-exported as pure types.
 *
 * The real definition lives in `src/lib/schemas/blueprint.ts` as a Zod
 * schema — types here are inferred from it (`z.infer`), never hand-declared.
 * Import from here when you only need the shape (components, UI code);
 * import the schema directly when you need runtime validation.
 */
export type {
  Blueprint,
  ProjectSummary,
  TargetUser,
  KeyFeature,
  MvpScope,
  ArchitectureComponent,
  ArchitectureRelationship,
  Architecture,
  TechStack,
  DatabaseColumn,
  DatabaseTable,
  ApiEndpoint,
  AuthenticationStrategy,
  DeploymentComponent,
  DeploymentArchitecture,
  EstimatedComplexity,
  Risk,
  RoadmapTask,
  RoadmapWeek,
  Roadmap,
} from "@/lib/schemas/blueprint";
