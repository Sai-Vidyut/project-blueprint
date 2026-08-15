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
import { formatFutureEnhancementsForCopy } from "@/lib/utils/blueprint-format";

type FutureEnhancementsCardProps = {
  futureEnhancements: string[];
};

export function FutureEnhancementsCard({
  futureEnhancements,
}: FutureEnhancementsCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Future enhancements</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Deferred beyond the MVP
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatFutureEnhancementsForCopy(futureEnhancements)}
            label="Copy enhancements"
          />
          <Badge variant="outline">15</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {futureEnhancements.map((item) => (
            <li key={item} className="text-base leading-relaxed text-pretty">
              · {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
