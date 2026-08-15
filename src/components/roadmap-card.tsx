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
import { formatRoadmapForCopy } from "@/lib/utils/blueprint-format";
import type { Roadmap } from "@/types/blueprint";

const WEEK_ROWS: Array<{ key: keyof Roadmap; label: string }> = [
  { key: "week1", label: "Week 1" },
  { key: "week2", label: "Week 2" },
  { key: "week3", label: "Week 3" },
  { key: "week4", label: "Week 4" },
];

type RoadmapCardProps = {
  roadmap: Roadmap;
};

export function RoadmapCard({ roadmap }: RoadmapCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Roadmap</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Four weeks of focused delivery
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatRoadmapForCopy(roadmap)}
            label="Copy roadmap"
          />
          <Badge variant="outline">04</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {WEEK_ROWS.map((week, weekIndex) => {
            const tasks = roadmap[week.key];
            const isLastWeek = weekIndex === WEEK_ROWS.length - 1;

            return (
              <li key={week.key} className="flex gap-5 sm:gap-8">
                <div className="flex flex-col items-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted font-mono text-sm">
                    {weekIndex + 1}
                  </div>
                  {!isLastWeek ? (
                    <div className="my-3 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-5 pb-10 last:pb-0">
                  <p className="font-heading text-xl tracking-tight sm:text-2xl">
                    {week.label}
                  </p>
                  <ul className="flex flex-col gap-0 border-l border-border">
                    {tasks.map((task, taskIndex) => {
                      const isLastTask = taskIndex === tasks.length - 1;

                      return (
                        <li
                          key={task}
                          className="relative flex gap-4 py-3 pl-6 text-base leading-relaxed sm:text-lg"
                        >
                          <span
                            className="absolute top-[1.35rem] left-0 h-px w-4 bg-border"
                            aria-hidden="true"
                          />
                          <span className="font-mono text-sm text-muted-foreground">
                            {isLastTask ? "└" : "├"}
                          </span>
                          <span className="text-pretty">{task}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
