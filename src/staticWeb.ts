import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";

const API_PREFIXES = ["/api", "/health"] as const;

function isApiPath(url: string): boolean {
  return API_PREFIXES.some((p) => url === p || url.startsWith(`${p}/`));
}

export function defaultWebRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "web");
}

export interface RegisterStaticWebOptions {
  root?: string;
}

export async function registerStaticWeb(
  app: FastifyInstance,
  opts: RegisterStaticWebOptions = {},
): Promise<void> {
  const root = opts.root ?? defaultWebRoot();

  if (!existsSync(root)) {
    app.log.warn(
      { root },
      "static web root does not exist; SPA will not be served (run `npm run build` to produce it)",
    );
    return;
  }

  await app.register(fastifyStatic, {
    root,
    prefix: "/",
    wildcard: false,
  });

  app.setNotFoundHandler((req, reply) => {
    if (req.method !== "GET" || isApiPath(req.url)) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.sendFile("index.html", root);
  });
}

export function shouldServeStaticWeb(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ZIGHUB_SERVE_WEB === "1") return true;
  if (env.ZIGHUB_SERVE_WEB === "0") return false;
  return env.NODE_ENV === "production";
}

export const __testing = {
  isApiPath,
  buildIndexFallbackPath: (root: string) => join(root, "index.html"),
};
