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
import { Separator } from "@/components/ui/separator";
import { formatTargetUsersForCopy } from "@/lib/utils/blueprint-format";
import type { TargetUser } from "@/types/blueprint";

type TargetUsersCardProps = {
  targetUsers: TargetUser[];
};

export function TargetUsersCard({ targetUsers }: TargetUsersCardProps) {
  return (
    <Card className="h-full [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Target users</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Who this is built for
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatTargetUsersForCopy(targetUsers)}
            label="Copy users"
          />
          <Badge variant="outline">05</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {targetUsers.map((user, index) => (
            <li key={user.persona} className="flex flex-col">
              {index > 0 ? <Separator className="my-4" /> : null}
              <p className="font-medium">{user.persona}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {user.description}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
