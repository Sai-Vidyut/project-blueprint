import { CheckIcon, XIcon } from "lucide-react";

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
import { formatMvpScopeForCopy } from "@/lib/utils/blueprint-format";
import type { MvpScope } from "@/types/blueprint";

type MvpScopeCardProps = {
  mvpScope: MvpScope;
};

export function MvpScopeCard({ mvpScope }: MvpScopeCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">MVP scope</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          What ships first, what waits
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatMvpScopeForCopy(mvpScope)}
            label="Copy scope"
          />
          <Badge variant="outline">07</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              In scope
            </p>
            <ul className="flex flex-col gap-3">
              {mvpScope.inScope.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              Out of scope
            </p>
            <ul className="flex flex-col gap-3">
              {mvpScope.outOfScope.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <XIcon className="mt-0.5 size-4 shrink-0" />
                  <span className="text-pretty">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
