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
import { formatTechStackForCopy } from "@/lib/utils/blueprint-format";
import type { TechStack } from "@/types/blueprint";

const STACK_ROWS: Array<{ key: keyof TechStack; label: string }> = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "database", label: "Database" },
  { key: "hosting", label: "Hosting" },
];

type TechStackCardProps = {
  techStack: TechStack;
};

export function TechStackCard({ techStack }: TechStackCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Technology</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Confident picks for each layer
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatTechStackForCopy(techStack)}
            label="Copy stack"
          />
          <Badge variant="outline">03</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {STACK_ROWS.map((row, index) => (
            <li key={row.key} className="flex flex-col">
              {index > 0 ? <Separator /> : null}
              <div className="flex flex-col gap-2 py-6 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-10">
                <p className="w-28 shrink-0 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                  {row.label}
                </p>
                <p className="text-lg leading-relaxed text-pretty sm:text-xl">
                  {techStack[row.key]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
