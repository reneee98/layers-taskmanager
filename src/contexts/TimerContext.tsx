"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { ActiveTimer, TimerContextType } from "@/types/timer";
import { useAuth } from "@/contexts/AuthContext";

const TimerContext = createContext<TimerContextType | undefined>(undefined);
const TIMER_SYNC_INTERVAL_MS = 5_000;
const TIMER_STOPPED_EVENT = "timerStopped";
const TIME_ENTRY_ADDED_EVENT = "timeEntryAdded";

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const { user } = useAuth();
  const endpointNotFoundRef = useRef(false); // Track if endpoint doesn't exist
  const isFetchingRef = useRef(false); // Prevent duplicate fetches
  const lastUserIdRef = useRef<string | null>(null); // Track last user ID to prevent duplicate calls
  const isStoppingRef = useRef(false); // Prevent duplicate stop calls across components
  const activeTimerRef = useRef<ActiveTimer | null>(null);

  const updateActiveTimer = useCallback((nextTimer: ActiveTimer | null, notify = false) => {
    const previousTimer = activeTimerRef.current;
    activeTimerRef.current = nextTimer;
    setActiveTimer(nextTimer);

    // A timer stopped in the desktop tracker (or another browser tab) also
    // creates a time entry. Notify the currently open page so its time and
    // finance panels reload without requiring a manual refresh.
    if (notify && previousTimer && !nextTimer) {
      window.dispatchEvent(new CustomEvent(TIMER_STOPPED_EVENT));
      window.dispatchEvent(new CustomEvent(TIME_ENTRY_ADDED_EVENT));
    }
  }, []);

  const refreshTimer = useCallback(async () => {
    if (!user || endpointNotFoundRef.current || isFetchingRef.current) {
      if (!user) updateActiveTimer(null);
      return;
    }

    try {
      isFetchingRef.current = true;
      const response = await fetch("/api/timers/active", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          updateActiveTimer(data.data, true);
        } else {
          updateActiveTimer(null, true);
        }
      } else if (response.status === 401) {
        // User not authenticated, silently ignore
        updateActiveTimer(null);
      } else if (response.status === 404) {
        // Endpoint not found - mark it and stop trying
        endpointNotFoundRef.current = true;
        updateActiveTimer(null);
        // Don't log 404 errors - endpoint might not be implemented yet
      } else {
        // Only log non-404 errors
        console.error(`Failed to fetch active timer: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Check if it's a 404 error
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        endpointNotFoundRef.current = true;
        updateActiveTimer(null);
        // Silently ignore 404 errors
        return;
      }
      
      // Only log non-404 errors
      if (user) {
        console.error("Error refreshing timer:", error);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [updateActiveTimer, user]);

  // Check for active timer on mount (only if user is logged in)
  useEffect(() => {
    // Skip if same user already fetched
    if (user?.id === lastUserIdRef.current) {
      return;
    }
    
    if (user && !endpointNotFoundRef.current) {
      lastUserIdRef.current = user.id;
      refreshTimer();
    } else {
      updateActiveTimer(null);
      setCurrentDuration(0);
      lastUserIdRef.current = null;
    }
  }, [refreshTimer, updateActiveTimer, user]);

  // Keep the web tracker synchronized with the native tracker and other tabs.
  // Polling works for both cookie-authenticated web requests and bearer-token
  // desktop requests, while focus/visibility refreshes make returning to the
  // page effectively immediate.
  useEffect(() => {
    if (!user || endpointNotFoundRef.current) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshTimer();
    }, TIMER_SYNC_INTERVAL_MS);
    const handleFocus = () => void refreshTimer();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshTimer();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshTimer, user]);

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

  const startTimer = async (taskId: string, taskName: string, projectId: string, projectName: string, isExtra: boolean = false, description?: string) => {
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
          isExtra,
          description,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Wait a bit before refreshing to ensure timer is saved
        await new Promise(resolve => setTimeout(resolve, 500));
        await refreshTimer();
        // Double check after another short delay
        setTimeout(() => refreshTimer(), 1000);
      } else {
        console.error("Failed to start timer:", result.error, result);
        // Another client may have started a timer since the last poll.
        // Refresh before surfacing the conflict so the web UI shows it.
        if (response.status === 409) {
          await refreshTimer();
        }
        throw new Error(result.error || "Failed to start timer");
      }
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    }
  };

  const stopTimer = async () => {
    if (isStoppingRef.current) {
      return;
    }

    try {
      isStoppingRef.current = true;
      const timerId = activeTimerRef.current?.id;
      const response = await fetch("/api/timers/stop", {
        method: "POST",
        ...(timerId
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ timerId }),
            }
          : {}),
      });

      const result = await response.json();
      if (result.success || response.status === 404) {
        updateActiveTimer(null, true);
        setCurrentDuration(0);
      } else {
        console.error("Failed to stop timer:", result.error);
        throw new Error(result.error || "Failed to stop timer");
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      await refreshTimer();
      throw error;
    } finally {
      isStoppingRef.current = false;
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
