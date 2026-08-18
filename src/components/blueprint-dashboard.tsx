"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2Icon,
  LayersIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { ApiEndpointsCard } from "@/components/api-endpoints-card";
import { ArchitectureCard } from "@/components/architecture-card";
import { AuthenticationCard } from "@/components/authentication-card";
import { BlueprintGenerationProgress } from "@/components/blueprint-generation-progress";
import { BlueprintSection } from "@/components/blueprint-section";
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
import type { BlueprintSectionKey } from "@/lib/schemas/bluebot";
import { BLUEPRINT_SECTION_DOM_IDS } from "@/lib/utils/blueprint-sections";
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
  highlightedSections?: ReadonlySet<BlueprintSectionKey>;
  updatedSections?: ReadonlySet<BlueprintSectionKey>;
  onOpenBluebot?: () => void;
  onTryExample?: (idea: string) => void;
  onRetry?: () => void;
};

export function BlueprintDashboard({
  status,
  idea,
  exampleIdeas,
  blueprint,
  errorMessage,
  highlightedSections,
  updatedSections,
  onOpenBluebot,
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
        onOpenBluebot={onOpenBluebot}
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
            <BlueprintSections
              blueprint={blueprint}
              highlightedSections={highlightedSections}
              updatedSections={updatedSections}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BlueprintSections({
  blueprint,
  highlightedSections,
  updatedSections,
}: {
  blueprint: Blueprint;
  highlightedSections?: ReadonlySet<BlueprintSectionKey>;
  updatedSections?: ReadonlySet<BlueprintSectionKey>;
}) {
  const diagram = useMemo(
    () => generateMermaidFromArchitecture(blueprint.architecture),
    [blueprint.architecture],
  );

  const isHighlighted = (section: BlueprintSectionKey) =>
    highlightedSections?.has(section) ?? false;
  const isUpdated = (section: BlueprintSectionKey) =>
    updatedSections?.has(section) ?? false;

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <BlueprintSection
        section="projectSummary"
        id={BLUEPRINT_SECTION_DOM_IDS.projectSummary}
        highlighted={isHighlighted("projectSummary")}
        showUpdatedIndicator={isUpdated("projectSummary")}
      >
        <ProjectSummaryCard projectSummary={blueprint.projectSummary} />
      </BlueprintSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <BlueprintSection
          section="targetUsers"
          id={BLUEPRINT_SECTION_DOM_IDS.targetUsers}
          highlighted={isHighlighted("targetUsers")}
          showUpdatedIndicator={isUpdated("targetUsers")}
        >
          <TargetUsersCard targetUsers={blueprint.targetUsers} />
        </BlueprintSection>
        <BlueprintSection
          section="keyFeatures"
          id={BLUEPRINT_SECTION_DOM_IDS.keyFeatures}
          highlighted={isHighlighted("keyFeatures")}
          showUpdatedIndicator={isUpdated("keyFeatures")}
        >
          <KeyFeaturesCard keyFeatures={blueprint.keyFeatures} />
        </BlueprintSection>
      </div>

      <BlueprintSection
        section="mvpScope"
        id={BLUEPRINT_SECTION_DOM_IDS.mvpScope}
        highlighted={isHighlighted("mvpScope")}
        showUpdatedIndicator={isUpdated("mvpScope")}
      >
        <MvpScopeCard mvpScope={blueprint.mvpScope} />
      </BlueprintSection>

      <BlueprintSection
        section="architecture"
        id="blueprint-section-diagram"
        highlighted={isHighlighted("architecture")}
        showUpdatedIndicator={isUpdated("architecture")}
      >
        <DiagramCard diagram={diagram} />
      </BlueprintSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <BlueprintSection
          section="architecture"
          id={BLUEPRINT_SECTION_DOM_IDS.architecture}
          highlighted={isHighlighted("architecture")}
          showUpdatedIndicator={isUpdated("architecture")}
        >
          <ArchitectureCard architecture={blueprint.architecture} />
        </BlueprintSection>
        <BlueprintSection
          section="techStack"
          id={BLUEPRINT_SECTION_DOM_IDS.techStack}
          highlighted={isHighlighted("techStack")}
          showUpdatedIndicator={isUpdated("techStack")}
        >
          <TechStackCard techStack={blueprint.techStack} />
        </BlueprintSection>
      </div>

      <BlueprintSection
        section="databaseSchema"
        id={BLUEPRINT_SECTION_DOM_IDS.databaseSchema}
        highlighted={isHighlighted("databaseSchema")}
        showUpdatedIndicator={isUpdated("databaseSchema")}
      >
        <DatabaseSchemaCard databaseSchema={blueprint.databaseSchema} />
      </BlueprintSection>

      <BlueprintSection
        section="apiEndpoints"
        id={BLUEPRINT_SECTION_DOM_IDS.apiEndpoints}
        highlighted={isHighlighted("apiEndpoints")}
        showUpdatedIndicator={isUpdated("apiEndpoints")}
      >
        <ApiEndpointsCard apiEndpoints={blueprint.apiEndpoints} />
      </BlueprintSection>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <BlueprintSection
          section="authentication"
          id={BLUEPRINT_SECTION_DOM_IDS.authentication}
          highlighted={isHighlighted("authentication")}
          showUpdatedIndicator={isUpdated("authentication")}
        >
          <AuthenticationCard authentication={blueprint.authentication} />
        </BlueprintSection>
        <BlueprintSection
          section="deployment"
          id={BLUEPRINT_SECTION_DOM_IDS.deployment}
          highlighted={isHighlighted("deployment")}
          showUpdatedIndicator={isUpdated("deployment")}
        >
          <DeploymentCard deployment={blueprint.deployment} />
        </BlueprintSection>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <BlueprintSection
          section="estimatedComplexity"
          id={BLUEPRINT_SECTION_DOM_IDS.estimatedComplexity}
          highlighted={isHighlighted("estimatedComplexity")}
          showUpdatedIndicator={isUpdated("estimatedComplexity")}
        >
          <ComplexityCard estimatedComplexity={blueprint.estimatedComplexity} />
        </BlueprintSection>
        <BlueprintSection
          section="risks"
          id={BLUEPRINT_SECTION_DOM_IDS.risks}
          highlighted={isHighlighted("risks")}
          showUpdatedIndicator={isUpdated("risks")}
        >
          <RisksCard risks={blueprint.risks} />
        </BlueprintSection>
      </div>

      <BlueprintSection
        section="futureEnhancements"
        id={BLUEPRINT_SECTION_DOM_IDS.futureEnhancements}
        highlighted={isHighlighted("futureEnhancements")}
        showUpdatedIndicator={isUpdated("futureEnhancements")}
      >
        <FutureEnhancementsCard
          futureEnhancements={blueprint.futureEnhancements}
        />
      </BlueprintSection>

      <BlueprintSection
        section="roadmap"
        id={BLUEPRINT_SECTION_DOM_IDS.roadmap}
        highlighted={isHighlighted("roadmap")}
        showUpdatedIndicator={isUpdated("roadmap")}
      >
        <RoadmapCard roadmap={blueprint.roadmap} />
      </BlueprintSection>
    </div>
  );
}

function DashboardHeader({
  status,
  idea,
  blueprint,
  isGeneratingView,
  onOpenBluebot,
}: {
  status: BlueprintDashboardStatus;
  idea?: string;
  blueprint?: Blueprint | null;
  isGeneratingView: boolean;
  onOpenBluebot?: () => void;
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
        <h2 className="w-full font-heading text-3xl font-medium tracking-tight text-pretty sm:text-4xl md:text-5xl">
          {isGeneratingView
            ? "Crafting your blueprint"
            : status === "success"
              ? "Your implementation blueprint"
              : status === "error"
                ? "Blueprint unavailable"
                : "Your blueprint lives here"}
        </h2>
        {idea && status !== "empty" ? (
          <p className="max-w-3xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg md:text-xl">
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
        <div className="flex flex-wrap items-center gap-2">
          {onOpenBluebot ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-9 rounded-xl px-3.5"
              onClick={onOpenBluebot}
            >
              <SparklesIcon data-icon="inline-start" />
              Ask BlueBot
            </Button>
          ) : null}
          <CopyButton
            text={copyText}
            label="Copy all"
            variant="default"
            size="default"
            className="h-9 rounded-xl px-3.5"
          />
        </div>
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
    <Empty className="glass-surface min-h-80 grow-0 border border-white/12 py-12 sm:min-h-96 sm:py-16">
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
    <Empty className="glass-surface min-h-48 grow-0 border border-white/12 py-12 sm:py-16">
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
