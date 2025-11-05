"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ActiveTimer, TimerContextType } from "@/types/timer";
import { useAuth } from "@/contexts/AuthContext";

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const { user } = useAuth();

  // Check for active timer on mount (only if user is logged in)
  useEffect(() => {
    if (user) {
    refreshTimer();
    } else {
      setActiveTimer(null);
      setCurrentDuration(0);
    }
  }, [user]);

  // Update duration every second when there's an active timer
  useEffect(() => {
    if (activeTimer) {
      const interval = setInterval(() => {
        const startedAt = new Date(activeTimer.started_at);
        const now = new Date();
        const duration = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        setCurrentDuration(duration);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCurrentDuration(0);
    }
  }, [activeTimer]);

  const refreshTimer = async () => {
    if (!user) {
      setActiveTimer(null);
      return;
    }

    try {
      const response = await fetch("/api/timers/active");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setActiveTimer(data.data);
        } else {
          setActiveTimer(null);
        }
      } else if (response.status === 401) {
        // User not authenticated, silently ignore
        setActiveTimer(null);
      } else {
        setActiveTimer(null);
      }
    } catch (error) {
      // Silently ignore errors when user is not authenticated
      if (user) {
      console.error("Error refreshing timer:", error);
      }
      setActiveTimer(null);
    }
  };

  const startTimer = async (taskId: string, taskName: string, projectId: string, projectName: string) => {
    try {
      const response = await fetch("/api/timers/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          taskName,
          projectId,
          projectName,
        }),
      });

      const result = await response.json();
      if (result.success) {
        await refreshTimer();
      } else {
        console.error("Failed to start timer:", result.error);
      }
    } catch (error) {
      console.error("Error starting timer:", error);
    }
  };

  const stopTimer = async () => {
    try {
      const response = await fetch("/api/timers/stop", {
        method: "POST",
      });

      const result = await response.json();
      if (result.success) {
        setActiveTimer(null);
      } else {
        console.error("Failed to stop timer:", result.error);
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
    }
  };

  return (
    <TimerContext.Provider
      value={{
        activeTimer,
        currentDuration,
        startTimer,
        stopTimer,
        refreshTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}