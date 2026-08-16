"use client";

import { useEffect, useState, type ReactNode } from "react";

import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STAGES = [
  "Analyzing idea",
  "Defining target users",
  "Designing MVP scope",
  "Planning architecture",
  "Creating database schema",
  "Generating API endpoints",
  "Building roadmap",
  "Finalizing blueprint",
] as const;

const STAGE_INTERVAL_MS = 3500;
const APPROACH_90_MS = 45_000;
const COMPLETE_HOLD_MS = 650;

type BlueprintGenerationProgressProps = {
  isComplete?: boolean;
  onComplete?: () => void;
};

export function BlueprintGenerationProgress({
  isComplete = false,
  onComplete,
}: BlueprintGenerationProgressProps) {
  const [progress, setProgress] = useState(6);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (isComplete) {
      return;
    }

    const startedAt = Date.now();

    const tickId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const t = Math.min(1, elapsed / APPROACH_90_MS);
      const eased = 1 - (1 - t) ** 3;
      setProgress(Math.max(6, eased * 90));
    }, 50);

    const stageId = window.setInterval(() => {
      setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);

    return () => {
      window.clearInterval(tickId);
      window.clearInterval(stageId);
    };
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onComplete?.();
    }, COMPLETE_HOLD_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isComplete, onComplete]);

  const displayProgress = isComplete ? 100 : progress;

  const stageLabel = isComplete
    ? "Blueprint ready"
    : `${STAGES[stageIndex]}...`;

  return (
    <div
      className="flex flex-col gap-8 sm:gap-10"
      aria-label="Blueprint generation progress"
      aria-live="polite"
    >
      <div className="glass-surface flex flex-col gap-4 rounded-2xl border border-white/12 p-6 sm:p-8">
        <ProgressBar value={displayProgress} />
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Current stage
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">{stageLabel}</p>
        </div>
      </div>

      <GenerationSkeletons />
    </div>
  );
}

function GenerationSkeletons() {
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <SkeletonCard title="Quality Score">
        <Skeleton className="h-12 w-24 sm:h-14 sm:w-28" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-4 w-3/4" />
      </SkeletonCard>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <SkeletonCard title="Architecture">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="mt-2 h-24 w-full" />
        </SkeletonCard>
        <SkeletonCard title="Tech Stack">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </SkeletonCard>
      </div>

      <SkeletonCard title="Roadmap">
        <div className="flex flex-col gap-6">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="flex gap-5">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <Skeleton className="h-5 w-40 sm:w-56" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}

function SkeletonCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <Skeleton className="h-8 w-40 sm:h-9 sm:w-48" />
        <span className="sr-only">{title}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}
