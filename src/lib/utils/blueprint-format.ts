import type {
  ApiEndpoint,
  Architecture,
  AuthenticationStrategy,
  Blueprint,
  DatabaseTable,
  DeploymentArchitecture,
  EstimatedComplexity,
  KeyFeature,
  MvpScope,
  ProjectSummary,
  Risk,
  Roadmap,
  TargetUser,
  TechStack,
} from "@/types/blueprint";

export function formatProjectSummaryForCopy(summary: ProjectSummary) {
  return [
    `## ${summary.title}`,
    "",
    summary.elevatorPitch,
    "",
    `**Problem:** ${summary.problemStatement}`,
  ].join("\n");
}

export function formatTargetUsersForCopy(targetUsers: TargetUser[]) {
  return [
    "## Target Users",
    "",
    ...targetUsers.map((user) => `- **${user.persona}** — ${user.description}`),
  ].join("\n");
}

export function formatKeyFeaturesForCopy(keyFeatures: KeyFeature[]) {
  return [
    "## Key Features",
    "",
    ...keyFeatures.map(
      (feature) =>
        `- [${feature.priority}] **${feature.name}** — ${feature.description}`,
    ),
  ].join("\n");
}

export function formatMvpScopeForCopy(mvpScope: MvpScope) {
  return [
    "## MVP Scope",
    "",
    "### In scope",
    ...mvpScope.inScope.map((item) => `- ${item}`),
    "",
    "### Out of scope",
    ...mvpScope.outOfScope.map((item) => `- ${item}`),
  ].join("\n");
}

export function formatArchitectureForCopy(architecture: Architecture) {
  return [
    "## Architecture",
    "",
    `**Style:** ${architecture.style}`,
    "",
    architecture.summary,
    "",
    `### Why this approach`,
    architecture.reasoning,
    "",
    "### Components",
    ...architecture.components.map(
      (component) => `- **${component.name}** — ${component.purpose}`,
    ),
    "",
    "### Relationships",
    ...architecture.relationships.map(
      (relationship) =>
        `- ${relationship.from} → ${relationship.to}: ${relationship.description}`,
    ),
  ].join("\n");
}

export function formatDiagramForCopy(diagram: string) {
  return `## Architecture Diagram (Mermaid)\n\n\`\`\`mermaid\n${diagram.trim()}\n\`\`\``;
}

export function formatTechStackForCopy(techStack: TechStack) {
  return [
    "## Technology Stack",
    "",
    `- Frontend: ${techStack.frontend}`,
    `- Backend: ${techStack.backend}`,
    `- Database: ${techStack.database}`,
    `- Hosting: ${techStack.hosting}`,
    `- Tooling: ${techStack.tooling.join(", ")}`,
  ].join("\n");
}

export function formatDatabaseSchemaForCopy(databaseSchema: DatabaseTable[]) {
  return [
    "## Database Schema",
    "",
    ...databaseSchema.flatMap((table) => [
      `### ${table.name}`,
      table.description,
      "",
      ...table.columns.map(
        (column) =>
          `- \`${column.name}\` ${column.type}${column.constraints ? ` (${column.constraints})` : ""}`,
      ),
      ...(table.relationships?.length
        ? ["", ...table.relationships.map((relation) => `- ${relation}`)]
        : []),
      "",
    ]),
  ].join("\n").trim();
}

export function formatApiEndpointsForCopy(apiEndpoints: ApiEndpoint[]) {
  return [
    "## API Endpoints",
    "",
    ...apiEndpoints.map(
      (endpoint) =>
        `- \`${endpoint.method} ${endpoint.path}\`${endpoint.authRequired ? " 🔒" : ""} — ${endpoint.description}`,
    ),
  ].join("\n");
}

export function formatAuthenticationForCopy(
  authentication: AuthenticationStrategy,
) {
  return [
    "## Authentication",
    "",
    `**Approach:** ${authentication.approach}`,
    "",
    authentication.rationale,
    "",
    "### Implementation",
    ...authentication.implementation.map((step) => `- ${step}`),
  ].join("\n");
}

export function formatDeploymentForCopy(deployment: DeploymentArchitecture) {
  return [
    "## Deployment",
    "",
    deployment.summary,
    "",
    ...deployment.components.map(
      (component) =>
        `- **${component.name}** (${component.provider}) — ${component.purpose}`,
    ),
  ].join("\n");
}

export function formatComplexityForCopy(
  estimatedComplexity: EstimatedComplexity,
) {
  return [
    "## Estimated Complexity",
    "",
    `**Level:** ${estimatedComplexity.level} · **Timeline:** ${estimatedComplexity.timelineWeeks} week(s)`,
    "",
    estimatedComplexity.rationale,
  ].join("\n");
}

export function formatRisksForCopy(risks: Risk[]) {
  return [
    "## Risks",
    "",
    ...risks.map(
      (risk) =>
        `- [${risk.impact}] **${risk.risk}** — Mitigation: ${risk.mitigation}`,
    ),
  ].join("\n");
}

export function formatFutureEnhancementsForCopy(futureEnhancements: string[]) {
  return [
    "## Future Enhancements",
    "",
    ...futureEnhancements.map((item) => `- ${item}`),
  ].join("\n");
}

export function formatRoadmapForCopy(roadmap: Roadmap) {
  return [
    "## Development Roadmap",
    "",
    ...roadmap.flatMap((week, index) => [
      `### Week ${index + 1}: ${week.theme}`,
      "",
      "Goals:",
      ...week.goals.map((goal) => `- ${goal}`),
      "",
      "Tasks:",
      ...week.tasks.map((task) => `- ${task.task} → ${task.deliverable}`),
      "",
    ]),
  ].join("\n").trim();
}

export function formatBlueprintForCopy(blueprint: Blueprint, diagram: string) {
  return [
    formatProjectSummaryForCopy(blueprint.projectSummary),
    formatTargetUsersForCopy(blueprint.targetUsers),
    formatKeyFeaturesForCopy(blueprint.keyFeatures),
    formatMvpScopeForCopy(blueprint.mvpScope),
    formatArchitectureForCopy(blueprint.architecture),
    formatDiagramForCopy(diagram),
    formatTechStackForCopy(blueprint.techStack),
    formatDatabaseSchemaForCopy(blueprint.databaseSchema),
    formatApiEndpointsForCopy(blueprint.apiEndpoints),
    formatAuthenticationForCopy(blueprint.authentication),
    formatDeploymentForCopy(blueprint.deployment),
    formatComplexityForCopy(blueprint.estimatedComplexity),
    formatRisksForCopy(blueprint.risks),
    formatFutureEnhancementsForCopy(blueprint.futureEnhancements),
    formatRoadmapForCopy(blueprint.roadmap),
  ].join("\n\n---\n\n");
}
