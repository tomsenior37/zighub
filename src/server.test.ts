import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./server.js";
import { VERSION } from "./version.js";

let app: FastifyInstance | undefined;
const cleanupDirs: string[] = [];

afterEach(async () => {
  if (app) {
    await app.close();
    app = undefined;
  }
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function makeWebRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "zighub-web-"));
  writeFileSync(join(dir, "index.html"), "<!doctype html><title>spa</title>");
  writeFileSync(join(dir, "favicon.ico"), "x");
  cleanupDirs.push(dir);
  return dir;
}

describe("GET /health", () => {
  it("returns 200 with status ok and the package version", async () => {
    app = await buildServer();
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ status: "ok", version: VERSION });
  });
});

describe("buildServer", () => {
  it("can be closed without ever listening", async () => {
    app = await buildServer();
    await app.ready();
    await app.close();
    app = undefined;
  });
});

describe("static web serving", () => {
  it("does not serve the SPA when serveStaticWeb is false", async () => {
    app = await buildServer({ serveStaticWeb: false });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("serves the SPA index.html for unknown GET routes when enabled", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/some/deep/route" });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("<title>spa</title>");
  });

  it("serves /health as JSON even when static web is enabled", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", version: VERSION });
  });

  it("returns JSON 404 for unknown /api routes (does not fall back to SPA)", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/api/missing" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.json()).toEqual({ error: "not_found" });
  });

  it("returns JSON 404 for non-GET methods", async () => {
    const root = makeWebRoot();
    app = await buildServer({ serveStaticWeb: true, staticWebRoot: root });
    await app.ready();

    const res = await app.inject({ method: "POST", url: "/anything" });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("does not throw when the static root does not exist (logs a warning)", async () => {
    app = await buildServer({
      serveStaticWeb: true,
      staticWebRoot: "/nonexistent/path/that/should/not/be/there",
    });
    await app.ready();

    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});
