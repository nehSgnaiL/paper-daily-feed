import { describe, expect, it } from "vitest";
import { parseCliMode } from "../src/cli.js";

describe("parseCliMode", () => {
  it("defaults to run mode", () => {
    expect(parseCliMode([])).toBe("run");
  });

  it("accepts explicit runtime modes", () => {
    expect(parseCliMode(["run"])).toBe("run");
    expect(parseCliMode(["preview-email"])).toBe("preview-email");
    expect(parseCliMode(["setup-profile"])).toBe("setup-profile");
    expect(parseCliMode(["test-config"])).toBe("test-config");
  });

  it("throws a clear error for unknown modes", () => {
    expect(() => parseCliMode(["preview"])).toThrow(
      "Unknown CLI mode: preview. Expected one of: run, preview-email, setup-profile, test-config."
    );
  });
});
