import { CopyButton } from "@/components/copy-button";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDiagramForCopy } from "@/lib/utils/blueprint-format";

type DiagramCardProps = {
  diagram: string;
};

export function DiagramCard({ diagram }: DiagramCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">System diagram</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Architecture at a glance
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatDiagramForCopy(diagram)}
            label="Copy diagram"
          />
          <Badge variant="outline">01</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <MermaidDiagram source={diagram} />
      </CardContent>
    </Card>
  );
}
