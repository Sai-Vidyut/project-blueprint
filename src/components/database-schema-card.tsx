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
import { formatDatabaseSchemaForCopy } from "@/lib/utils/blueprint-format";
import type { DatabaseTable } from "@/types/blueprint";

type DatabaseSchemaCardProps = {
  databaseSchema: DatabaseTable[];
};

export function DatabaseSchemaCard({ databaseSchema }: DatabaseSchemaCardProps) {
  return (
    <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="border-b">
        <CardTitle className="text-2xl sm:text-3xl">Database schema</CardTitle>
        <CardDescription className="text-base sm:text-lg">
          Core tables and columns
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <CopyButton
            text={formatDatabaseSchemaForCopy(databaseSchema)}
            label="Copy schema"
          />
          <Badge variant="outline">09</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col">
          {databaseSchema.map((table, index) => (
            <li key={table.name} className="flex flex-col gap-3">
              {index > 0 ? <Separator className="my-6" /> : null}
              <div className="flex flex-col gap-1">
                <p className="font-mono text-lg font-medium">{table.name}</p>
                <p className="text-sm text-muted-foreground">{table.description}</p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="px-3 py-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                        Column
                      </th>
                      <th className="px-3 py-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                        Type
                      </th>
                      <th className="px-3 py-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                        Constraints
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.columns.map((column) => (
                      <tr key={column.name} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono">{column.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{column.type}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {column.constraints ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.relationships?.length ? (
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {table.relationships.map((relation) => (
                    <li key={relation}>· {relation}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
