"use client";

import { useEffect, useId, useState } from "react";
import { ImageOffIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { renderMermaidDiagram } from "@/lib/utils/mermaid";

type MermaidDiagramProps = {
  source: string;
};

type RenderState = "loading" | "success" | "error";

export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const reactId = useId();
  const renderId = `mermaid-${reactId.replace(/:/g, "")}`;
  const [state, setState] = useState<RenderState>("loading");
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      setState("loading");
      setSvgMarkup(null);

      const trimmed = source.trim();

      if (!trimmed) {
        if (!cancelled) {
          setState("error");
        }
        return;
      }

      try {
        const { svg } = await renderMermaidDiagram(trimmed, renderId);

        if (!cancelled) {
          setSvgMarkup(svg);
          setState("success");
        }
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [source, renderId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-56 w-full rounded-2xl sm:h-72" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Empty className="min-h-40 border border-dashed bg-muted/10 py-8 sm:py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOffIcon />
            </EmptyMedia>
            <EmptyTitle className="text-lg sm:text-xl">
              Diagram preview unavailable
            </EmptyTitle>
            <EmptyDescription className="text-base sm:text-lg">
              The architecture is still in your blueprint. Here is the generated
              diagram source.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
        <pre className="overflow-x-auto rounded-2xl border bg-muted/10 p-4 text-sm text-muted-foreground sm:p-6">
          <code>{source.trim()}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram overflow-x-auto rounded-2xl border bg-muted/10 p-6 sm:p-10 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-full [&_svg]:min-h-48"
      role="img"
      aria-label="Architecture diagram"
      dangerouslySetInnerHTML={{ __html: svgMarkup ?? "" }}
    />
  );
}
