import type { Blueprint, Roadmap, TechStack } from "@/types/blueprint";

export function formatArchitectureForCopy(
  architecture: string,
  architectureReasoning: string,
) {
  return `## Architecture\n\n${architecture}\n\n### Why this\n\n${architectureReasoning}`;
}

export function formatTechStackForCopy(techStack: TechStack) {
  return [
    "## Technology Stack",
    "",
    `- Frontend: ${techStack.frontend}`,
    `- Backend: ${techStack.backend}`,
    `- Database: ${techStack.database}`,
    `- Hosting: ${techStack.hosting}`,
  ].join("\n");
}

export function formatRoadmapForCopy(roadmap: Roadmap) {
  const weeks = [
    { label: "Week 1", tasks: roadmap.week1 },
    { label: "Week 2", tasks: roadmap.week2 },
    { label: "Week 3", tasks: roadmap.week3 },
    { label: "Week 4", tasks: roadmap.week4 },
  ];

  return [
    "## Development Roadmap",
    "",
    ...weeks.flatMap((week) => [
      `### ${week.label}`,
      ...week.tasks.map((task) => `- ${task}`),
      "",
    ]),
  ].join("\n").trim();
}

export function formatDiagramForCopy(diagram: string) {
  return `## Architecture Diagram (Mermaid)\n\n\`\`\`mermaid\n${diagram.trim()}\n\`\`\``;
}

export function formatBlueprintForCopy(blueprint: Blueprint) {
  return [
    formatArchitectureForCopy(
      blueprint.architecture,
      blueprint.architectureReasoning,
    ),
    formatTechStackForCopy(blueprint.techStack),
    formatDiagramForCopy(blueprint.diagram),
    formatRoadmapForCopy(blueprint.roadmap),
  ].join("\n\n---\n\n");
}
