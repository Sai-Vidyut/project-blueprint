import { LayersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground [&_svg]:size-4">
            <LayersIcon />
          </span>
          <div className="flex flex-col">
            <span className="font-heading text-sm tracking-tight sm:text-base">
              Project BluePrint
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Idea to implementation plan
            </span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">Early access</Badge>
      </div>
    </header>
  );
}
