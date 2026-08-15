"use client";

import { Button } from "@/components/ui/button";
import { EXAMPLE_IDEAS } from "@/lib/constants/blueprint-ui";

type ExampleIdeasProps = {
  onSelect: (idea: string) => void;
  disabled?: boolean;
  className?: string;
};

export function ExampleIdeas({
  onSelect,
  disabled = false,
  className,
}: ExampleIdeasProps) {
  return (
    <div className={className}>
      <p className="mb-3 text-sm text-muted-foreground sm:text-base">
        Try an example
      </p>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_IDEAS.map((example) => (
          <Button
            key={example}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(example)}
            className="h-auto max-w-full py-2 text-left whitespace-normal"
          >
            {example}
          </Button>
        ))}
      </div>
    </div>
  );
}
