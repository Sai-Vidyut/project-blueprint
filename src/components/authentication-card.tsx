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
import { formatAuthenticationForCopy } from "@/lib/utils/blueprint-format";
import type { AuthenticationStrategy } from "@/types/blueprint";

type AuthenticationCardProps = {
  authentication: AuthenticationStrategy;
};

export function AuthenticationCard({ authentication }: AuthenticationCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Authentication</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          {authentication.approach}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatAuthenticationForCopy(authentication)}
            label="Copy auth"
          />
          <Badge variant="outline">11</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {authentication.rationale}
        </p>
        <Separator />
        <div className="flex flex-col gap-3">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Implementation
          </p>
          <ul className="flex flex-col gap-2">
            {authentication.implementation.map((step) => (
              <li key={step} className="text-sm leading-relaxed">
                · {step}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
