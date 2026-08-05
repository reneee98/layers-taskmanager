"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  Clock3,
  History,
  Loader2,
  MessageSquareText,
  Play,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimerNoteSuggestion {
  value: string;
  count: number;
  lastUsedAt: string | null;
}

interface TimerNoteSuggestions {
  task: TimerNoteSuggestion[];
  frequent: TimerNoteSuggestion[];
}

interface TimerNotePopoverProps {
  taskId: string;
  taskTitle: string;
  value: string;
  isTimerActive: boolean;
  disabled: boolean;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onValueChange: (value: string) => void;
  onStart?: () => Promise<void>;
  onSave: () => Promise<void>;
}

const normalizeSearchValue = (value: string) =>
  value.trim().normalize("NFKC").toLocaleLowerCase("sk");

export const TimerNotePopover = ({
  taskId,
  taskTitle,
  value,
  isTimerActive,
  disabled,
  children,
  open,
  onOpenChange,
  onValueChange,
  onStart,
  onSave,
}: TimerNotePopoverProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [suggestions, setSuggestions] = useState<TimerNoteSuggestions>({
    task: [],
    frequent: [],
  });
  const isOpen = open ?? internalOpen;

  const searchValue = normalizeSearchValue(value);
  const filteredSuggestions = useMemo(() => {
    const filterGroup = (items: TimerNoteSuggestion[]) => {
      if (!searchValue) return items;

      return items.filter((item) => normalizeSearchValue(item.value).includes(searchValue));
    };

    return {
      task: filterGroup(suggestions.task),
      frequent: filterGroup(suggestions.frequent),
    };
  }, [searchValue, suggestions]);

  const loadSuggestions = useCallback(async () => {
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch(
        `/api/time-entries/suggestions?task_id=${encodeURIComponent(taskId)}`
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Nepodarilo sa načítať návrhy");
      }

      setSuggestions(result.data);
      setHasLoaded(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Nepodarilo sa načítať návrhy");
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading, taskId]);

  useEffect(() => {
    setHasLoaded(false);
    setLoadError("");
    setSuggestions({ task: [], frequent: [] });
  }, [taskId]);

  useEffect(() => {
    if (isOpen) {
      void loadSuggestions();
    }
  }, [isOpen, loadSuggestions]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const handleSubmit = async () => {
    if (isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      if (isTimerActive) {
        await onSave();
      } else if (onStart) {
        await onStart();
      }
      handleOpenChange(false);
    } catch {
      // The caller owns the error message; keep the popover open for correction or retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSuggestionGroup = (
    label: string,
    items: TimerNoteSuggestion[],
    icon: "history" | "frequent"
  ) => {
    if (items.length === 0) return null;

    const GroupIcon = icon === "history" ? History : Sparkles;

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <GroupIcon className="h-3 w-3" />
          {label}
        </div>
        <div className="space-y-0.5">
          {items.map((suggestion) => {
            const isSelected =
              normalizeSearchValue(suggestion.value) === normalizeSearchValue(value);

            return (
              <button
                key={`${icon}-${normalizeSearchValue(suggestion.value)}`}
                type="button"
                onClick={() => onValueChange(suggestion.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30",
                  isSelected && "bg-emerald-500/[0.08] text-emerald-700 dark:text-emerald-300"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{suggestion.value}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {suggestion.count}×
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const hasFilteredSuggestions =
    filteredSuggestions.task.length > 0 || filteredSuggestions.frequent.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(360px,calc(100vw-24px))] rounded-xl p-0 shadow-xl"
      >
        <div className="border-b border-border/70 bg-muted/25 px-4 py-3.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Poznámka k trackovaniu</p>
                {isTimerActive && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                    <Clock3 className="h-2.5 w-2.5" />
                    beží
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{taskTitle}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3">
          <div className="relative">
            <Input
              autoFocus
              value={value}
              maxLength={240}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSubmit();
                }
              }}
              placeholder="Napr. Grafika, konzultácia, úpravy…"
              aria-label="Poznámka k trackovaniu"
              className="h-10 pr-9"
            />
            {value && (
              <button
                type="button"
                onClick={() => onValueChange("")}
                aria-label="Vymazať poznámku"
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-3 overflow-y-auto pr-0.5">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Hľadám používané poznámky…
              </div>
            ) : loadError ? (
              <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
                {loadError}
              </p>
            ) : hasFilteredSuggestions ? (
              <>
                {renderSuggestionGroup("V tejto úlohe", filteredSuggestions.task, "history")}
                {renderSuggestionGroup(
                  "Najčastejšie vo workspace",
                  filteredSuggestions.frequent,
                  "frequent"
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center">
                <p className="text-xs font-medium text-foreground">
                  {searchValue ? "Žiadna zhodná poznámka" : "Zatiaľ bez návrhov"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Napíš novú poznámku. Po natrackovaní ju nabudúce ponúkneme.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-3 py-3">
          <p className="max-w-[160px] text-[10px] leading-4 text-muted-foreground">
            Rovnaké poznámky sa v reporte spoja.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={disabled || isSubmitting}
            onClick={() => void handleSubmit()}
            className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isTimerActive ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {isTimerActive
              ? "Uložiť poznámku"
              : value.trim()
                ? "Spustiť s poznámkou"
                : "Spustiť časovač"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
