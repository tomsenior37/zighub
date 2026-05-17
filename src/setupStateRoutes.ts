import type { FastifyInstance } from "fastify";
import { SETTINGS_KEYS, type SettingsRepo } from "./domain/settings.js";
import { log as auditLog } from "./domain/auditLog.js";
import type Database from "better-sqlite3";

interface SetupStateBody {
  firstRunComplete: boolean;
}

export interface SetupStateRoutesOptions {
  settings: SettingsRepo;
  db?: Database.Database;
}

export function registerSetupStateRoutes(
  app: FastifyInstance,
  opts: SetupStateRoutesOptions,
): void {
  const { settings, db } = opts;

  app.get("/api/setup-state", () => {
    const flag = settings.get<boolean>(SETTINGS_KEYS.FIRST_RUN_COMPLETE);
    return { firstRunComplete: flag === true };
  });

  app.post<{ Body: SetupStateBody }>(
    "/api/setup-state",
    {
      schema: {
        body: {
          type: "object",
          required: ["firstRunComplete"],
          properties: { firstRunComplete: { type: "boolean" } },
          additionalProperties: false,
        },
      },
    },
    (request) => {
      const { firstRunComplete } = request.body;
      settings.set(SETTINGS_KEYS.FIRST_RUN_COMPLETE, firstRunComplete);
      if (db) {
        auditLog(db, {
          category: "setup",
          event: "first-run-set",
          details: { firstRunComplete },
        });
      }
      return { firstRunComplete };
    },
  );
}
