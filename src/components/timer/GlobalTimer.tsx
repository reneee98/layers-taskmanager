"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function GlobalTimer() {
  console.log("GlobalTimer component loaded");
  
  const { isRunning, seconds, taskName, projectName, taskId, projectId, stopTimer, resetTimer } = useTimer();
  const router = useRouter();

  // Debug log
  console.log("GlobalTimer render:", { isRunning, seconds, taskName, projectName });

  if (!isRunning || !taskName) {
    return <div className="text-xs text-muted-foreground">Timer not running</div>;
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
    console.log("GlobalTimer: handleStop called");

    if (!taskId || seconds === 0) {
      stopTimer();
      return;
    }

    const trackedHours = Number((seconds / 3600).toFixed(3));
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 8); // HH:mm:ss format
    const startTime = new Date(now.getTime() - (seconds * 1000)).toTimeString().slice(0, 8); // HH:mm:ss format
    
    
    try {
      // Automaticky zapísať čas do úlohy - používame rovnakú logiku ako TimePanel
      const payload = {
        hours: trackedHours,
        date: now.toISOString().split("T")[0],
        description: `Automaticky zapísaný čas z globálneho časovača`,
        start_time: startTime,
        end_time: endTime,
      };

      const response = await fetch(`/api/tasks/${taskId}/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Časovač zastavený",
          description: `Zapísaných ${formatTime(seconds)} do úlohy "${taskName}".`,
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
      stopTimer();
    }
  };

  const handleClick = () => {
    console.log("GlobalTimer: handleClick called", { taskId, projectId });
    if (taskId && projectId) {
      console.log("GlobalTimer: Navigating to task detail", { taskId, projectId });
      const url = `/projects/${projectId}/tasks/${taskId}`;
      console.log("GlobalTimer: URL", url);
      router.push(url);
    } else {
      console.log("GlobalTimer: Missing taskId or projectId", { taskId, projectId });
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-md shadow-sm">
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-mono font-medium text-foreground">
          {formatTime(seconds)}
        </span>
      </div>
      
      {/* Task Info - Clickable */}
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
        onClick={handleClick}
      >
        <Badge variant="outline" className="text-xs">
          {projectName}
        </Badge>
        <span className="text-sm text-muted-foreground">•</span>
        <span className="text-sm font-medium text-foreground truncate max-w-32">
          {taskName}
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
