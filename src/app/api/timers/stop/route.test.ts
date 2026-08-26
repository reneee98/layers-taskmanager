import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
}));

vi.mock("@/lib/supabase/request", () => ({
  getAuthenticatedRequestContext: mocks.getAuthenticatedRequestContext,
}));

vi.mock("@/lib/supabase/service", () => ({
  createClient: mocks.createServiceClient,
}));

vi.mock("@/lib/activity-logger", () => ({
  ActivityTypes: { TIMER_STOPPED: "timer_stopped" },
  getUserDisplayName: vi.fn(),
  logActivity: vi.fn(),
}));

import { POST } from "@/app/api/timers/stop/route";

type QueryResult = {
  data: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
};

const createQuery = (result: QueryResult) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);

  return query;
};

const createRequest = (body?: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/timers/stop", {
    method: "POST",
    ...(body
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });

describe("POST /api/timers/stop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats an already stopped timer as a successful idempotent stop", async () => {
    const requestedTimerQuery = createQuery({ data: null, error: null });
    const fallbackQuery = createQuery({ data: null, error: null });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(requestedTimerQuery)
        .mockReturnValueOnce(fallbackQuery),
      rpc: vi.fn(),
    };

    mocks.createServiceClient.mockReturnValue(supabase);
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await POST(createRequest({ timerId: "timer-1" }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      success: true,
      message: "Timer was already stopped",
    });
    expect(requestedTimerQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(requestedTimerQuery.eq).toHaveBeenCalledWith("id", "timer-1");
    expect(fallbackQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("recovers from a stale client timer id and stops the user's current timer", async () => {
    const requestedTimerQuery = createQuery({ data: null, error: null });
    const activeTimer = {
      id: "timer-current",
      task_id: "task-1",
      workspace_id: "workspace-1",
      started_at: new Date(Date.now() + 60_000).toISOString(),
    };
    const fallbackQuery = createQuery({ data: activeTimer, error: null });
    const supabase = {
      from: vi
        .fn()
        .mockReturnValueOnce(requestedTimerQuery)
        .mockReturnValueOnce(fallbackQuery),
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    };

    mocks.createServiceClient.mockReturnValue(supabase);
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      supabase,
      user: { id: "user-1" },
    });

    const response = await POST(createRequest({ timerId: "timer-stale" }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({ success: true, data: { duration: 0, hours: 0 } });
    expect(fallbackQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(supabase.rpc).toHaveBeenCalledWith("stop_timer", {
      p_timer_id: "timer-current",
      p_user_id: "user-1",
    });
  });
});
