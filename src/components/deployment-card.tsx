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
import { formatDeploymentForCopy } from "@/lib/utils/blueprint-format";
import type { DeploymentArchitecture } from "@/types/blueprint";

type DeploymentCardProps = {
  deployment: DeploymentArchitecture;
};

export function DeploymentCard({ deployment }: DeploymentCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Deployment</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Where this runs in production
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatDeploymentForCopy(deployment)}
            label="Copy deployment"
          />
          <Badge variant="outline">12</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {deployment.summary}
        </p>
        <ul className="flex flex-col gap-3">
          {deployment.components.map((component) => (
            <li key={component.name} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-medium">{component.name}</p>
                <Badge variant="secondary" className="font-normal">
                  {component.provider}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{component.purpose}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
