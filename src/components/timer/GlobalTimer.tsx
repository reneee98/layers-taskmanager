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
    if (currentDuration === 0) {
      await stopTimer();
      return;
    }

    const trackedHours = Number((currentDuration / 3600).toFixed(3));
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
    const startTime = new Date(now.getTime() - (currentDuration * 1000)).toTimeString().slice(0, 8); // HH:mm:ss format
    
    try {
      // Automaticky zapísať čas do úlohy
      const payload = {
        hours: trackedHours,
        date: now.toISOString().split("T")[0],
        description: `Automaticky zapísaný čas z globálneho časovača`,
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
          description: `Zapísaných ${formatTime(currentDuration)} do úlohy "${activeTimer.task_name}".`,
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
    if (activeTimer.task_id && activeTimer.project_id) {
      const url = `/projects/${activeTimer.project_id}/tasks/${activeTimer.task_id}`;
      router.push(url);
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-md shadow-sm">
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-mono font-medium text-foreground">
          {formatTime(currentDuration)}
        </span>
      </div>
      
      {/* Task Info - Clickable */}
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
        onClick={handleClick}
      >
        <Badge variant="outline" className="text-xs">
          {activeTimer.project_name}
        </Badge>
        <span className="text-sm text-muted-foreground">•</span>
        <span className="text-sm font-medium text-foreground truncate max-w-32">
          {activeTimer.task_name}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="h-7 w-7 p-0 hover:bg-muted"
          title="Zastaviť časovač"
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}