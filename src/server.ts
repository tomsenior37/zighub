import Fastify, { type FastifyInstance } from "fastify";
import { registerStaticWeb, shouldServeStaticWeb } from "./staticWeb.js";
import { VERSION } from "./version.js";

export interface BuildServerOptions {
  logger?: boolean;
  staticWebRoot?: string;
  serveStaticWeb?: boolean;
}

export async function buildServer(opts: BuildServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? false,
  });

  app.get("/health", () => ({ status: "ok", version: VERSION }));

  const serveWeb = opts.serveStaticWeb ?? shouldServeStaticWeb();
  if (serveWeb) {
    const registerOpts = opts.staticWebRoot ? { root: opts.staticWebRoot } : {};
    await registerStaticWeb(app, registerOpts);
  }

  return app;
}
