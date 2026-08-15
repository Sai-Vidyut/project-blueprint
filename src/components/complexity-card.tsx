import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/index";
import { formatComplexityForCopy } from "@/lib/utils/blueprint-format";
import type { EstimatedComplexity } from "@/types/blueprint";

type ComplexityCardProps = {
  estimatedComplexity: EstimatedComplexity;
};

const LEVEL_STYLES: Record<EstimatedComplexity["level"], string> = {
  low: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  high: "text-red-600 dark:text-red-400",
};

export function ComplexityCard({ estimatedComplexity }: ComplexityCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Complexity</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Effort estimate for the MVP
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatComplexityForCopy(estimatedComplexity)}
            label="Copy complexity"
          />
          <Badge variant="outline">13</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline gap-4">
          <p
            className={cn(
              "font-heading text-3xl font-medium capitalize sm:text-4xl",
              LEVEL_STYLES[estimatedComplexity.level],
            )}
          >
            {estimatedComplexity.level}
          </p>
          <p className="text-muted-foreground">
            ~{estimatedComplexity.timelineWeeks} week
            {estimatedComplexity.timelineWeeks === 1 ? "" : "s"}
          </p>
        </div>
        <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {estimatedComplexity.rationale}
        </p>
      </CardContent>
    </Card>
  );
}
