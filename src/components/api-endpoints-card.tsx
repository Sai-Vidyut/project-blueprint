import { LockIcon } from "lucide-react";

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
import { cn } from "@/lib/utils/index";
import { formatApiEndpointsForCopy } from "@/lib/utils/blueprint-format";
import type { ApiEndpoint } from "@/types/blueprint";

type ApiEndpointsCardProps = {
  apiEndpoints: ApiEndpoint[];
};

const METHOD_STYLES: Record<ApiEndpoint["method"], string> = {
  GET: "text-emerald-600 dark:text-emerald-400",
  POST: "text-blue-600 dark:text-blue-400",
  PUT: "text-amber-600 dark:text-amber-400",
  PATCH: "text-amber-600 dark:text-amber-400",
  DELETE: "text-red-600 dark:text-red-400",
};

export function ApiEndpointsCard({ apiEndpoints }: ApiEndpointsCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">API endpoints</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Routes a developer can scaffold directly
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatApiEndpointsForCopy(apiEndpoints)}
            label="Copy endpoints"
          />
          <Badge variant="outline">10</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y">
          {apiEndpoints.map((endpoint) => (
            <li
              key={`${endpoint.method}-${endpoint.path}`}
              className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                <span className={cn("font-semibold", METHOD_STYLES[endpoint.method])}>
                  {endpoint.method}
                </span>
                <span>{endpoint.path}</span>
                {endpoint.authRequired ? (
                  <LockIcon className="size-3.5 text-muted-foreground" />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{endpoint.description}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
