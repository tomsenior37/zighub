import { describe, expect, it } from "vitest";
import { VERSION } from "./version.js";

describe("VERSION", () => {
  it("is a non-empty semver-ish string read from package.json", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
