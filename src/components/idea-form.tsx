"use client";

import { useId, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ideaRequestSchema } from "@/lib/schemas/idea";

const IDEA_MAX_LENGTH = 2000;

type IdeaFormProps = {
  idea: string;
  onIdeaChange: (idea: string) => void;
  isGenerating?: boolean;
  onGenerate: (idea: string) => void;
};

export function IdeaForm({
  idea,
  onIdeaChange,
  isGenerating = false,
  onGenerate,
}: IdeaFormProps) {
  const ideaId = useId();
  const [issues, setIssues] = useState<Array<{ message?: string }>>([]);

  const isInvalid = issues.length > 0;

  function submitIdea() {
    if (isGenerating) {
      return;
    }

    const parsed = ideaRequestSchema.safeParse({ idea });

    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setIssues([]);
    onGenerate(parsed.data.idea);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitIdea();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submitIdea();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
        <CardContent>
          <FieldGroup>
            <Field data-disabled={isGenerating || undefined}>
              <FieldLabel htmlFor={ideaId}>Project idea</FieldLabel>
              <Textarea
                id={ideaId}
                name="idea"
                value={idea}
                onChange={(event) => {
                  onIdeaChange(event.target.value);
                  if (issues.length > 0) {
                    setIssues([]);
                  }
                }}
                onKeyDown={handleKeyDown}
                aria-invalid={isInvalid}
                disabled={isGenerating}
                maxLength={IDEA_MAX_LENGTH}
                rows={6}
                placeholder="Describe your software idea and we'll map architecture, stack, diagram, and roadmap."
                autoComplete="off"
                className="min-h-36 text-base sm:text-lg"
              />
              <FieldError errors={issues} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {idea.trim().length}/{IDEA_MAX_LENGTH}
            <span className="hidden sm:inline"> · ⌘ Enter</span>
          </p>
          <Button type="submit" size="lg" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Spinner data-icon="inline-start" />
                Building blueprint
              </>
            ) : (
              <>
                Generate Blueprint
                <ArrowUpIcon data-icon="inline-end" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
