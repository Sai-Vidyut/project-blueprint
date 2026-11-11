"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Bluebot } from "@/components/bluebot";
import type { BluebotChanges } from "@/lib/schemas/bluebot";
import type { Blueprint } from "@/types/blueprint";

export type BluebotPageContext = {
  idea?: string;
  blueprint?: Blueprint | null;
  onBlueprintChange?: (blueprint: Blueprint, changes: BluebotChanges) => void;
  onUndo?: () => void;
  canUndo?: boolean;
};

type BluebotContextValue = {
  pageContext: BluebotPageContext;
  setPageContext: (context: BluebotPageContext) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  openBluebot: () => void;
};

const BluebotContext = createContext<BluebotContextValue | null>(null);

export function BluebotProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContext] = useState<BluebotPageContext>({});
  const [open, setOpen] = useState(false);

  const openBluebot = useCallback(() => {
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      pageContext,
      setPageContext,
      open,
      setOpen,
      openBluebot,
    }),
    [pageContext, open, openBluebot],
  );

  return (
    <BluebotContext.Provider value={value}>
      {children}
      <Bluebot
        idea={pageContext.idea}
        blueprint={pageContext.blueprint ?? undefined}
        open={open}
        onOpenChange={setOpen}
        onBlueprintChange={pageContext.onBlueprintChange}
        onUndo={pageContext.onUndo}
        canUndo={pageContext.canUndo ?? false}
      />
    </BluebotContext.Provider>
  );
}

export function useBluebot() {
  const context = useContext(BluebotContext);
  if (!context) {
    throw new Error("useBluebot must be used within BluebotProvider");
  }
  return context;
}

/** Register page-specific idea/blueprint context for BlueBot. */
export function useRegisterBluebotContext(context: BluebotPageContext) {
  const { setPageContext } = useBluebot();
  const {
    idea,
    blueprint,
    canUndo,
    onBlueprintChange,
    onUndo,
  } = context;

  useEffect(() => {
    setPageContext(context);
    return () => {
      setPageContext({});
    };
  }, [
    idea,
    blueprint,
    canUndo,
    onBlueprintChange,
    onUndo,
    setPageContext,
    context,
  ]);
}
