type MermaidModule = typeof import("mermaid");

let mermaidModulePromise: Promise<MermaidModule["default"]> | null = null;

export function getMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import("mermaid").then((module) => {
      const mermaid = module.default;

      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        darkMode: true,
        securityLevel: "strict",
        fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
      });

      return mermaid;
    });
  }

  return mermaidModulePromise;
}

export async function renderMermaidDiagram(source: string, renderId: string) {
  const mermaid = await getMermaid();
  return mermaid.render(renderId, source.trim());
}

export function getMermaidErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "The diagram syntax could not be parsed. Check the Mermaid source below.";
}
