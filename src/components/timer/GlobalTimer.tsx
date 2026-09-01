"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { TimerNotePopover } from "@/components/timer/TimerNotePopover";
import { ChevronRight, Loader2, MessageSquareText, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OPEN_TIMER_NOTE_EVENT } from "@/lib/timer-events";
import { formatHours } from "@/lib/format";

export function GlobalTimer() {
  const { activeTimer, currentDuration, stopTimer, refreshTimer } = useTimer();
  const router = useRouter();
  const pathname = usePathname();
  const isStoppingRef = useRef(false); // Prevent multiple simultaneous stop calls
  const [isStopping, setIsStopping] = useState(false); // For UI disabled state
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [timerDescription, setTimerDescription] = useState("");

  // Hide timer on task detail pages
  const isTaskDetailPage = Boolean(
    pathname?.match(/^\/tasks\/[^/]+$/) || pathname?.match(/^\/projects\/[^/]+\/tasks\/[^/]+$/)
  );

  useEffect(() => {
    setTimerDescription(activeTimer?.description || "");
  }, [activeTimer?.description, activeTimer?.id]);

  useEffect(() => {
    const handleOpenTimerNote = () => setIsNoteOpen(true);

    window.addEventListener(OPEN_TIMER_NOTE_EVENT, handleOpenTimerNote);
    return () => window.removeEventListener(OPEN_TIMER_NOTE_EVENT, handleOpenTimerNote);
  }, []);

  useEffect(() => {
    if (isTaskDetailPage) {
      setIsNoteOpen(false);
    }
  }, [isTaskDetailPage]);

  if (!activeTimer || isTaskDetailPage) {
    return null;
  }

  const handleStop = async () => {
    // Prevent multiple simultaneous calls
    if (isStoppingRef.current || isStopping) {
      return;
    }

    if (!activeTimer) {
      await stopTimer();
      setIsNoteOpen(false);
      return;
    }

    // Set flags to prevent duplicate calls
    isStoppingRef.current = true;
    setIsStopping(true);

    // Vypočítať trvanie priamo z activeTimer.started_at namiesto currentDuration
    // aby sme zabezpečili správnu hodnotu aj keď sa timer už zastavil
    const startedAt = new Date(activeTimer.started_at);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    const taskName = activeTimer.task_name;

    try {
      // Volať stopTimer z kontextu, ktorý automaticky uloží časový záznam a zastaví timer
      await stopTimer();
      setIsNoteOpen(false);

      // Počkáme chvíľu a refreshneme timer, aby sme sa uistili, že timer je skutočne zastavený
      await new Promise((resolve) => setTimeout(resolve, 300));
      await refreshTimer();

      toast({
        title: "Časovač zastavený",
        description: `Zapísaných ${formatHours(duration / 3600)} do úlohy "${taskName}".`,
      });
    } catch (error) {
      console.error("Failed to stop timer:", error);
      toast({
        title: "Chyba",
        description: error instanceof Error ? error.message : "Nepodarilo sa zastaviť časovač",
        variant: "destructive",
      });
      // Still try to refresh timer state even if saving failed
      await refreshTimer();
    } finally {
      // Reset flags after a short delay to allow for any cleanup
      setTimeout(() => {
        isStoppingRef.current = false;
        setIsStopping(false);
      }, 1000);
    }
  };

  const handleSaveDescription = async () => {
    const response = await fetch("/api/timers/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: timerDescription.trim() }),
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMessage = result.error || "Poznámku sa nepodarilo uložiť";
      toast({ title: "Chyba", description: errorMessage, variant: "destructive" });
      throw new Error(errorMessage);
    }

    await refreshTimer();
    toast({
      title: "Poznámka uložená",
      description: timerDescription.trim()
        ? `Čas sa trackuje ako „${timerDescription.trim()}“.`
        : "Časovač pokračuje bez poznámky.",
    });
  };

  const handleClick = () => {
    if (activeTimer.task_id && activeTimer.project_id) {
      const url = `/projects/${activeTimer.project_id}/tasks/${activeTimer.task_id}`;
      router.push(url);
    } else if (activeTimer.task_id) {
      // Task without project - go to task detail
      router.push(`/tasks/${activeTimer.task_id}`);
    }
  };

  return (
    <div className="flex h-9 min-w-0 max-w-[420px] items-center overflow-hidden rounded-lg border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
      <TimerNotePopover
        key={activeTimer.id}
        taskId={activeTimer.task_id}
        taskTitle={activeTimer.task_name}
        value={timerDescription}
        isTimerActive
        disabled={isStopping}
        open={isNoteOpen}
        onOpenChange={setIsNoteOpen}
        onValueChange={setTimerDescription}
        onSave={handleSaveDescription}
      >
        <button
          type="button"
          disabled={isStopping}
          className="flex h-full shrink-0 items-center gap-2 border-r border-border/70 px-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3"
          aria-label={`Upraviť poznámku k časovaču úlohy ${activeTimer.task_name}`}
          title={timerDescription ? `Poznámka: ${timerDescription}` : "Pridať poznámku"}
        >
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-30" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span
            className="font-mono text-[13px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums"
            aria-live="off"
          >
            {formatHours(currentDuration / 3600)}
          </span>
          {timerDescription && (
            <MessageSquareText
              className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          )}
        </button>
      </TimerNotePopover>

      <button
        type="button"
        onClick={handleClick}
        className="hidden h-full min-w-0 flex-1 items-center gap-1.5 px-3 text-left transition-colors duration-150 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex"
        aria-label={`Otvoriť úlohu ${activeTimer.task_name}`}
      >
        {activeTimer.project_name && (
          <>
            <span className="hidden max-w-[110px] truncate text-xs font-medium text-muted-foreground lg:inline">
              {activeTimer.project_name}
            </span>
            <ChevronRight
              className="hidden h-3 w-3 shrink-0 text-muted-foreground/60 lg:block"
              aria-hidden="true"
            />
          </>
        )}
        <span className="min-w-0 truncate text-xs font-medium text-foreground sm:max-w-[120px] xl:max-w-[170px]">
          {activeTimer.task_name}
        </span>
      </button>

      <div className="flex shrink-0 items-center px-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={handleStop}
          disabled={isStopping}
          className="h-7 w-7 rounded-md text-destructive transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          title="Zastaviť časovač"
          aria-label="Zastaviť časovač"
        >
          {isStopping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Square className="h-3 w-3 fill-current" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
