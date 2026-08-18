"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  BotIcon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { sendBluebotMessage } from "@/lib/api/bluebot-chat";
import type {
  BluebotChanges,
  BluebotMessage,
  BluebotResponse,
} from "@/lib/schemas/bluebot";
import {
  BLUEPRINT_SECTION_LABELS,
  scrollToBlueprintSection,
} from "@/lib/utils/blueprint-sections";
import type { Blueprint } from "@/types/blueprint";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Explain my architecture",
  "Find weaknesses in my plan",
  "Improve my tech stack",
  "What should I build first?",
  "Change something",
] as const;

const WELCOME_MESSAGE = `Hi, I'm BlueBot 👋
I can help you understand, improve, or change your Blueprint.
What can I help you with?`;

type PendingModification = {
  response: BluebotResponse;
  previousBlueprint: Blueprint;
};

type BluebotProps = {
  blueprint: Blueprint;
  idea: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBlueprintChange: (blueprint: Blueprint, changes: BluebotChanges) => void;
  onUndo: () => void;
  canUndo: boolean;
};

export function Bluebot({
  blueprint,
  idea,
  open: openProp,
  onOpenChange,
  onBlueprintChange,
  onUndo,
  canUndo,
}: BluebotProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  function setOpen(nextOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  }
  const [messages, setMessages] = useState<BluebotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingModification, setPendingModification] =
    useState<PendingModification | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, messages, loading, pendingModification, scrollToBottom]);

  async function handleSend(
    messageText?: string,
    historyOverride?: BluebotMessage[],
  ) {
    const trimmed = (messageText ?? input).trim();
    if (!trimmed || loading) {
      return;
    }

    const history = historyOverride ?? messages;

    setShowWelcome(false);
    setError(null);
    setInput("");
    setLoading(true);

    const userMessage: BluebotMessage = { role: "user", content: trimmed };
    const nextMessages = [...history, userMessage];
    setMessages(nextMessages);

    try {
      const response = await sendBluebotMessage({
        blueprint,
        messages: history,
        userMessage: trimmed,
      });

      const assistantMessage: BluebotMessage = {
        role: "assistant",
        content: response.message,
      };
      setMessages([...nextMessages, assistantMessage]);

      if (response.modifiesBlueprint && response.blueprint && response.changes) {
        setPendingModification({
          response,
          previousBlueprint: blueprint,
        });
      }
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "BlueBot could not complete your request.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleApplyChanges() {
    if (
      !pendingModification?.response.blueprint ||
      !pendingModification.response.changes
    ) {
      return;
    }

    onBlueprintChange(
      pendingModification.response.blueprint,
      pendingModification.response.changes,
    );
    setPendingModification(null);
  }

  function handleDiscardChanges() {
    setPendingModification(null);
  }

  function handleRetry() {
    setError(null);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) {
      const history = messages.slice(0, -1);
      setMessages(history);
      void handleSend(lastUser.content, history);
    }
  }

  function handleSuggestedPrompt(prompt: string) {
    void handleSend(prompt);
  }

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      {!open ? (
        <button
          type="button"
          id="bluebot-fab"
          aria-label="Open BlueBot assistant"
          aria-expanded={open}
          aria-haspopup="dialog"
          data-bluebot-fab="true"
          onClick={() => setOpen(true)}
          className="bluebot-fab"
        >
          <SparklesIcon className="size-4 shrink-0 text-cyan-700" aria-hidden />
          <span>BlueBot</span>
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close BlueBot"
              className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="BlueBot assistant"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
              className={cn(
                "fixed z-[70] flex flex-col border-l border-white/12 shadow-[-24px_0_48px_-24px_oklch(0_0_0_/_55%)]",
                "glass-surface-strong inset-y-0 right-0 w-full max-w-md",
                "pb-[env(safe-area-inset-bottom)]",
              )}
            >
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <BotIcon className="size-5 shrink-0 text-cyan-300" aria-hidden />
                    <h2 className="font-heading text-lg font-medium">BlueBot</h2>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Your Blueprint assistant — ask questions or request changes.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close BlueBot panel"
                  onClick={() => setOpen(false)}
                >
                  <XIcon />
                </Button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5"
                  aria-live="polite"
                  aria-busy={loading}
                >
                  {showWelcome && messages.length === 0 ? (
                    <div className="glass-surface rounded-2xl border border-white/10 p-4">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {WELCOME_MESSAGE}
                      </p>
                    </div>
                  ) : null}

                  {showWelcome && messages.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
                        Suggested prompts
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_PROMPTS.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => handleSuggestedPrompt(prompt)}
                            disabled={loading}
                            className="glass-chip rounded-full border border-white/12 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-cyan-300/30 hover:bg-white/8 disabled:opacity-50"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {messages.map((message, index) => (
                    <ChatBubble key={`${message.role}-${index}`} message={message} />
                  ))}

                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      BlueBot is thinking…
                    </div>
                  ) : null}

                  {error ? (
                    <div className="glass-surface rounded-2xl border border-destructive/30 p-4">
                      <p className="text-sm text-destructive">{error}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={handleRetry}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : null}

                  {pendingModification?.response.changes ? (
                    <PendingChangesCard
                      changes={pendingModification.response.changes}
                      message={pendingModification.response.message}
                      onApply={handleApplyChanges}
                      onDiscard={handleDiscardChanges}
                    />
                  ) : null}

                  <div ref={messagesEndRef} />
                </div>

                {canUndo ? (
                  <div className="shrink-0 border-t border-white/10 px-4 py-2 sm:px-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onUndo}
                      className="text-muted-foreground"
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      Undo last change
                    </Button>
                  </div>
                ) : null}

                <form
                  className="shrink-0 border-t border-white/10 p-4 sm:p-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSend();
                  }}
                >
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={inputRef}
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void handleSend();
                        }
                      }}
                      placeholder="Ask about or change your Blueprint…"
                      disabled={loading}
                      rows={2}
                      aria-label="Message BlueBot"
                      className="min-h-11 resize-none"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Send message"
                      disabled={loading || !input.trim()}
                    >
                      <SendIcon />
                    </Button>
                  </div>
                  {idea ? (
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      Context: {idea}
                    </p>
                  ) : null}
                </form>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}

function ChatBubble({ message }: { message: BluebotMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "ml-auto border border-cyan-400/20 bg-cyan-400/10 text-foreground"
          : "glass-surface border border-white/10 text-foreground",
      )}
    >
      <p className="font-mono text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
        {isUser ? "You" : "BlueBot"}
      </p>
      <p className="mt-1 whitespace-pre-line">{message.content}</p>
    </div>
  );
}

function PendingChangesCard({
  changes,
  message,
  onApply,
  onDiscard,
}: {
  changes: BluebotChanges;
  message: string;
  onApply: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="glass-surface rounded-2xl border border-cyan-400/25 p-4">
      <p className="text-sm leading-relaxed">{message}</p>
      <p className="mt-3 font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
        Will affect
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {changes.changedSections.map((section) => (
          <li key={section}>
            <button
              type="button"
              onClick={() => scrollToBlueprintSection(section)}
              className="text-left text-sm text-cyan-300/90 underline-offset-2 hover:underline"
            >
              {BLUEPRINT_SECTION_LABELS[section]}
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onApply}>
          Apply changes
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
