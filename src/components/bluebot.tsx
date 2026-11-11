"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Loader2Icon,
  RotateCcwIcon,
  SendIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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

const PRE_BLUEPRINT_SUGGESTED_PROMPTS = [
  "Help me improve my idea",
  "What should my MVP include?",
  "Is this idea realistic?",
  "Explain how BluePrint works",
] as const;

const WITH_BLUEPRINT_SUGGESTED_PROMPTS = [
  "Explain my architecture",
  "Find weaknesses in my plan",
  "Improve my tech stack",
  "Change something in my Blueprint",
] as const;

const INPUT_PLACEHOLDER = "Ask BlueBot anything...";

type PendingModification = {
  response: BluebotResponse;
  previousBlueprint: Blueprint;
};

type BluebotProps = {
  blueprint?: Blueprint;
  idea?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBlueprintChange?: (blueprint: Blueprint, changes: BluebotChanges) => void;
  onUndo?: () => void;
  canUndo?: boolean;
};

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export function Bluebot({
  blueprint,
  idea,
  open: openProp,
  onOpenChange,
  onBlueprintChange,
  onUndo,
  canUndo = false,
}: BluebotProps) {
  const hasBlueprint = Boolean(blueprint);
  const welcomeSubtitle = hasBlueprint
    ? "I can help you understand, improve, or change your Blueprint."
    : "Tell me about your idea and I'll help you make it stronger.";
  const suggestedPrompts = hasBlueprint
    ? WITH_BLUEPRINT_SUGGESTED_PROMPTS
    : PRE_BLUEPRINT_SUGGESTED_PROMPTS;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

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
  const [inputFocused, setInputFocused] = useState(false);

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth") => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    },
    [prefersReducedMotion],
  );

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const threshold = 96;
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || !isNearBottomRef.current) {
      return;
    }

    scrollToBottom();
  }, [open, messages, loading, pendingModification, error, scrollToBottom]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 128)}px`;
  }, [input]);

  async function handleSend(
    messageText?: string,
    historyOverride?: BluebotMessage[],
  ) {
    const trimmed = (messageText ?? input).trim();
    if (!trimmed || loading) {
      return;
    }

    const history = historyOverride ?? messages;

    setError(null);
    setInput("");
    setLoading(true);
    isNearBottomRef.current = true;

    const userMessage: BluebotMessage = { role: "user", content: trimmed };
    const nextMessages = [...history, userMessage];
    setMessages(nextMessages);

    try {
      const response = await sendBluebotMessage({
        blueprint,
        idea,
        messages: history,
        userMessage: trimmed,
      });

      const assistantMessage: BluebotMessage = {
        role: "assistant",
        content: response.message,
      };
      setMessages([...nextMessages, assistantMessage]);

      if (
        blueprint &&
        response.modifiesBlueprint &&
        response.blueprint &&
        response.changes
      ) {
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
      !onBlueprintChange ||
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

  function handleClearChat() {
    setMessages([]);
    setError(null);
    setPendingModification(null);
    setInput("");
    isNearBottomRef.current = true;
  }

  const showWelcome = messages.length === 0 && !loading && !error;
  const canClearChat =
    messages.length > 0 || Boolean(error) || Boolean(pendingModification);

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
          <SparklesIcon className="size-4 shrink-0 text-cyan-300" aria-hidden />
          <span>BlueBot</span>
        </button>
      ) : null}

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close BlueBot"
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={
                prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }
              }
              onClick={() => setOpen(false)}
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="BlueBot assistant"
              initial={prefersReducedMotion ? false : { x: "100%" }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? undefined : { x: "100%" }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 36 }
              }
              className={cn(
                "bluebot-drawer fixed z-[70] flex flex-col overflow-hidden",
                "border-l border-white/12 shadow-[-24px_0_48px_-24px_oklch(0_0_0_/_55%)]",
                "glass-surface-strong inset-y-0 right-0 w-full max-sm:inset-0 max-sm:max-w-none sm:max-w-md",
                "pb-[env(safe-area-inset-bottom)]",
              )}
            >
              <header className="bluebot-drawer-header flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10 shadow-[0_0_20px_-8px_oklch(0.72_0.16_210_/_55%)]">
                    <SparklesIcon
                      className="size-4 text-cyan-300"
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-medium leading-tight sm:text-lg">
                      BlueBot
                    </h2>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      Your BluePrint assistant
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canClearChat ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Clear chat"
                      onClick={handleClearChat}
                      disabled={loading}
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close BlueBot panel"
                    onClick={() => setOpen(false)}
                  >
                    <XIcon />
                  </Button>
                </div>
              </header>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5"
                aria-live="polite"
                aria-busy={loading}
              >
                {showWelcome ? (
                  <WelcomeState
                    subtitle={welcomeSubtitle}
                    suggestedPrompts={suggestedPrompts}
                    onSelectPrompt={handleSuggestedPrompt}
                    disabled={loading}
                  />
                ) : null}

                {messages.map((message, index) => (
                  <ChatBubble
                    key={`${message.role}-${index}`}
                    message={message}
                  />
                ))}

                {loading ? <TypingIndicator /> : null}

                {error ? (
                  <ErrorCard message={error} onRetry={handleRetry} />
                ) : null}

                {pendingModification?.response.changes ? (
                  <PendingChangesCard
                    changes={pendingModification.response.changes}
                    message={pendingModification.response.message}
                    onApply={handleApplyChanges}
                    onDiscard={handleDiscardChanges}
                  />
                ) : null}

                <div ref={messagesEndRef} className="h-px shrink-0" />
              </div>

              {hasBlueprint && canUndo && onUndo ? (
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
                className={cn(
                  "bluebot-input-shell shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4",
                  inputFocused
                    ? "border-cyan-300/30 bg-white/[0.03]"
                    : "border-white/10 bg-black/10",
                )}
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSend();
                }}
              >
                <div className="relative flex items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={INPUT_PLACEHOLDER}
                    disabled={loading}
                    rows={1}
                    aria-label="Message BlueBot"
                    className={cn(
                      "bluebot-input min-h-11 w-full resize-none rounded-full",
                      "border border-white/12 bg-black/25 py-3 pl-4 pr-12 text-sm leading-relaxed",
                      "text-foreground placeholder:text-muted-foreground",
                      "focus-visible:border-cyan-300/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/25",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                    )}
                  />
                  <Button
                    type="submit"
                    size="icon-sm"
                    aria-label="Send message"
                    disabled={loading || !input.trim()}
                    className={cn(
                      "absolute right-1 bottom-1 rounded-full",
                      input.trim() && !loading
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    {loading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : (
                      <SendIcon className="size-4" />
                    )}
                  </Button>
                </div>
                {idea ? (
                  <p className="mt-2 truncate px-1 text-xs text-muted-foreground">
                    Context: {idea}
                  </p>
                ) : null}
              </form>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>,
    document.body,
  );
}

function WelcomeState({
  subtitle,
  suggestedPrompts,
  onSelectPrompt,
  disabled,
}: {
  subtitle: string;
  suggestedPrompts: readonly string[];
  onSelectPrompt: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex min-h-[min(52vh,28rem)] flex-col items-center justify-center px-2 py-6 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 shadow-[0_0_32px_-10px_oklch(0.72_0.16_210_/_50%)]">
        <SparklesIcon className="size-7 text-cyan-300" aria-hidden />
      </div>
      <h3 className="font-heading text-lg font-medium sm:text-xl">
        Hi, I&apos;m BlueBot 👋
      </h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground sm:max-w-sm sm:text-base">
        {subtitle}
      </p>
      <div className="mt-6 flex w-full max-w-sm flex-col gap-2">
        <p className="font-mono text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
          Suggested prompts
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSelectPrompt(prompt)}
              disabled={disabled}
              className="glass-chip rounded-full border border-white/12 px-3 py-1.5 text-left text-xs text-foreground transition-colors hover:border-cyan-300/30 hover:bg-white/8 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: BluebotMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="bluebot-message-in flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-tr-md border border-cyan-400/25 bg-cyan-400/12 px-4 py-3 text-sm leading-relaxed text-foreground shadow-[0_8px_24px_-16px_oklch(0.72_0.16_210_/_45%)]">
          <p className="whitespace-pre-line">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bluebot-message-in flex items-start gap-2.5">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5"
        aria-hidden
      >
        <SparklesIcon className="size-3.5 text-cyan-300" />
      </div>
      <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0_/_8%)]">
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5" aria-label="BlueBot is typing">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5"
        aria-hidden
      >
        <SparklesIcon className="size-3.5 text-cyan-300" />
      </div>
      <div className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="bluebot-typing-dot size-2 rounded-full bg-cyan-300/80" />
          <span className="bluebot-typing-dot size-2 rounded-full bg-cyan-300/80" />
          <span className="bluebot-typing-dot size-2 rounded-full bg-cyan-300/80" />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bluebot-message-in glass-surface rounded-2xl border border-destructive/30 p-4">
      <p className="text-sm text-destructive">{message}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={onRetry}
      >
        Retry
      </Button>
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
    <div className="bluebot-message-in flex items-start gap-2.5">
      <div
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/10"
        aria-hidden
      >
        <SparklesIcon className="size-3.5 text-cyan-300" />
      </div>
      <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-md border border-cyan-300/25 bg-cyan-400/8 p-4 shadow-[0_0_24px_-12px_oklch(0.72_0.16_210_/_40%)]">
        <p className="text-sm leading-relaxed">{message}</p>
        <p className="mt-3 font-mono text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
          Proposed changes
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
    </div>
  );
}
