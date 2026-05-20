import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { TimerProvider, useTimer } from "@/contexts/TimerContext";
import type { TimerContextType } from "@/types/timer";

vi.mock("@/contexts/AuthContext", () => {
  return {
    useAuth: () => ({ user: null }),
  };
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
});

