import type { FastifyInstance } from "fastify";
import { detectCoordinators } from "./coordinator/detect.js";
import { listSerialPorts, type SerialPortLister } from "./coordinator/serialPorts.js";

export interface CoordinatorRoutesOptions {
  lister?: SerialPortLister;
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
}
