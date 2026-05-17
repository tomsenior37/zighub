import { PassThrough, type Readable } from "node:stream";
import type { FastifyInstance } from "fastify";
import type { ZigbeeAdapter, ZigbeeEvent } from "./zigbee/index.js";

const HEARTBEAT_INTERVAL_MS = 15_000;

export function formatSseEvent(event: ZigbeeEvent): string {
  return `event: zigbee\ndata: ${JSON.stringify(event)}\n\n`;
}

export interface EventStreamOptions {
  heartbeatMs?: number;
}

export function createEventStream(
  adapter: ZigbeeAdapter,
  opts: EventStreamOptions = {},
): { stream: Readable; close: () => void } {
  const stream = new PassThrough();
  const heartbeatMs = opts.heartbeatMs ?? HEARTBEAT_INTERVAL_MS;

  const unsubscribe = adapter.onEvent((event) => {
    if (!stream.destroyed) {
      stream.write(formatSseEvent(event));
    }
  });

  const heartbeat = setInterval(() => {
    if (!stream.destroyed) {
      stream.write(`: heartbeat ${Date.now().toString()}\n\n`);
    }
  }, heartbeatMs);
  if (typeof heartbeat.unref === "function") heartbeat.unref();

  const close = (): void => {
    clearInterval(heartbeat);
    unsubscribe();
    if (!stream.destroyed) stream.end();
  };

  stream.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });

  return { stream, close };
}

export function registerEventStreamRoute(app: FastifyInstance, adapter: ZigbeeAdapter): void {
  app.get("/api/events", (request, reply) => {
    const { stream, close } = createEventStream(adapter);

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.flushHeaders?.();

    request.raw.on("close", close);

    stream.pipe(reply.raw);
  });
}
