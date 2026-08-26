import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TASK_COLOR_PALETTE,
  getRandomTaskColor,
  getTaskFallbackColor,
  normalizeTaskColor,
  resolveTaskColor,
} from "@/lib/task-colors";

describe("task colors", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes valid HEX colors", () => {
    expect(normalizeTaskColor(" #a47d69 ")).toBe("#A47D69");
    expect(normalizeTaskColor("invalid")).toBeNull();
  });

  it("returns a palette color when assigning a random color", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(getRandomTaskColor()).toBe(TASK_COLOR_PALETTE[6]);
  });

  it("uses a stable fallback for legacy tasks without a stored color", () => {
    const firstColor = getTaskFallbackColor("task-123");
    const secondColor = getTaskFallbackColor("task-123");

    expect(firstColor).toBe(secondColor);
    expect(TASK_COLOR_PALETTE).toContain(firstColor);
    expect(resolveTaskColor({ id: "task-123", color: null })).toBe(firstColor);
  });

  it("prefers the stored task color", () => {
    expect(resolveTaskColor({ id: "task-123", color: "#6f83a8" })).toBe("#6F83A8");
  });
});
