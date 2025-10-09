"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TimerContextType {
  isRunning: boolean;
  seconds: number;
  taskId: string | null;
  taskName: string | null;
  projectName: string | null;
  projectId: string | null;
  startTimer: (taskId: string, taskName: string, projectName: string, projectId?: string) => void;
  stopTimer: () => void;
  resetTimer: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Persist timer state to localStorage
  useEffect(() => {
    if (isRunning && taskId) {
      localStorage.setItem("timer", JSON.stringify({
        isRunning,
        seconds,
        taskId,
        taskName,
        projectName,
        projectId,
        startTime: Date.now() - (seconds * 1000)
      }));
    } else {
      localStorage.removeItem("timer");
    }
  }, [isRunning, seconds, taskId, taskName, projectName, projectId]);

  // Restore timer state from localStorage on mount
  useEffect(() => {
    const savedTimer = localStorage.getItem("timer");
    console.log("TimerContext: Restoring from localStorage", savedTimer);
    if (savedTimer) {
      try {
        const timerData = JSON.parse(savedTimer);
        console.log("TimerContext: Parsed timer data", timerData);
        if (timerData.isRunning) {
          const elapsedSeconds = Math.floor((Date.now() - timerData.startTime) / 1000);
          console.log("TimerContext: Restoring timer with elapsed seconds", elapsedSeconds);
          setSeconds(elapsedSeconds);
          setIsRunning(true);
          setTaskId(timerData.taskId);
          setTaskName(timerData.taskName);
          setProjectName(timerData.projectName);
          setProjectId(timerData.projectId);
        }
      } catch (error) {
        console.error("Failed to restore timer state:", error);
        localStorage.removeItem("timer");
      }
    }
    setIsInitialized(true);
  }, []);

  const startTimer = (newTaskId: string, newTaskName: string, newProjectName: string, newProjectId?: string) => {
    console.log("TimerContext: Starting timer", { newTaskId, newTaskName, newProjectName, newProjectId });
    setTaskId(newTaskId);
    setTaskName(newTaskName);
    setProjectName(newProjectName);
    setProjectId(newProjectId || null);
    setSeconds(0);
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setTaskId(null);
    setTaskName(null);
    setProjectName(null);
    setProjectId(null);
    setSeconds(0);
  };

  const resetTimer = () => {
    setSeconds(0);
  };

  const value = {
    isRunning,
    seconds,
    taskId,
    taskName,
    projectName,
    projectId,
    startTimer,
    stopTimer,
    resetTimer,
  };

  return (
    <TimerContext.Provider value={value}>
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
