import { afterEach, describe, expect, it, mock, setSystemTime } from "bun:test";
import { createProgress } from "../src/progress.js";

afterEach(() => setSystemTime());

describe("createProgress", () => {
  it("logs count, total, progress bar, percent, elapsed time, and details", () => {
    setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    const log = mock();
    const progress = createProgress("RSS", { total: 4, logger: log });

    setSystemTime(new Date("2026-05-01T00:00:01.500Z"));
    progress.step("Nature: 75 papers");

    expect(log).toHaveBeenCalledWith("[RSS] 1/4 [#####---------------] 25% | 1.5s | Nature: 75 papers");

  });

  it("logs open-ended progress for unknown totals", () => {
    setSystemTime(new Date("2026-05-01T00:00:00.000Z"));
    const log = mock();
    const progress = createProgress("Zotero items/top", { logger: log });

    progress.step("page 1: 100 items, 100 total");
    progress.done("100 total items");

    expect(log).toHaveBeenNthCalledWith(
      1,
      "[Zotero items/top] 1 steps | 0.0s | page 1: 100 items, 100 total"
    );
    expect(log).toHaveBeenNthCalledWith(2, "[Zotero items/top] 1 steps | 0.0s | 100 total items");

  });
});
