"use client";

import { useTimer } from "@/contexts/TimerContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square } from "lucide-react";
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

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className="h-7 w-7 p-0 hover:bg-muted"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleStop}
          className="h-7 w-7 p-0 hover:bg-muted"
        >
          <Pause className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
