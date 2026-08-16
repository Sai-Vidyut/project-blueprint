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
  return (
    <header className="glass-header sticky top-0 z-10 shrink-0 border-b border-white/10">
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
