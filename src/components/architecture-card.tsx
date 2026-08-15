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
import type { Architecture } from "@/types/blueprint";

type ArchitectureCardProps = {
  architecture: Architecture;
};

export function ArchitectureCard({ architecture }: ArchitectureCardProps) {
  const copyText = formatArchitectureForCopy(architecture);

  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Architecture</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          {architecture.style}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton text={copyText} label="Copy architecture" />
          <Badge variant="outline">02</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-8 sm:gap-10">
        <p className="text-lg leading-relaxed text-pretty sm:text-xl">
          {architecture.summary}
        </p>

        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Why this approach
          </p>
          <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {architecture.reasoning}
          </p>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Components
          </p>
          <ul className="flex flex-col gap-3">
            {architecture.components.map((component) => (
              <li key={component.name} className="flex flex-col gap-1">
                <p className="font-medium">{component.name}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {component.purpose}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Relationships
          </p>
          <ul className="flex flex-col gap-2">
            {architecture.relationships.map((relationship, index) => (
              <li
                key={`${relationship.from}-${relationship.to}-${index}`}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {relationship.from}
                </span>
                {" → "}
                <span className="font-medium text-foreground">
                  {relationship.to}
                </span>
                {": "}
                {relationship.description}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
