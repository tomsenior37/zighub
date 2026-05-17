import type { FastifyInstance } from "fastify";
import { detectCoordinators } from "./coordinator/detect.js";
import { listSerialPorts, type SerialPortLister } from "./coordinator/serialPorts.js";
import { SETTINGS_KEYS, type SettingsRepo } from "./domain/settings.js";

export interface CoordinatorRoutesOptions {
  lister?: SerialPortLister;
  settings?: SettingsRepo;
}

interface SelectBody {
  path: string;
}

interface SelectedSetting {
  path: string;
  selectedAt: number;
}

export function registerCoordinatorRoutes(
  app: FastifyInstance,
  opts: CoordinatorRoutesOptions = {},
): void {
  app.get("/api/coordinators/ports", async () => {
    return listSerialPorts(opts.lister);
  });

  app.get("/api/coordinators/detect", async () => {
    return detectCoordinators(opts.lister);
  });

  app.get("/api/coordinators/selected", () => {
    if (!opts.settings) {
      return null;
    }
    return opts.settings.get<SelectedSetting>(SETTINGS_KEYS.COORDINATOR_PATH);
  });

  app.post<{ Body: SelectBody }>(
    "/api/coordinators/select",
    {
      schema: {
        body: {
          type: "object",
          required: ["path"],
          properties: {
            path: { type: "string", minLength: 1, maxLength: 256 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const { path } = request.body;
      const ports = await listSerialPorts(opts.lister);
      if (!ports.some((p) => p.path === path)) {
        return reply.code(400).send({ error: "port_not_found", path });
      }

      const record: SelectedSetting = { path, selectedAt: Date.now() };
      opts.settings?.set(SETTINGS_KEYS.COORDINATOR_PATH, record);
      return reply.send(record);
    },
  );
}
