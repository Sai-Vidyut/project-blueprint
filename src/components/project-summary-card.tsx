import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatProjectSummaryForCopy } from "@/lib/utils/blueprint-format";
import type { ProjectSummary } from "@/types/blueprint";

type ProjectSummaryCardProps = {
  projectSummary: ProjectSummary;
};

export function ProjectSummaryCard({ projectSummary }: ProjectSummaryCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">
          {projectSummary.title}
        </CardTitle>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatProjectSummaryForCopy(projectSummary)}
            label="Copy summary"
          />
          <Badge variant="outline">00</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-lg leading-relaxed text-pretty sm:text-xl">
          {projectSummary.elevatorPitch}
        </p>
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Problem
          </p>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {projectSummary.problemStatement}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
