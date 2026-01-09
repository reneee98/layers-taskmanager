"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { ActiveTimer, TimerContextType } from "@/types/timer";
import { useAuth } from "@/contexts/AuthContext";

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const { user } = useAuth();
  const endpointNotFoundRef = useRef(false); // Track if endpoint doesn't exist
  const isFetchingRef = useRef(false); // Prevent duplicate fetches
  const lastUserIdRef = useRef<string | null>(null); // Track last user ID to prevent duplicate calls
  const isStoppingRef = useRef(false); // Prevent duplicate stop calls across components

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
      setActiveTimer(null);
      setCurrentDuration(0);
      lastUserIdRef.current = null;
    }
  }, [user?.id]);

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

  const refreshTimer = useCallback(async () => {
    if (!user || endpointNotFoundRef.current || isFetchingRef.current) {
      if (!user) setActiveTimer(null);
      return;
    }

    try {
      isFetchingRef.current = true;
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
      } else if (response.status === 404) {
        // Endpoint not found - mark it and stop trying
        endpointNotFoundRef.current = true;
        setActiveTimer(null);
        // Don't log 404 errors - endpoint might not be implemented yet
      } else {
        // Only log non-404 errors
        console.error(`Failed to fetch active timer: ${response.status} ${response.statusText}`);
        setActiveTimer(null);
      }
    } catch (error) {
      // Check if it's a 404 error
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('Not Found'))) {
        endpointNotFoundRef.current = true;
        setActiveTimer(null);
        // Silently ignore 404 errors
        return;
      }
      
      // Only log non-404 errors
      if (user) {
        console.error("Error refreshing timer:", error);
      }
      setActiveTimer(null);
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

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
      const response = await fetch("/api/timers/stop", {
        method: "POST",
      });

      const result = await response.json();
      if (result.success) {
        setActiveTimer(null);
        setCurrentDuration(0);
      } else {
        console.error("Failed to stop timer:", result.error);
        // Even if API call failed, clear the timer state to prevent UI issues
        // The timer might have been stopped by another request or expired
        setActiveTimer(null);
        setCurrentDuration(0);
      }
    } catch (error) {
      console.error("Error stopping timer:", error);
      // On error, still clear the timer state to prevent UI issues
      setActiveTimer(null);
      setCurrentDuration(0);
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