import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { AppBackdrop } from "@/components/app-backdrop";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { GradientShimmer } from "@/components/ui/gradient-shimmer";
import { cn } from "@/lib/utils";

const PLAN_ITEMS = [
  "Target users",
  "Features",
  "MVP scope",
  "Architecture",
  "Technology",
  "Database",
  "API",
  "Deployment",
  "Risks",
  "Roadmap",
] as const;

const STEPS = [
  {
    number: "01",
    title: "Describe your idea",
    body: "Explain what you want to build — the product, who it is for, and the constraints that matter.",
  },
  {
    number: "02",
    title: "Generate a Blueprint",
    body: "BluePrint turns that idea into a structured technical plan you can inspect section by section.",
  },
  {
    number: "03",
    title: "Start building",
    body: "Use the architecture, stack, data model, and four-week roadmap as a practical starting point.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppBackdrop />
      <SiteHeader showGetStarted />

      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-16 md:py-20">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
            BluePrint
          </p>
          <GradientShimmer
            as="h1"
            gradient="twilight"
            easing="smooth"
            delay={1400}
            pauseBetween={2800}
            className="w-full font-heading text-center text-[2.25rem] leading-[1.06] font-medium tracking-tight text-pretty sm:text-5xl md:text-6xl"
          >
            Turn an app idea into a build-ready plan.
          </GradientShimmer>
          <p className="mx-auto w-full max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Describe the product. BluePrint returns a structured development
            blueprint covering the pieces you actually need to start building.
          </p>
          <ul className="flex max-w-2xl flex-wrap justify-center gap-2">
            {PLAN_ITEMS.map((item) => (
              <li
                key={item}
                className="glass-chip rounded-full border border-white/12 px-3 py-1 text-xs text-muted-foreground sm:text-sm"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/create"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 min-w-40 justify-center px-5",
              )}
            >
              Get Started
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/about"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 min-w-40 justify-center px-5",
              )}
            >
              About the Developer
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-20 grid w-full max-w-5xl gap-6 sm:mt-28 md:grid-cols-2 md:gap-8">
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                The problem
              </p>
              <CardTitle className="text-2xl sm:text-3xl">
                An idea is not a plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                Most app ideas stall because it is unclear who the product is
                for, what belongs in the MVP, which architecture fits, or how
                the first four weeks of work should be sequenced.
              </p>
            </CardContent>
          </Card>
          <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
            <CardHeader>
              <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                The approach
              </p>
              <CardTitle className="text-2xl sm:text-3xl">
                Structure before code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
                BluePrint turns the idea into a readable technical plan:
                users, scope, architecture, stack, data, APIs, deployment,
                risks, and a four-week roadmap — so you can start building
                with intent.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-20 flex flex-col gap-8 sm:mt-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
              How it works
            </p>
            <h2 className="mt-3 font-heading text-3xl font-medium tracking-tight sm:text-4xl">
              Three steps. One plan.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <Card
                key={step.number}
                className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(7)]"
              >
                <CardHeader>
                  <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">
                    {step.number}
                  </p>
                  <CardTitle className="text-xl sm:text-2xl">{step.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {step.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
