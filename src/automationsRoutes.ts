import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import {
  ValidationError,
  create as createAutomation,
  deleteAutomation,
  disable as disableAutomation,
  enable as enableAutomation,
  get as getAutomation,
  list as listAutomations,
  promote as promoteAutomation,
  updateYaml,
  type Automation,
  type AutomationState,
} from "./domain/automations.js";
import { list as listRuns } from "./domain/automationRuns.js";
import { log as auditLog } from "./domain/auditLog.js";
import { parseAutomation } from "./rules/parser.js";

interface CreateBody {
  name: string;
  description?: string;
  source_yaml: string;
}

interface UpdateBody {
  source_yaml: string;
}

export interface AutomationsRoutesOptions {
  db: Database.Database;
}

const STATES: AutomationState[] = ["draft", "active", "disabled"];

export function registerAutomationsRoutes(
  app: FastifyInstance,
  opts: AutomationsRoutesOptions,
): void {
  const { db } = opts;

  app.get<{ Querystring: { state?: string } }>("/api/automations", (request, reply) => {
    const stateParam = request.query.state;
    if (stateParam !== undefined && !STATES.includes(stateParam as AutomationState)) {
      return reply
        .code(400)
        .send({ error: "invalid_state", message: `must be one of ${STATES.join(", ")}` });
    }
    const opts2: Parameters<typeof listAutomations>[1] = {};
    if (stateParam !== undefined) opts2.state = stateParam as AutomationState;
    return reply.send(listAutomations(db, opts2));
  });

  app.get<{ Params: { id: string } }>("/api/automations/:id", (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
    const row = getAutomation(db, id);
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.send(row);
  });

  app.post<{ Body: CreateBody }>(
    "/api/automations",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "source_yaml"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 200 },
            description: { type: "string", maxLength: 2000 },
            source_yaml: { type: "string", minLength: 1, maxLength: 32_000 },
          },
          additionalProperties: false,
        },
      },
    },
    (request, reply) => {
      const parsed = parseAutomation(request.body.source_yaml);
      if (!parsed.ok) {
        return reply.code(400).send({ error: "invalid_yaml", issues: parsed.errors });
      }
      let row: Automation;
      try {
        row = createAutomation(db, {
          name: request.body.name,
          source_yaml: request.body.source_yaml,
          generation_method: "manual",
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: "invalid", message: err.message });
        }
        throw err;
      }
      auditLog(db, {
        category: "automations",
        event: "created",
        details: { id: row.id, name: row.name },
      });
      return reply.send(row);
    },
  );

  app.put<{ Params: { id: string }; Body: UpdateBody }>(
    "/api/automations/:id",
    {
      schema: {
        body: {
          type: "object",
          required: ["source_yaml"],
          properties: { source_yaml: { type: "string", minLength: 1, maxLength: 32_000 } },
          additionalProperties: false,
        },
      },
    },
    (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
      const existing = getAutomation(db, id);
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const parsed = parseAutomation(request.body.source_yaml);
      if (!parsed.ok) {
        return reply.code(400).send({ error: "invalid_yaml", issues: parsed.errors });
      }
      try {
        const row = updateYaml(db, id, request.body.source_yaml);
        auditLog(db, { category: "automations", event: "updated", details: { id } });
        return reply.send(row);
      } catch (err) {
        if (err instanceof ValidationError) {
          return reply.code(400).send({ error: "invalid", message: err.message });
        }
        throw err;
      }
    },
  );

  app.post<{ Params: { id: string } }>("/api/automations/:id/promote", (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
    const existing = getAutomation(db, id);
    if (!existing) return reply.code(404).send({ error: "not_found" });

    const parsed = parseAutomation(existing.source_yaml);
    if (!parsed.ok) {
      return reply.code(400).send({ error: "invalid_yaml", issues: parsed.errors });
    }
    try {
      const row = promoteAutomation(db, id);
      auditLog(db, { category: "automations", event: "promoted", details: { id } });
      return reply.send(row);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.code(409).send({ error: "invalid_state", message: err.message });
      }
      throw err;
    }
  });

  app.post<{ Params: { id: string } }>("/api/automations/:id/disable", (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
    if (!getAutomation(db, id)) return reply.code(404).send({ error: "not_found" });
    try {
      const row = disableAutomation(db, id);
      auditLog(db, { category: "automations", event: "disabled", details: { id } });
      return reply.send(row);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.code(409).send({ error: "invalid_state", message: err.message });
      }
      throw err;
    }
  });

  app.post<{ Params: { id: string } }>("/api/automations/:id/enable", (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
    if (!getAutomation(db, id)) return reply.code(404).send({ error: "not_found" });
    try {
      const row = enableAutomation(db, id);
      auditLog(db, { category: "automations", event: "enabled", details: { id } });
      return reply.send(row);
    } catch (err) {
      if (err instanceof ValidationError) {
        return reply.code(409).send({ error: "invalid_state", message: err.message });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/api/automations/:id/runs",
    (request, reply) => {
      const id = Number.parseInt(request.params.id, 10);
      if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
      if (!getAutomation(db, id)) return reply.code(404).send({ error: "not_found" });
      const limit = request.query.limit ? Number.parseInt(request.query.limit, 10) : 20;
      return reply.send(listRuns(db, id, Number.isFinite(limit) ? limit : 20));
    },
  );

  app.delete<{ Params: { id: string } }>("/api/automations/:id", (request, reply) => {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isFinite(id)) return reply.code(404).send({ error: "not_found" });
    const existing = getAutomation(db, id);
    if (!existing) return reply.code(404).send({ error: "not_found" });
    if (existing.state === "active") {
      return reply.code(409).send({
        error: "active_cannot_delete",
        message: "disable this automation before deleting",
      });
    }
    deleteAutomation(db, id);
    auditLog(db, { category: "automations", event: "deleted", details: { id } });
    return reply.code(204).send();
  });
}
