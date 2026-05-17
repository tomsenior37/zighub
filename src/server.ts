import Fastify, { type FastifyInstance } from "fastify";
import { VERSION } from "./version.js";

export interface BuildServerOptions {
  logger?: boolean;
}

export function buildServer(opts: BuildServerOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  app.get("/health", () => ({ status: "ok", version: VERSION }));

  return app;
}
