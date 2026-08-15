"use client";

import { useRef, useState } from "react";

import { generateBlueprint } from "@/lib/api/generate-blueprint";
import {
  BlueprintDashboard,
  type BlueprintDashboardStatus,
} from "@/components/blueprint-dashboard";
import { ExampleIdeas } from "@/components/example-ideas";
import { IdeaForm } from "@/components/idea-form";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import type { Blueprint } from "@/types/blueprint";

export function BlueprintHome() {
  const [idea, setIdea] = useState("");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [status, setStatus] = useState<BlueprintDashboardStatus>("empty");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  async function handleGenerate(nextIdea: string) {
    setIdea(nextIdea);
    setBlueprint(null);
    setErrorMessage(null);
    setStatus("loading");

    scrollToResults();

    try {
      const result = await generateBlueprint(nextIdea);

      setBlueprint(result);
      setStatus("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to generate blueprint.",
      );
      setStatus("error");
    }
  }

  function scrollToResults() {
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleTryExample(example: string) {
    setIdea(example);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function handleRetry() {
    if (idea.trim().length >= 10) {
      handleGenerate(idea);
    } else {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  const isGenerating = status === "loading";

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div
        aria-hidden="true"
        className="bg-page-glow pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
      />
      <div
        aria-hidden="true"
        className="bg-page-grid pointer-events-none absolute inset-x-0 top-0 h-[32rem]"
      />

      <SiteHeader />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
        <section
          className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 text-center"
        >
          <Badge variant="secondary" className="text-sm">
            Idea to blueprint in 30 seconds
          </Badge>
          <div className="flex flex-col gap-5">
            <h1 className="font-heading text-[2.25rem] leading-[1.06] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Turn a software idea into an implementation-ready plan.
            </h1>
            <p className="mx-auto max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              Architecture, technology, diagram, and roadmap — generated in one
              flow. No account required.
            </p>
          </div>
          <div ref={formRef} className="flex w-full flex-col gap-6 text-left">
            <IdeaForm
              idea={idea}
              onIdeaChange={setIdea}
              isGenerating={isGenerating}
              onGenerate={handleGenerate}
            />
            <ExampleIdeas
              onSelect={handleTryExample}
              disabled={isGenerating}
            />
          </div>
        </section>

        <section
          ref={resultsRef}
          aria-busy={isGenerating}
          aria-live="polite"
          className="mt-20 scroll-mt-24 sm:mt-28"
        >
          <BlueprintDashboard
            status={status}
            idea={idea}
            blueprint={blueprint}
            errorMessage={errorMessage}
            onTryExample={handleTryExample}
            onRetry={handleRetry}
          />
        </section>
      </main>
    </div>
  );
}
