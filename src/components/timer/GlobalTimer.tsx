"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function GlobalTimer() {
  const { activeTimer, currentDuration, stopTimer } = useTimer();
  const router = useRouter();

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
    if (!activeTimer) {
      await stopTimer();
      return;
    }

    // Vypočítať trvanie priamo z activeTimer.started_at namiesto currentDuration
    // aby sme zabezpečili správnu hodnotu aj keď sa timer už zastavil
    const startedAt = new Date(activeTimer.started_at);
    const now = new Date();
    const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
    
    if (duration <= 0) {
      await stopTimer();
      return;
    }

    const trackedHours = Number((duration / 3600).toFixed(3));
    const endTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
    const startTime = startedAt.toTimeString().slice(0, 8); // HH:mm:ss format
    
    try {
      // Automaticky zapísať čas do úlohy
      const payload = {
        hours: trackedHours,
        date: now.toISOString().split("T")[0],
        description: "", // Prázdna poznámka - používateľ si ju dopíše sám
        start_time: startTime,
        end_time: endTime,
      };

      const response = await fetch(`/api/tasks/${activeTimer.task_id}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Časovač zastavený",
          description: `Zapísaných ${formatTime(duration)} do úlohy "${activeTimer.task_name}".`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Failed to save time entry:", error);
      toast({
        title: "Chyba",
        description: "Nepodarilo sa uložiť čas do úlohy",
        variant: "destructive",
      });
    } finally {
      await stopTimer();
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
        className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-md"
          title="Zastaviť časovač"
        >
        <Square className="h-3.5 w-3.5" />
        </Button>
    </div>
  );
}