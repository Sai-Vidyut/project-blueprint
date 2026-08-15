"use client";

import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/spinner";

/**
 * Real request-state progress. The parent only mounts this while the API
 * call is in flight. Optional `event` is the hook for future SSE phases
 * (`outline`, `section`, `complete`, …) without changing the visual shell.
 */
export type GenerationProgressEvent = {
  phase: string;
  label?: string;
  detail?: string;
};

type GenerationProgressProps = {
  event?: GenerationProgressEvent;
};

const DEFAULT_EVENT: GenerationProgressEvent = {
  phase: "generating",
  label: "Generating blueprint...",
  detail: "This may take 10–60 seconds depending on model speed.",
};

export function GenerationProgress({
  event = DEFAULT_EVENT,
}: GenerationProgressProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const label = event.label ?? DEFAULT_EVENT.label;
  const detail = event.detail ?? DEFAULT_EVENT.detail;

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div
      className="rounded-2xl border bg-card/60 p-6 sm:p-8"
      aria-label="Blueprint generation progress"
      aria-live="polite"
    >
      <div className="flex items-start gap-4 text-base sm:text-lg">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-foreground/30 bg-muted">
          <Spinner className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <p className="leading-snug text-foreground">{label}</p>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {detail}
          </p>
          <p className="font-mono text-sm text-muted-foreground tabular-nums">
            Elapsed: {elapsedSeconds}s
          </p>
        </div>
      </div>
    </div>
  );
}
