"use client";

import { CheckIcon } from "lucide-react";

import { GENERATION_STEPS } from "@/lib/constants/blueprint-ui";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils/index";

type GenerationProgressProps = {
  activeStep: number;
};

export function GenerationProgress({ activeStep }: GenerationProgressProps) {
  return (
    <div
      className="rounded-2xl border bg-card/60 p-6 sm:p-8"
      aria-label="Blueprint generation progress"
    >
      <ol className="flex flex-col gap-4">
        {GENERATION_STEPS.map((step, index) => {
          const isComplete = index < activeStep;
          const isCurrent = index === activeStep;
          const isPending = index > activeStep;

          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-4 text-base sm:text-lg",
                isPending && "text-muted-foreground/60",
                isCurrent && "text-foreground",
                isComplete && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                  isComplete && "border-foreground/20 bg-muted",
                  isCurrent && "border-foreground/30 bg-muted",
                  isPending && "border-border bg-transparent",
                )}
              >
                {isComplete ? (
                  <CheckIcon className="size-4" />
                ) : isCurrent ? (
                  <Spinner className="size-4" />
                ) : (
                  <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                )}
              </span>
              <span className="leading-snug">{step}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function runGenerationProgress(
  onStep: (step: number) => void,
  stepMs = 420,
) {
  return new Promise<void>((resolve) => {
    let step = 0;
    onStep(step);

    const interval = window.setInterval(() => {
      step += 1;
      onStep(step);

      if (step >= GENERATION_STEPS.length) {
        window.clearInterval(interval);
        window.setTimeout(resolve, 280);
      }
    }, stepMs);
  });
}
