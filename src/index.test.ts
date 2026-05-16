import { describe, expect, it } from "vitest";
import { VERSION } from "./index.js";

describe("smoke", () => {
  it("is true", () => {
    expect(true).toBe(true);
  });

  it("exports a non-empty VERSION read from package.json", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
