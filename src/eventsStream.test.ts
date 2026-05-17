import { describe, expect, it, vi } from "vitest";
import { createEventStream, formatSseEvent } from "./eventsStream.js";
import { createMockAdapter } from "./zigbee/mockAdapter.js";

describe("formatSseEvent", () => {
  it("emits an event named 'zigbee' with the JSON payload on a data line", () => {
    const out = formatSseEvent({
      type: "deviceJoined",
      device: { ieeeAddress: "aa:bb", networkAddress: 1 },
    });
    expect(out).toContain("event: zigbee\n");
    expect(out).toContain('data: {"type":"deviceJoined"');
    expect(out.endsWith("\n\n")).toBe(true);
  });
});

describe("createEventStream", () => {
  it("forwards adapter events as SSE frames", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const { stream, close } = createEventStream(adapter, { heartbeatMs: 60_000 });

    const chunks: string[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString("utf8")));

    adapter.simulateDeviceJoin({ ieeeAddress: "aa:bb", networkAddress: 1 });
    await new Promise((r) => setImmediate(r));

    const combined = chunks.join("");
    expect(combined).toContain("event: zigbee");
    expect(combined).toContain('"ieeeAddress":"aa:bb"');

    close();
  });

  it("emits heartbeat comments on the configured interval", async () => {
    vi.useFakeTimers();
    const adapter = createMockAdapter();
    await adapter.start();
    const { stream, close } = createEventStream(adapter, { heartbeatMs: 100 });

    const chunks: string[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString("utf8")));

    vi.advanceTimersByTime(350);
    const combined = chunks.join("");
    expect(combined.match(/: heartbeat /g)?.length).toBe(3);

    close();
    vi.useRealTimers();
  });

  it("close() stops further events from flowing", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const { stream, close } = createEventStream(adapter, { heartbeatMs: 60_000 });

    const chunks: string[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk.toString("utf8")));

    close();
    adapter.simulateDeviceJoin({ ieeeAddress: "cc:dd", networkAddress: 1 });
    await new Promise((r) => setImmediate(r));

    expect(chunks.join("")).not.toContain("cc:dd");
  });

  it("multiple subscribers each receive their own copy", async () => {
    const adapter = createMockAdapter();
    await adapter.start();
    const a = createEventStream(adapter, { heartbeatMs: 60_000 });
    const b = createEventStream(adapter, { heartbeatMs: 60_000 });

    const aChunks: string[] = [];
    const bChunks: string[] = [];
    a.stream.on("data", (c: Buffer) => aChunks.push(c.toString("utf8")));
    b.stream.on("data", (c: Buffer) => bChunks.push(c.toString("utf8")));

    adapter.simulateDeviceJoin({ ieeeAddress: "ee:ff", networkAddress: 1 });
    await new Promise((r) => setImmediate(r));

    expect(aChunks.join("")).toContain("ee:ff");
    expect(bChunks.join("")).toContain("ee:ff");

    a.close();
    b.close();
  });
});

describe("/api/events route", () => {
  it("registers the SSE route and sets streaming headers", async () => {
    const { buildServer } = await import("./server.js");
    const adapter = createMockAdapter();
    await adapter.start();
    const app = await buildServer({ zigbeeAdapter: adapter });
    await app.ready();

    const routes = app.printRoutes({ includeHooks: false });
    expect(routes).toMatch(/events \(GET/);

    await app.close();
    await adapter.stop();
  });
});
