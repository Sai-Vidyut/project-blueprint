"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { AiOutageState } from "@/components/ai-outage-state";
import { AppBackdrop } from "@/components/app-backdrop";
import { Bluebot } from "@/components/bluebot";
import {
  BlueprintDashboard,
  type BlueprintDashboardStatus,
} from "@/components/blueprint-dashboard";
import {
  ExampleIdeas,
  getCanonicalExampleIdeas,
  getClientShuffledExampleIdeas,
  subscribeExampleIdeaOrder,
} from "@/components/example-ideas";
import { IdeaForm } from "@/components/idea-form";
import { SiteHeader } from "@/components/site-header";
import { AiServiceUnavailableError, generateBlueprint } from "@/lib/api/generate-blueprint";
import { blueprintSchema } from "@/lib/schemas/blueprint";
import type { BluebotChanges, BlueprintSectionKey } from "@/lib/schemas/bluebot";
import type { Blueprint } from "@/types/blueprint";

const HIGHLIGHT_DURATION_MS = 6_000;

export function BlueprintHome() {
  const [idea, setIdea] = useState("");
  const exampleIdeas = useSyncExternalStore(
    subscribeExampleIdeaOrder,
    getClientShuffledExampleIdeas,
    getCanonicalExampleIdeas,
  );
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [previousBlueprint, setPreviousBlueprint] = useState<Blueprint | null>(null);
  const [status, setStatus] = useState<BlueprintDashboardStatus | "outage">(
    "empty",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedSections, setHighlightedSections] = useState<
    Set<BlueprintSectionKey>
  >(new Set());
  const [updatedSections, setUpdatedSections] = useState<Set<BlueprintSectionKey>>(
    new Set(),
  );
  const [bluebotOpen, setBluebotOpen] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  async function handleGenerate(nextIdea: string) {
    setIdea(nextIdea);
    setBlueprint(null);
    setPreviousBlueprint(null);
    setHighlightedSections(new Set());
    setUpdatedSections(new Set());
    setBluebotOpen(false);
    setErrorMessage(null);
    setStatus("loading");

    scrollToResults();

    try {
      const result = await generateBlueprint(nextIdea);

      setBlueprint(result);
      setStatus("success");
    } catch (error) {
      if (error instanceof AiServiceUnavailableError) {
        setStatus("outage");
        return;
      }

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

  const handleBlueprintChange = useCallback(
    (nextBlueprint: Blueprint, changes: BluebotChanges) => {
      const validated = blueprintSchema.safeParse(nextBlueprint);
      if (!validated.success) {
        setErrorMessage(
          "BlueBot returned an invalid Blueprint. Your current plan was kept unchanged.",
        );
        return;
      }

      if (blueprint) {
        setPreviousBlueprint(blueprint);
      }

      setBlueprint(validated.data);
      setUpdatedSections(new Set(changes.changedSections));
      setHighlightedSections(new Set(changes.changedSections));

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      highlightTimerRef.current = setTimeout(() => {
        setHighlightedSections(new Set());
      }, HIGHLIGHT_DURATION_MS);
    },
    [blueprint],
  );

  const handleUndo = useCallback(() => {
    if (!previousBlueprint) {
      return;
    }

    setBlueprint(previousBlueprint);
    setPreviousBlueprint(null);
    setHighlightedSections(new Set());
    setUpdatedSections(new Set());
  }, [previousBlueprint]);

  const isGenerating = status === "loading";
  const showBluebot = status === "success" && blueprint !== null;

  return (
    <div
      className={
        status === "outage"
          ? "relative flex h-dvh min-h-0 flex-col overflow-hidden"
          : "relative flex min-h-dvh flex-col"
      }
    >
      <AppBackdrop />

      <SiteHeader />

      {status === "outage" ? (
        <main className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <AiOutageState onRetry={handleRetry} />
        </main>
      ) : (
        <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:py-20">
          <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 text-center">
            <div className="flex w-full flex-col gap-5">
              <h1 className="w-full font-heading text-[2.25rem] leading-[1.06] font-medium tracking-tight text-pretty sm:text-5xl md:text-6xl">
                Turn a software idea into an implementation-ready plan.
              </h1>
              <p className="mx-auto w-full max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
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
                ideas={exampleIdeas}
                selectedIdea={idea}
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
              exampleIdeas={exampleIdeas}
              blueprint={blueprint}
              errorMessage={errorMessage}
              highlightedSections={highlightedSections}
              updatedSections={updatedSections}
              onOpenBluebot={() => setBluebotOpen(true)}
              onTryExample={handleTryExample}
              onRetry={handleRetry}
            />
          </section>
        </main>
      )}

      {showBluebot ? (
        <Bluebot
          blueprint={blueprint}
          idea={idea}
          open={bluebotOpen}
          onOpenChange={setBluebotOpen}
          onBlueprintChange={handleBlueprintChange}
          onUndo={handleUndo}
          canUndo={previousBlueprint !== null}
        />
      ) : null}
    </div>
  );
}
