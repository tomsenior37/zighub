import { describe, expect, it } from "vitest";
import { __testing, shouldServeStaticWeb } from "./staticWeb.js";

const { isApiPath } = __testing;

describe("isApiPath", () => {
  it.each([
    ["/health", true],
    ["/api", true],
    ["/api/devices", true],
    ["/api/network/permit-join", true],
    ["/", false],
    ["/wizard", false],
    ["/devices", false],
    ["/api-not-really", false],
    ["/healthcheck", false],
  ])("isApiPath(%s) === %s", (url, expected) => {
    expect(isApiPath(url)).toBe(expected);
  });
});

describe("shouldServeStaticWeb", () => {
  it("returns true when ZIGHUB_SERVE_WEB=1 regardless of NODE_ENV", () => {
    expect(shouldServeStaticWeb({ ZIGHUB_SERVE_WEB: "1", NODE_ENV: "development" })).toBe(true);
  });

  it("returns false when ZIGHUB_SERVE_WEB=0 regardless of NODE_ENV", () => {
    expect(shouldServeStaticWeb({ ZIGHUB_SERVE_WEB: "0", NODE_ENV: "production" })).toBe(false);
  });

  it("returns true in production by default", () => {
    expect(shouldServeStaticWeb({ NODE_ENV: "production" })).toBe(true);
  });

  it("returns false in development by default", () => {
    expect(shouldServeStaticWeb({ NODE_ENV: "development" })).toBe(false);
  });

  it("returns false when NODE_ENV is unset", () => {
    expect(shouldServeStaticWeb({})).toBe(false);
  });
});
