import { MailIcon } from "lucide-react";

import { AppBackdrop } from "@/components/app-backdrop";
import { SiteHeader } from "@/components/site-header";
import { GitHubMark, InstagramMark, LinkedInMark } from "@/components/social-marks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEVELOPER_EMAIL,
  DEVELOPER_NAME,
  DEVELOPER_SOCIALS,
} from "@/lib/constants/developer";

const SOCIAL_ICONS = {
  GitHub: GitHubMark,
  Instagram: InstagramMark,
  LinkedIn: LinkedInMark,
} as const;

export function AboutPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppBackdrop />
      <SiteHeader showGetStarted />

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:py-20">
        <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
          About the developer
        </p>
        <h1 className="mt-3 w-full font-heading text-4xl font-medium tracking-tight text-pretty sm:text-5xl">
          {DEVELOPER_NAME}
        </h1>
        <div className="mt-5 flex max-w-2xl flex-col gap-4 text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          <p>
            A developer and engineering student who enjoys turning ideas into
            things that actually work. I&apos;ve built projects across software
            and hardware, and I&apos;ve learned that one of the hardest parts
            of building isn&apos;t always writing the code — it&apos;s figuring
            out what should be built in the first place.
          </p>
          <p>
            I built BluePrint to close that gap between a software idea and a
            plan you can actually implement — architecture, stack, data, and a
            four-week path, without accounts or extra product surface.
          </p>
        </div>

        <Card className="mt-10 [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
          <CardHeader className="border-b">
            <CardTitle className="text-xl sm:text-2xl">Socials</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {DEVELOPER_SOCIALS.map((link) => {
                const Icon = SOCIAL_ICONS[link.label];

                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-chip flex items-center gap-3 rounded-2xl border border-white/12 px-4 py-3 text-sm transition-colors hover:border-white/25 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      <Icon className="size-4" />
                      <span className="font-medium">{link.label}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {displayHost(link.href)}
                      </span>
                    </a>
                  </li>
                );
              })}
              {DEVELOPER_EMAIL ? (
                <li>
                  <a
                    href={`mailto:${DEVELOPER_EMAIL}`}
                    className="glass-chip flex items-center gap-3 rounded-2xl border border-white/12 px-4 py-3 text-sm transition-colors hover:border-white/25 hover:bg-white/8 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <MailIcon className="size-4" />
                    <span className="font-medium">Email</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">
                      {DEVELOPER_EMAIL}
                    </span>
                  </a>
                </li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function displayHost(href: string) {
  try {
    return new URL(href).host.replace(/^www\./, "");
  } catch {
    return href;
  }
}
