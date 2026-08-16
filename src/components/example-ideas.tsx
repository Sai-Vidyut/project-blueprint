"use client";

import { Button } from "@/components/ui/button";
import { EXAMPLE_IDEAS } from "@/lib/constants/blueprint-ui";
import { cn } from "@/lib/utils";

type ExampleIdeasProps = {
  onSelect: (idea: string) => void;
  disabled?: boolean;
  className?: string;
  ideas?: readonly string[];
  selectedIdea?: string;
};

export function shuffleExampleIdeas(
  ideas: readonly string[] = EXAMPLE_IDEAS,
): string[] {
  const next = [...ideas];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    const swapped = next[swapIndex];

    if (current === undefined || swapped === undefined) {
      continue;
    }

    next[index] = swapped;
    next[swapIndex] = current;
  }

  return next;
}

const CANONICAL_EXAMPLE_IDEAS: string[] = [...EXAMPLE_IDEAS];

let clientShuffledExampleIdeas: string[] | null = null;

export function getCanonicalExampleIdeas() {
  return CANONICAL_EXAMPLE_IDEAS;
}

export function getClientShuffledExampleIdeas() {
  if (clientShuffledExampleIdeas === null) {
    clientShuffledExampleIdeas = shuffleExampleIdeas(EXAMPLE_IDEAS);
  }

  return clientShuffledExampleIdeas;
}

export function subscribeExampleIdeaOrder() {
  return () => {};
}

export function ExampleIdeas({
  onSelect,
  disabled = false,
  className,
  ideas = EXAMPLE_IDEAS,
  selectedIdea,
}: ExampleIdeasProps) {
  return (
    <div className={className}>
      <p className="mb-3 text-sm text-muted-foreground sm:text-base">
        Try an example
      </p>
      <div className="flex flex-wrap gap-2">
        {ideas.map((example) => {
          const isSelected = selectedIdea === example;

          return (
            <Button
              key={example}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelect(example)}
              className={cn(
                "h-auto max-w-full rounded-2xl px-3 py-2.5 text-left whitespace-normal transition-[transform,box-shadow,background-color,border-color] duration-150",
                isSelected && "ring-1 ring-white/35",
              )}
            >
              {example}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
