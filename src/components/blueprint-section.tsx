"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { BlueprintSectionKey } from "@/lib/schemas/bluebot";

type BlueprintSectionProps = {
  section: BlueprintSectionKey;
  id: string;
  highlighted?: boolean;
  showUpdatedIndicator?: boolean;
  children: ReactNode;
  className?: string;
};

export function BlueprintSection({
  section,
  id,
  highlighted = false,
  showUpdatedIndicator = false,
  children,
  className,
}: BlueprintSectionProps) {
  return (
    <div
      id={id}
      data-blueprint-section={section}
      data-highlighted={highlighted ? "true" : undefined}
      className={cn(
        "relative scroll-mt-28 rounded-3xl transition-[box-shadow,border-color] duration-700",
        highlighted && "bluebot-section-highlight",
        className,
      )}
    >
      {showUpdatedIndicator ? (
        <p
          className="absolute top-3 right-4 z-10 font-mono text-[0.65rem] tracking-[0.12em] text-cyan-300/80 uppercase"
          aria-label="Updated by BlueBot"
        >
          ✦ Updated by BlueBot
        </p>
      ) : null}
      {children}
    </div>
  );
}
