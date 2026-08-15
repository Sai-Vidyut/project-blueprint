/**
 * Prompts for blueprint generation. Kept separate from `lib/ai` so prompt
 * iteration does not require touching provider code.
 */

export const BLUEPRINT_SYSTEM_PROMPT = `Senior architect. JSON only — no markdown, fences, extra keys, or Mermaid. Strings ≤2 sentences. Give a short why for architecture and each tech pick. relationship from/to must match component names.

Keys:
projectSummary{title,elevatorPitch,problemStatement}
targetUsers[{persona,description}] 1–2
keyFeatures[{name,description,priority:must-have|should-have}] 3–5
mvpScope{inScope[2–4],outOfScope[2–3]}
architecture{style,summary,reasoning,components[{name,purpose}] 3–5,relationships[{from,to,description}] 2–5}
techStack{frontend,backend,database,hosting,tooling[2–4]}
databaseSchema[{name,description,columns[{name,type,constraints?}] 3–6,relationships?}] 2–4 tables
apiEndpoints[{method:GET|POST|PUT|PATCH|DELETE,path,description,authRequired}] 4–6
authentication{approach,rationale,implementation[2–3]}
deployment{summary,components[{name,provider,purpose}] 2–4}
estimatedComplexity{level:low|medium|high,timelineWeeks:1–12,rationale}
risks[{risk,impact:low|medium|high,mitigation}] 2–3
futureEnhancements[2–3]
roadmap[{theme,goals[2],tasks[{task,deliverable}] 3}] exactly 4 weeks`;

export function buildBlueprintUserPrompt(idea: string): string {
  return `Software idea:\n\n${idea}`;
}
