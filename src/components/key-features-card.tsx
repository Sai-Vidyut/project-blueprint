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
import { formatKeyFeaturesForCopy } from "@/lib/utils/blueprint-format";
import type { KeyFeature } from "@/types/blueprint";

type KeyFeaturesCardProps = {
  keyFeatures: KeyFeature[];
};

export function KeyFeaturesCard({ keyFeatures }: KeyFeaturesCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Key features</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          What the product does
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatKeyFeaturesForCopy(keyFeatures)}
            label="Copy features"
          />
          <Badge variant="outline">06</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {keyFeatures.map((feature, index) => (
            <li key={feature.name} className="flex flex-col gap-2">
              {index > 0 ? <Separator className="my-4" /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{feature.name}</p>
                <Badge
                  variant={feature.priority === "must-have" ? "default" : "secondary"}
                >
                  {feature.priority}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
