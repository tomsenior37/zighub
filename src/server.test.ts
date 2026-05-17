import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { VERSION } from "./version.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
});

describe("GET /health", () => {
  it("returns 200 with status ok and the package version", async () => {
    app = buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ status: "ok", version: VERSION });
  });
});

describe("buildServer", () => {
  it("can be closed without ever listening", async () => {
    app = buildServer();
    await app.ready();
    await app.close();
    app = undefined;
  });
});
