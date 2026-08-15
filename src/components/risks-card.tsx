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
import { formatRisksForCopy } from "@/lib/utils/blueprint-format";
import type { Risk } from "@/types/blueprint";

type RisksCardProps = {
  risks: Risk[];
};

export function RisksCard({ risks }: RisksCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Risks</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          What could go wrong, and how to handle it
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton text={formatRisksForCopy(risks)} label="Copy risks" />
          <Badge variant="outline">14</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {risks.map((risk, index) => (
            <li key={risk.risk} className="flex flex-col gap-2">
              {index > 0 ? <Separator className="my-4" /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{risk.risk}</p>
                <Badge
                  variant={risk.impact === "high" ? "destructive" : "secondary"}
                >
                  {risk.impact} impact
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Mitigation: {risk.mitigation}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
