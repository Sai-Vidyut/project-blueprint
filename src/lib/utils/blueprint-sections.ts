import type { BlueprintSectionKey } from "@/lib/schemas/bluebot";

/** DOM id prefix for scroll targets in the Blueprint dashboard. */
export const BLUEPRINT_SECTION_DOM_IDS: Record<BlueprintSectionKey, string> = {
  projectSummary: "blueprint-section-project-summary",
  targetUsers: "blueprint-section-target-users",
  keyFeatures: "blueprint-section-key-features",
  mvpScope: "blueprint-section-mvp-scope",
  architecture: "blueprint-section-architecture",
  techStack: "blueprint-section-tech-stack",
  databaseSchema: "blueprint-section-database-schema",
  apiEndpoints: "blueprint-section-api-endpoints",
  authentication: "blueprint-section-authentication",
  deployment: "blueprint-section-deployment",
  estimatedComplexity: "blueprint-section-estimated-complexity",
  risks: "blueprint-section-risks",
  futureEnhancements: "blueprint-section-future-enhancements",
  roadmap: "blueprint-section-roadmap",
};

/** Human-readable labels for change summaries. */
export const BLUEPRINT_SECTION_LABELS: Record<BlueprintSectionKey, string> = {
  projectSummary: "Project summary",
  targetUsers: "Target users",
  keyFeatures: "Key features",
  mvpScope: "MVP scope",
  architecture: "Architecture",
  techStack: "Technology",
  databaseSchema: "Database",
  apiEndpoints: "API",
  authentication: "Authentication",
  deployment: "Deployment",
  estimatedComplexity: "Complexity",
  risks: "Risks",
  futureEnhancements: "Future enhancements",
  roadmap: "Roadmap",
};

/** Architecture changes also affect the derived diagram section. */
export const BLUEPRINT_SECTION_EXTRA_DOM_IDS: Partial<
  Record<BlueprintSectionKey, string[]>
> = {
  architecture: ["blueprint-section-diagram"],
};

export function scrollToBlueprintSection(section: BlueprintSectionKey): void {
  const ids = [
    BLUEPRINT_SECTION_DOM_IDS[section],
    ...(BLUEPRINT_SECTION_EXTRA_DOM_IDS[section] ?? []),
  ];

  const element = ids
    .map((id) => document.getElementById(id))
    .find((node) => node !== null);

  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}
