import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { TimerProvider, useTimer } from "@/contexts/TimerContext";
import type { TimerContextType } from "@/types/timer";

const { authState } = vi.hoisted(() => ({
  authState: { user: null as { id: string } | null },
}));

vi.mock("@/contexts/AuthContext", () => {
  return {
    useAuth: () => ({ user: authState.user }),
  };
});

afterEach(() => {
  authState.user = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  cleanup();
});

const TimerConsumer = ({ onReady }: { onReady: (ctx: ReturnType<typeof useTimer>) => void }) => {
  const ctx = useTimer();
  React.useEffect(() => {
    onReady(ctx);
  }, [ctx, onReady]);
  return null;
};

describe("TimerContext", () => {
  it("dedupes concurrent stopTimer calls (single /api/timers/stop request)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let resolveContext: ((value: TimerContextType) => void) | null = null;
    const timerContextPromise = new Promise<TimerContextType>((resolve) => {
      resolveContext = resolve;
    });

    render(
      <TimerProvider>
        <TimerConsumer onReady={(c) => resolveContext?.(c)} />
      </TimerProvider>
    );

    const timerContext = await timerContextPromise;

    const first = timerContext.stopTimer();
    const second = timerContext.stopTimer();

    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/timers/stop", { method: "POST" });
  });

  it("synchronizes a timer stopped by the desktop tracker and refreshes time data", async () => {
    authState.user = { id: "user-1" };
    const activeTimer = {
      id: "timer-1",
      task_id: "task-1",
      task_name: "Spoločná úloha",
      project_name: "Layers",
      project_id: "project-1",
      started_at: new Date().toISOString(),
      duration: 0,
      is_extra: false,
      description: "",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: activeTimer }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: null }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const handleTimerStopped = vi.fn();
    const handleTimeEntryAdded = vi.fn();
    window.addEventListener("timerStopped", handleTimerStopped);
    window.addEventListener("timeEntryAdded", handleTimeEntryAdded);

    let latestContext: TimerContextType | null = null;
    render(
      <TimerProvider>
        <TimerConsumer onReady={(context) => { latestContext = context; }} />
      </TimerProvider>
    );

    await waitFor(() => expect(latestContext?.activeTimer?.id).toBe("timer-1"));

    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(latestContext?.activeTimer).toBeNull());
    expect(fetchMock).toHaveBeenLastCalledWith("/api/timers/active", { cache: "no-store" });
    expect(handleTimerStopped).toHaveBeenCalledTimes(1);
    expect(handleTimeEntryAdded).toHaveBeenCalledTimes(1);

    window.removeEventListener("timerStopped", handleTimerStopped);
    window.removeEventListener("timeEntryAdded", handleTimeEntryAdded);
  });

  it("sends the displayed timer id when stopping", async () => {
    authState.user = { id: "user-1" };
    const activeTimer = {
      id: "timer-1",
      task_id: "task-1",
      task_name: "Testovacia úloha",
      project_name: "Layers",
      project_id: "project-1",
      started_at: new Date().toISOString(),
      duration: 0,
      is_extra: false,
      description: "",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: activeTimer }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const contextState: { current: TimerContextType | null } = { current: null };
    render(
      <TimerProvider>
        <TimerConsumer onReady={(context) => { contextState.current = context; }} />
      </TimerProvider>
    );

    await waitFor(() => expect(contextState.current?.activeTimer?.id).toBe("timer-1"));
    await act(async () => {
      if (!contextState.current) {
        throw new Error("Timer context was not initialized");
      }
      await contextState.current.stopTimer();
    });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/timers/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timerId: "timer-1" }),
    });
  });
});
