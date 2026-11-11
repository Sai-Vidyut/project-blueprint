"use client";

import type { ReactNode } from "react";

import { BluebotProvider } from "@/components/bluebot-context";

export function BluebotShell({ children }: { children: ReactNode }) {
  return <BluebotProvider>{children}</BluebotProvider>;
}
