import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { TimerProvider, useTimer } from "@/contexts/TimerContext";

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
    // @ts-expect-error - override fetch in test env
    global.fetch = fetchMock;

    let ctx: ReturnType<typeof useTimer> | null = null;

    render(
      <TimerProvider>
        <TimerConsumer onReady={(c) => (ctx = c)} />
      </TimerProvider>
    );

    // wait a microtask for effect to run
    await Promise.resolve();

    expect(ctx).not.toBeNull();
    if (!ctx) return;

    const first = ctx.stopTimer();
    const second = ctx.stopTimer();

    await Promise.all([first, second]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/timers/stop", { method: "POST" });
  });
});


