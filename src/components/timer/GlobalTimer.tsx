"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useRef, useState } from "react";

export function GlobalTimer() {
  const { activeTimer, currentDuration, stopTimer, refreshTimer } = useTimer();
  const router = useRouter();
  const pathname = usePathname();
  const isStoppingRef = useRef(false); // Prevent multiple simultaneous stop calls
  const [isStopping, setIsStopping] = useState(false); // For UI disabled state

  // Hide timer on task detail pages
  const isTaskDetailPage = pathname?.match(/^\/tasks\/[^/]+$/) || pathname?.match(/^\/projects\/[^/]+\/tasks\/[^/]+$/);

  if (!activeTimer || isTaskDetailPage) {
    return null;
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    // Prevent multiple simultaneous calls
    if (isStoppingRef.current || isStopping) {
      return;
    }

    if (!activeTimer) {
      await stopTimer();
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
      
      // Počkáme chvíľu a refreshneme timer, aby sme sa uistili, že timer je skutočne zastavený
      await new Promise(resolve => setTimeout(resolve, 300));
      await refreshTimer();
      
      toast({
        title: "Časovač zastavený",
        description: `Zapísaných ${formatTime(duration)} do úlohy "${taskName}".`,
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
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-border/70 px-2.5 sm:px-3">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-30" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span
          className="font-mono text-[13px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums"
          aria-live="off"
        >
          {formatTime(currentDuration)}
        </span>
      </div>

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
            <ChevronRight className="hidden h-3 w-3 shrink-0 text-muted-foreground/60 lg:block" aria-hidden="true" />
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
