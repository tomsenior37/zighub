import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { list as listLocations } from "./domain/locations.js";

export function registerLocationsRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get("/api/locations", () => {
    return listLocations(db);
  });
}
