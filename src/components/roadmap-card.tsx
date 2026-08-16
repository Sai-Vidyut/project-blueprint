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

type RoadmapCardProps = {
  roadmap: Roadmap;
};

export function RoadmapCard({ roadmap }: RoadmapCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Roadmap</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          {roadmap.length} weeks of focused delivery
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatRoadmapForCopy(roadmap)}
            label="Copy roadmap"
          />
          <Badge variant="outline">14</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col">
          {roadmap.map((week, weekIndex) => {
            const isLastWeek = weekIndex === roadmap.length - 1;

            return (
              <li key={`${week.theme}-${weekIndex}`} className="flex gap-5 sm:gap-8">
                <div className="flex flex-col items-center">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 font-mono text-sm">
                    {weekIndex + 1}
                  </div>
                  {!isLastWeek ? (
                    <div className="my-3 w-px flex-1 bg-border" />
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-5 pb-10 last:pb-0">
                  <div className="flex flex-col gap-1">
                    <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
                      Week {weekIndex + 1}
                    </p>
                    <p className="font-heading text-xl tracking-tight sm:text-2xl">
                      {week.theme}
                    </p>
                  </div>

                  <ul className="flex flex-wrap gap-2">
                    {week.goals.map((goal) => (
                      <li key={goal}>
                        <Badge variant="secondary" className="font-normal">
                          {goal}
                        </Badge>
                      </li>
                    ))}
                  </ul>

                  <ul className="flex flex-col gap-0 border-l border-border">
                    {week.tasks.map((task, taskIndex) => {
                      const isLastTask = taskIndex === week.tasks.length - 1;

                      return (
                        <li
                          key={task.task}
                          className="relative flex flex-col gap-1 py-3 pl-6 text-base leading-relaxed sm:text-lg"
                        >
                          <span
                            className="absolute top-[1.35rem] left-0 h-px w-4 bg-border"
                            aria-hidden="true"
                          />
                          <span className="flex gap-4">
                            <span className="font-mono text-sm text-muted-foreground">
                              {isLastTask ? "└" : "├"}
                            </span>
                            <span className="text-pretty">{task.task}</span>
                          </span>
                          <span className="pl-9 text-sm text-muted-foreground">
                            → {task.deliverable}
                          </span>
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
