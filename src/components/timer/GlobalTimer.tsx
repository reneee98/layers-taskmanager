"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function GlobalTimer() {
  console.log("GlobalTimer component loaded");
  
  const { isRunning, seconds, taskName, projectName, taskId, stopTimer, resetTimer } = useTimer();
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

  const handleStop = () => {
    console.log("GlobalTimer: handleStop called");
    stopTimer();
    toast({
      title: "Časovač zastavený",
      description: `Časovač pre úlohu "${taskName}" bol zastavený.`,
    });
  };

  const handleReset = () => {
    console.log("GlobalTimer: handleReset called");
    resetTimer();
    toast({
      title: "Časovač resetovaný",
      description: "Časovač bol resetovaný na 0:00.",
    });
  };

  const handleClick = () => {
    if (taskId && projectId) {
      console.log("GlobalTimer: Navigating to task detail", { taskId, projectId });
      router.push(`/projects/${projectId}/tasks/${taskId}`);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-primary">
          {formatTime(seconds)}
        </span>
      </div>
      
      <div 
        className="flex items-center gap-1 cursor-pointer hover:bg-primary/5 rounded px-2 py-1 transition-colors"
        onClick={handleClick}
      >
        <Badge variant="secondary" className="text-xs">
          {projectName}
        </Badge>
        <span className="text-sm text-muted-foreground">•</span>
        <span className="text-sm font-medium truncate max-w-32">
          {taskName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="h-6 w-6 p-0"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="h-6 w-6 p-0"
        >
          <Pause className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
