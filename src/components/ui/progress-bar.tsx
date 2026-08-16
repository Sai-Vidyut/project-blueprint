"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils/index";

type ProgressBarProps = {
  value: number;
  className?: string;
};

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={false}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 90, damping: 22 }}
      />
    </div>
  );
}
