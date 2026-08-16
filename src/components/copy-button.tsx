"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className,
  variant = "outline",
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      aria-label={copied ? copiedLabel : label}
      className={cn("w-fit", className)}
    >
      {copied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
