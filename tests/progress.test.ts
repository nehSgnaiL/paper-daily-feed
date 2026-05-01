import { describe, expect, it, vi } from "vitest";
import { createProgress } from "../src/progress.js";

describe("createProgress", () => {
  it("logs count, total, progress bar, percent, elapsed time, and details", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    const log = vi.fn();
    const progress = createProgress("RSS", { total: 4, logger: log });

    vi.advanceTimersByTime(1500);
    progress.step("Nature: 75 papers");

    expect(log).toHaveBeenCalledWith("[RSS] 1/4 [#####---------------] 25% | 1.5s | Nature: 75 papers");

    vi.useRealTimers();
  });

  it("logs open-ended progress for unknown totals", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    const log = vi.fn();
    const progress = createProgress("Zotero items/top", { logger: log });

    progress.step("page 1: 100 items, 100 total");
    progress.done("100 total items");

    expect(log).toHaveBeenNthCalledWith(
      1,
      "[Zotero items/top] 1 steps | 0.0s | page 1: 100 items, 100 total"
    );
    expect(log).toHaveBeenNthCalledWith(2, "[Zotero items/top] 1 steps | 0.0s | 100 total items");

    vi.useRealTimers();
  });
});
