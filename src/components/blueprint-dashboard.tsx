"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2Icon,
  LayersIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { ApiEndpointsCard } from "@/components/api-endpoints-card";
import { ArchitectureCard } from "@/components/architecture-card";
import { AuthenticationCard } from "@/components/authentication-card";
import { BlueprintGenerationProgress } from "@/components/blueprint-generation-progress";
import { ComplexityCard } from "@/components/complexity-card";
import { CopyButton } from "@/components/copy-button";
import { DatabaseSchemaCard } from "@/components/database-schema-card";
import { DeploymentCard } from "@/components/deployment-card";
import { DiagramCard } from "@/components/diagram-card";
import { ExampleIdeas } from "@/components/example-ideas";
import { FutureEnhancementsCard } from "@/components/future-enhancements-card";
import { KeyFeaturesCard } from "@/components/key-features-card";
import { MvpScopeCard } from "@/components/mvp-scope-card";
import { ProjectSummaryCard } from "@/components/project-summary-card";
import { RisksCard } from "@/components/risks-card";
import { RoadmapCard } from "@/components/roadmap-card";
import { TargetUsersCard } from "@/components/target-users-card";
import { TechStackCard } from "@/components/tech-stack-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatBlueprintForCopy } from "@/lib/utils/blueprint-format";
import { generateMermaidFromArchitecture } from "@/lib/utils/generate-mermaid";
import type { Blueprint } from "@/types/blueprint";

export type BlueprintDashboardStatus =
  | "empty"
  | "loading"
  | "success"
  | "error";

type BlueprintDashboardProps = {
  status: BlueprintDashboardStatus;
  idea?: string;
  exampleIdeas?: readonly string[];
  blueprint?: Blueprint | null;
  errorMessage?: string | null;
  onTryExample?: (idea: string) => void;
  onRetry?: () => void;
};

export function BlueprintDashboard({
  status,
  idea,
  exampleIdeas,
  blueprint,
  errorMessage,
  onTryExample,
  onRetry,
}: BlueprintDashboardProps) {
  const [revealResults, setRevealResults] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(status);

  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (status !== "success") {
      setRevealResults(false);
    }
  }

  const handleProgressComplete = useCallback(() => {
    setRevealResults(true);
  }, []);

  const isGeneratingView =
    status === "loading" || (status === "success" && !revealResults);
  const showResults = status === "success" && revealResults && Boolean(blueprint);

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <DashboardHeader
        status={status}
        idea={idea}
        blueprint={blueprint}
        isGeneratingView={isGeneratingView}
      />

      {status === "empty" ? (
        <DashboardEmptyState
          idea={idea}
          exampleIdeas={exampleIdeas}
          onTryExample={onTryExample}
        />
      ) : null}
      {status === "error" ? (
        <DashboardErrorState message={errorMessage} onRetry={onRetry} />
      ) : null}

      <AnimatePresence mode="wait">
        {isGeneratingView ? (
          <motion.div
            key="generation-progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <BlueprintGenerationProgress
              isComplete={status === "success"}
              onComplete={handleProgressComplete}
            />
          </motion.div>
        ) : null}
        {showResults && blueprint ? (
          <motion.div
            key="blueprint-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <BlueprintSections blueprint={blueprint} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BlueprintSections({ blueprint }: { blueprint: Blueprint }) {
  const diagram = useMemo(
    () => generateMermaidFromArchitecture(blueprint.architecture),
    [blueprint.architecture],
  );

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <ProjectSummaryCard projectSummary={blueprint.projectSummary} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <TargetUsersCard targetUsers={blueprint.targetUsers} />
        <KeyFeaturesCard keyFeatures={blueprint.keyFeatures} />
      </div>

      <MvpScopeCard mvpScope={blueprint.mvpScope} />

      <DiagramCard diagram={diagram} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <ArchitectureCard architecture={blueprint.architecture} />
        <TechStackCard techStack={blueprint.techStack} />
      </div>

      <DatabaseSchemaCard databaseSchema={blueprint.databaseSchema} />

      <ApiEndpointsCard apiEndpoints={blueprint.apiEndpoints} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <AuthenticationCard authentication={blueprint.authentication} />
        <DeploymentCard deployment={blueprint.deployment} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <ComplexityCard estimatedComplexity={blueprint.estimatedComplexity} />
        <RisksCard risks={blueprint.risks} />
      </div>

      <FutureEnhancementsCard futureEnhancements={blueprint.futureEnhancements} />

      <RoadmapCard roadmap={blueprint.roadmap} />
    </div>
  );
}

