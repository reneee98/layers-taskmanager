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
    <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      {/* Timer Display */}
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-mono font-bold text-red-700">
          {formatTime(currentDuration)}
        </span>
      </div>
      
      {/* Task Info - Clickable */}
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-white/50 rounded-lg px-3 py-1.5 transition-all duration-200 group"
        onClick={handleClick}
      >
        <Badge 
          variant="outline" 
          className="text-xs bg-white border-red-200 text-red-700 font-medium"
        >
          {activeTimer.project_name}
        </Badge>
        <span className="text-sm text-red-600 group-hover:text-red-700">•</span>
        <span className="text-sm font-semibold text-red-800 truncate max-w-32 group-hover:text-red-900">
          {activeTimer.task_name}
        </span>
      </div>

      {/* Action Button */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 rounded-full"
          title="Zastaviť časovač"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}