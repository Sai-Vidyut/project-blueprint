import type { Architecture } from "@/types/blueprint";

/**
 * Converts structured architecture data (components + relationships) into
 * Mermaid flowchart syntax. The AI model never generates Mermaid — this is
 * the only place diagram syntax is produced, deterministically, from
 * validated data.
 */
export function generateMermaidFromArchitecture(
  architecture: Architecture,
): string {
  const { components, relationships } = architecture;

  if (components.length === 0) {
    return "flowchart LR\n  Empty[\"No architecture components\"]";
  }

  const nodeIdByName = new Map<string, string>();
  const lines: string[] = ["flowchart LR"];

  components.forEach((component, index) => {
    const nodeId = toNodeId(component.name, index);
    nodeIdByName.set(component.name, nodeId);
    lines.push(`  ${nodeId}["${escapeLabel(component.name)}"]`);
  });

  relationships.forEach((relationship) => {
    const fromId = nodeIdByName.get(relationship.from);
    const toId = nodeIdByName.get(relationship.to);

    if (!fromId || !toId) {
      return;
    }

    const label = escapeLabel(relationship.description);
    lines.push(`  ${fromId} -->|${label}| ${toId}`);
  });

  return lines.join("\n");
}

/** Mermaid node ids must be alphanumeric/underscore; derive one from the name. */
function toNodeId(name: string, index: number): string {
  const slug = name
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug ? `n${index}_${slug}` : `n${index}`;
}

/** Keep edge/node labels on one line and free of characters that break Mermaid quoting. */
function escapeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/\s+/g, " ").trim();
}