function DashboardHeader({
  status,
  idea,
  blueprint,
  isGeneratingView,
}: {
  status: BlueprintDashboardStatus;
  idea?: string;
  blueprint?: Blueprint | null;
  isGeneratingView: boolean;
}) {
  const copyText = useMemo(() => {
    if (!blueprint) {
      return "";
    }

    const diagram = generateMermaidFromArchitecture(blueprint.architecture);
    return formatBlueprintForCopy(blueprint, diagram);
  }, [blueprint]);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          Blueprint
        </p>
        {isGeneratingView ? (
          <Badge variant="secondary">In progress</Badge>
        ) : null}
        {status === "success" && !isGeneratingView ? (
          <Badge variant="secondary">
            <CheckCircle2Icon data-icon="inline-start" />
            Ready to build
          </Badge>
        ) : null}
        {status === "error" ? (
          <Badge variant="destructive">
            <TriangleAlertIcon data-icon="inline-start" />
            Needs another try
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-3xl font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {isGeneratingView
            ? "Crafting your blueprint"
            : status === "success"
              ? "Your implementation blueprint"
              : status === "error"
                ? "Blueprint unavailable"
                : "Your blueprint lives here"}
        </h2>
        {idea && status !== "empty" ? (
          <p className="max-w-3xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg lg:text-xl">
            {idea}
          </p>
        ) : null}
        {status === "empty" ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Describe your software idea and generate a complete,
            developer-grade implementation plan — users, features, scope,
            architecture, stack, database, API, auth, deployment, risks, and
            a week-by-week roadmap.
          </p>
        ) : null}
        {isGeneratingView ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We&apos;re structuring your idea into something you can ship.
          </p>
        ) : null}
      </div>
      {status === "success" && !isGeneratingView && blueprint ? (
        <CopyButton
          text={copyText}
          label="Copy all"
          variant="default"
          size="default"
          className="h-9 rounded-xl px-3.5"
        />
      ) : null}
    </div>
  );
}

function DashboardEmptyState({
  idea,
  exampleIdeas,
  onTryExample,
}: {
  idea?: string;
  exampleIdeas?: readonly string[];
  onTryExample?: (idea: string) => void;
}) {
  return (
    <Empty className="glass-surface min-h-80 border border-white/12 py-12 sm:min-h-96 sm:py-16">
      <EmptyHeader className="max-w-xl">
        <EmptyMedia variant="icon">
          <LayersIcon />
        </EmptyMedia>
        <EmptyTitle className="text-xl sm:text-2xl">
          Describe your software idea
        </EmptyTitle>
        <EmptyDescription className="text-base sm:text-lg">
          Generate a complete implementation blueprint — from target users
          and MVP scope to database schema, API endpoints, and a week-by-week
          roadmap.
        </EmptyDescription>
      </EmptyHeader>
      {onTryExample ? (
        <ExampleIdeas
          ideas={exampleIdeas}
          selectedIdea={idea}
          onSelect={onTryExample}
          className="mt-8 w-full max-w-2xl px-6"
        />
      ) : null}
    </Empty>
  );
}

function DashboardErrorState({
  message,
  onRetry,
}: {
  message?: string | null;
  onRetry?: () => void;
}) {
  return (
    <Empty className="glass-surface min-h-48 border border-white/12 py-12 sm:py-16">
      <EmptyHeader className="max-w-lg">
        <EmptyMedia variant="icon">
          <TriangleAlertIcon />
        </EmptyMedia>
        <EmptyTitle className="text-xl sm:text-2xl">
          We couldn&apos;t finish your blueprint
        </EmptyTitle>
        <EmptyDescription className="text-base sm:text-lg">
          {message ?? "Something interrupted generation. Your idea is still here — try again."}
        </EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Empty>
  );
}
