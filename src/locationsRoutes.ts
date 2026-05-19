import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import {
  ValidationError,
  create as createLocation,
  deleteLocation,
  get as getLocation,
  list as listLocations,
  update as updateLocation,
} from "./domain/locations.js";
import { log as auditLog } from "./domain/auditLog.js";

export function registerLocationsRoutes(app: FastifyInstance, db: Database.Database): void {
  app.get("/api/locations", () => {
    return listLocations(db);
  });

  app.post<{ Body: { name: string } }>(
    "/api/locations",
    {
      schema: {
        body: {
          type: "object",
          properties: { name: { type: "string", minLength: 1, maxLength: 64 } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    (request, reply) => {
      try {
        const location = createLocation(db, { name: request.body.name });
        auditLog(db, {
          category: "locations",
          event: "created",
          details: { id: location.id, name: location.name },
        });
        return reply.code(201).send(location);
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: "invalid", message: err.message });
        }
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
          return reply.code(409).send({ error: "name_collision", message: err.message });
        }
        throw err;
      }
    },
  );

  app.patch<{ Params: { id: string }; Body: { name: string } }>(
    "/api/locations/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string", pattern: "^[0-9]+$" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: { name: { type: "string", minLength: 1, maxLength: 64 } },
          required: ["name"],
          additionalProperties: false,
        },
      },
    },
    (request, reply) => {
      const id = Number(request.params.id);
      try {
        const location = updateLocation(db, id, { name: request.body.name });
        auditLog(db, {
          category: "locations",
          event: "renamed",
          details: { id: location.id, name: location.name },
        });
        return reply.send(location);
      } catch (err) {
        if (err instanceof ValidationError) {
          if (err.message.includes("not found")) {
            return reply.code(404).send({ error: "location_not_found", id });
          }
          return reply.code(400).send({ error: "invalid", message: err.message });
        }
        if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
          return reply.code(409).send({ error: "name_collision", message: err.message });
        }
        throw err;
      }
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/api/locations/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string", pattern: "^[0-9]+$" } },
          required: ["id"],
        },
      },
    },
    (request, reply) => {
      const id = Number(request.params.id);
      const location = getLocation(db, id);
      if (!location) {
        return reply.code(404).send({ error: "location_not_found", id });
      }
      deleteLocation(db, id);
      auditLog(db, {
        category: "locations",
        event: "deleted",
        details: { id, name: location.name },
      });
      return reply.code(204).send();
    },
  );
}
