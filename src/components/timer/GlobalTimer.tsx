"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function GlobalTimer() {
  const { activeTimer, currentDuration, stopTimer, refreshTimer } = useTimer();
  const router = useRouter();
  const isStoppingRef = useRef(false); // Prevent multiple simultaneous stop calls
  const [isStopping, setIsStopping] = useState(false); // For UI disabled state

  if (!activeTimer) {
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
    if (activeTimer.task_id) {
      if (activeTimer.project_id) {
        // Task with project - go to project task detail
        const url = `/projects/${activeTimer.project_id}/tasks/${activeTimer.task_id}`;
        router.push(url);
      } else {
        // Task without project - go to task detail
        const url = `/tasks/${activeTimer.task_id}`;
        router.push(url);
      }
    }
  };

  return (
    <div className="flex items-center gap-2 h-12 px-3 bg-muted rounded-md border border-border shadow-sm hover:bg-muted/80 hover:shadow-md transition-all">
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatTime(currentDuration)}
        </span>
      </div>
      
      {/* Task Info - Clickable */}
      <div 
        className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity group"
        onClick={handleClick}
      >
        {activeTimer.project_name && (
          <>
            <span className="text-xs text-muted-foreground font-medium">
              {activeTimer.project_name}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
          </>
        )}
        <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
          {activeTimer.task_name}
        </span>
      </div>

      {/* Action Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          disabled={isStopping}
          className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zastaviť časovač"
        >
        <Square className="h-3.5 w-3.5" />
        </Button>
    </div>
  );
}