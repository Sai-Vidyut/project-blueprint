"use client";

import { Button } from "@/components/ui/button";

type AiOutageStateProps = {
  onRetry?: () => void;
};

export function AiOutageState({ onRetry }: AiOutageStateProps) {
  return (
    <section
      aria-labelledby="outage-heading"
      className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="outage-glow pointer-events-none absolute inset-x-[8%] top-[18%] h-[42%] rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.62_0.12_264_/_18%),transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="outage-field-grid pointer-events-none absolute inset-0"
      />

      <div className="relative m-auto flex w-full flex-col items-center text-center">
        <div className="relative mb-2 w-full sm:mb-1">
          <p className="pointer-events-none font-heading text-[clamp(4.75rem,18vw,10.5rem)] leading-none font-medium tracking-[-0.08em] text-foreground/10 select-none">
            404
          </p>
          <div className="relative mx-auto -mt-[clamp(2.75rem,10vw,6.5rem)] w-full max-w-[22rem] sm:max-w-[32rem] lg:max-w-[38rem]">
            <OutageIllustration />
          </div>
        </div>

        <div className="flex max-w-xl flex-col items-center gap-4 sm:gap-5">
          <h1
            id="outage-heading"
            className="font-heading text-[1.75rem] leading-[1.08] font-medium tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            We&apos;re currently down
          </h1>
          <p className="text-base leading-relaxed text-pretty text-foreground/80 sm:text-lg">
            Looks like our AI decided to take a little break.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
            All available AI helpers are currently unavailable.
            <br className="hidden sm:block" /> Try again in a moment.
          </p>
        </div>

        {onRetry ? (
          <Button
            type="button"
            size="lg"
            onClick={onRetry}
            className="mt-8 min-h-11 px-6 sm:mt-10"
          >
            Try Again
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function OutageIllustration() {
  return (
    <svg
      role="img"
      aria-label="A blueprint sheet interrupted while an AI robot takes a coffee break"
      viewBox="0 0 720 460"
      className="h-auto w-full"
    >
      <defs>
        <pattern
          id="outage-grid"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M18 0H0V18"
            fill="none"
            stroke="oklch(0.78 0.04 250 / 0.18)"
            strokeWidth="0.8"
          />
        </pattern>
        <linearGradient id="outage-sheet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.28 0.03 264 / 0.72)" />
          <stop offset="100%" stopColor="oklch(0.2 0.025 268 / 0.55)" />
        </linearGradient>
      </defs>

      <g transform="rotate(-3 360 230)">
        <rect
          x="86"
          y="54"
          width="548"
          height="352"
          rx="6"
          fill="url(#outage-sheet)"
          stroke="oklch(1 0 0 / 16%)"
          strokeWidth="1.4"
        />
        <rect
          x="86"
          y="54"
          width="548"
          height="352"
          rx="6"
          fill="url(#outage-grid)"
        />
        <rect
          x="98"
          y="66"
          width="524"
          height="328"
          rx="3"
          fill="none"
          stroke="oklch(0.78 0.06 230 / 0.28)"
          strokeWidth="1"
        />

        <g
          fill="none"
          stroke="oklch(0.82 0.05 220 / 0.42)"
          strokeWidth="1.15"
          strokeLinecap="square"
        >
          <path d="M132 118h92v64H132z" />
          <path d="M224 118h156v118H224z" />
          <path d="M380 118h164v78H380z" />
          <path d="M132 182h92v120H132z" />
          <path d="M380 196h78v106h-78z" />
          <path d="M458 196h86v54H458z" />
          <path d="M224 236h72v66h-72z" />
        </g>

        <g
          fill="none"
          stroke="oklch(0.8 0.04 230 / 0.3)"
          strokeWidth="0.9"
        >
          <path d="M132 118V102m92 16V102M132 102h92" />
          <path d="M380 118V102m164 16V102M380 102h164" />
          <path d="M116 182H100m16 120H100M100 182v120" />
        </g>
        <g
          fill="oklch(0.78 0.04 220 / 0.55)"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="9"
        >
          <text x="164" y="98">
            12.4
          </text>
          <text x="448" y="98">
            18.0
          </text>
          <text x="78" y="248" transform="rotate(-90 78 248)">
            9.6
          </text>
        </g>

        <path
          className="outage-dash"
          d="M224 177h52c18 0 22 22 40 22h64"
          fill="none"
          stroke="oklch(0.72 0.08 250 / 0.55)"
          strokeWidth="1.4"
          strokeLinecap="round"
        />

        <g
          fill="none"
          stroke="oklch(1 0 0 / 14%)"
          strokeWidth="0.8"
        >
          <path d="M110 66v328M610 66v328" />
          <path d="M98 78h524M98 382h524" />
        </g>

        <g fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
          <rect
            x="470"
            y="328"
            width="140"
            height="50"
            fill="oklch(0.18 0.02 264 / 0.55)"
            stroke="oklch(1 0 0 / 16%)"
          />
          <text
            x="482"
            y="348"
            fill="oklch(0.86 0.02 230 / 0.7)"
            fontSize="8"
            letterSpacing="1.4"
          >
            BLUEPRINT
          </text>
          <text
            x="482"
            y="364"
            fill="oklch(0.72 0.02 230 / 0.55)"
            fontSize="8"
          >
            SHEET 01 · PAUSED
          </text>
        </g>

        <g transform="rotate(-14 160 340)">
          <circle
            cx="160"
            cy="340"
            r="34"
            fill="oklch(0.7 0.14 22 / 0.12)"
            stroke="oklch(0.78 0.12 22 / 0.45)"
            strokeWidth="1.6"
            strokeDasharray="4 3"
          />
          <text
            x="160"
            y="346"
            textAnchor="middle"
            fill="oklch(0.82 0.1 22 / 0.85)"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="16"
            fontWeight="700"
            letterSpacing="1"
          >
            404
          </text>
        </g>
      </g>

      <g className="outage-bob">
        <g transform="translate(318 188)">
          <ellipse
            cx="46"
            cy="122"
            rx="38"
            ry="8"
            fill="oklch(0.12 0.02 264 / 0.35)"
          />
          <rect
            x="22"
            y="58"
            width="48"
            height="52"
            rx="16"
            fill="oklch(0.72 0.07 250 / 0.55)"
            stroke="oklch(1 0 0 / 22%)"
          />
          <circle
            cx="46"
            cy="42"
            r="22"
            fill="oklch(0.78 0.06 250 / 0.62)"
            stroke="oklch(1 0 0 / 22%)"
          />
          <circle cx="38" cy="42" r="3.2" fill="oklch(0.2 0.02 260)" />
          <circle cx="54" cy="42" r="3.2" fill="oklch(0.2 0.02 260)" />
          <path
            d="M38 52c3 3.4 13 3.4 16 0"
            fill="none"
            stroke="oklch(0.22 0.02 260)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M46 20V10"
            fill="none"
            stroke="oklch(1 0 0 / 35%)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="46" cy="8" r="3.2" fill="oklch(0.78 0.1 210 / 0.7)" />
          <path
            d="M22 72c-16 6-22 22-14 34"
            fill="none"
            stroke="oklch(0.78 0.05 250 / 0.55)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M70 74c18 4 28 2 34-8"
            fill="none"
            stroke="oklch(0.78 0.05 250 / 0.55)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          <g transform="translate(98 52)">
            <path
              d="M4 22h22v16H4z"
              fill="oklch(0.78 0.08 70 / 0.72)"
              stroke="oklch(1 0 0 / 18%)"
            />
            <path
              d="M26 28h8v6h-8"
              fill="none"
              stroke="oklch(1 0 0 / 28%)"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <ellipse
              cx="15"
              cy="22"
              rx="11"
              ry="4"
              fill="oklch(0.86 0.06 85 / 0.55)"
            />
            <path
              className="outage-steam"
              d="M10 18c0-8 6-8 6-16"
              fill="none"
              stroke="oklch(1 0 0 / 28%)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              className="outage-steam outage-steam-delay"
              d="M18 18c2-8-3-9 1-16"
              fill="none"
              stroke="oklch(1 0 0 / 22%)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
