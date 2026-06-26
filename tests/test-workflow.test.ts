import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("test paper feeds workflow", () => {
  it("runs the recommendation feed without sending SMTP email", () => {
    const workflow = readFileSync(".github/workflows/test.yml", "utf8");

    expect(workflow).toContain("Run recommendation feed in test mode");
    expect(workflow).toContain("RUNTIME_DEBUG: true");
  });
});
