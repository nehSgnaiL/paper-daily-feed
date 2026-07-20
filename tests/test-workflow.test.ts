import { readFileSync } from "node:fs";

import { describe, expect, it } from "bun:test";

describe("test paper feeds workflow", () => {
  it("runs the recommendation feed with SMTP delivery enabled", () => {
    const workflow = readFileSync(".github/workflows/test.yml", "utf8");

    expect(workflow).toContain("Run recommendation feed in test mode");
    expect(workflow).toContain("RUNTIME_DEBUG: false");
    expect(workflow).toContain("uses: ./.github/actions/setup-bun");
    expect(workflow).toContain("run: bun src/index.ts run");
  });

  it("centralizes the pinned Bun runtime, dependency cache, and frozen install", () => {
    const setupAction = readFileSync(".github/actions/setup-bun/action.yml", "utf8");
    const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { packageManager?: string };
    const workflows = ["ci", "daily", "maintenance", "release", "test"].map((name) =>
      readFileSync(`.github/workflows/${name}.yml`, "utf8")
    );

    expect(packageJson.packageManager).toBe("bun@1.3.14");
    expect(setupAction).toContain("uses: oven-sh/setup-bun@v2");
    expect(setupAction).toContain("bun-version: 1.3.14");
    expect(setupAction).toContain("path: ~/.bun/install/cache");
    expect(setupAction).toContain("hashFiles('bun.lock')");
    expect(setupAction).toContain("ONNXRUNTIME_NODE_INSTALL: skip");
    expect(setupAction).toContain("run: bun ci");

    for (const workflow of workflows) {
      expect(workflow).toContain("uses: ./.github/actions/setup-bun");
      expect(workflow).not.toContain("actions/setup-node");
      expect(workflow).not.toMatch(/\bnpm\b/);
    }
  });
});
