"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DraftingCompassIcon } from "lucide-react";

import { GitHubMark, InstagramMark, LinkedInMark } from "@/components/social-marks";
import { buttonVariants } from "@/components/ui/button";
import { DEVELOPER_NAME, DEVELOPER_SOCIALS } from "@/lib/constants/developer";
import { cn } from "@/lib/utils";

const SOCIAL_ICONS = {
  GitHub: GitHubMark,
  Instagram: InstagramMark,
  LinkedIn: LinkedInMark,
} as const;

type SiteHeaderProps = {
  showGetStarted?: boolean;
};

export function SiteHeader({ showGetStarted = false }: SiteHeaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const lastScrollRef = useRef(0);

  useEffect(() => {
    lastScrollRef.current = window.scrollY;

    function onScroll(event: Event) {
      const y = readScrollTop(event.target);
      const last = lastScrollRef.current;
      const delta = y - last;
      lastScrollRef.current = y;

      if (y <= 16) {
        setCollapsed(false);
        return;
      }

      if (delta > 6) {
        setCollapsed(true);
      } else if (delta < -6) {
        setCollapsed(false);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "glass-header sticky top-0 z-10 shrink-0 border-b border-white/10 transition-transform duration-300 ease-out motion-reduce:transition-none",
        collapsed && "pointer-events-none -translate-y-full",
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0_/_20%)] [&_svg]:size-4">
            <DraftingCompassIcon />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-heading text-sm tracking-tight sm:text-base">
              BluePrint
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              Architecture to go
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {showGetStarted ? (
            <Link
              href="/create"
              className={cn(buttonVariants({ size: "sm" }), "h-8 px-3")}
            >
              Get Started
            </Link>
          ) : null}
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] leading-none text-muted-foreground uppercase sm:text-xs">
              {DEVELOPER_NAME}
            </p>
            <nav aria-label={`${DEVELOPER_NAME} on social media`} className="flex items-center gap-2">
              {DEVELOPER_SOCIALS.map((link) => {
                const Icon = SOCIAL_ICONS[link.label];

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <Icon />
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function readScrollTop(target: EventTarget | null): number {
  if (target instanceof HTMLElement) {
    return target.scrollTop;
  }

  return window.scrollY;
}
