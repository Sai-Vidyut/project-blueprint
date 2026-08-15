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
import { Separator } from "@/components/ui/separator";
import { formatArchitectureForCopy } from "@/lib/utils/blueprint-format";
import type { Blueprint } from "@/types/blueprint";

type ArchitectureCardProps = {
  architecture: Blueprint["architecture"];
  architectureReasoning: Blueprint["architectureReasoning"];
};

export function ArchitectureCard({
  architecture,
  architectureReasoning,
}: ArchitectureCardProps) {
  const copyText = formatArchitectureForCopy(
    architecture,
    architectureReasoning,
  );

  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Architecture</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          How the system should be shaped
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton text={copyText} label="Copy architecture" />
          <Badge variant="outline">02</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-8 sm:gap-10">
        <p className="text-lg leading-relaxed text-pretty sm:text-xl">
          {architecture}
        </p>
        <Separator />
        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Why this approach
          </p>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {architectureReasoning}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
