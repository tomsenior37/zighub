import {
  KNOWN_COORDINATORS,
  isBlocklisted,
  matchKnown,
  type KnownCoordinator,
} from "./knownCoordinators.js";
import { listSerialPorts, type SerialPortInfo, type SerialPortLister } from "./serialPorts.js";

export type DetectionConfidence = "high" | "medium" | "low";

export interface DetectedCoordinator extends SerialPortInfo {
  match: KnownCoordinator | null;
  confidence: DetectionConfidence;
}

const CONFIDENCE_RANK: Record<DetectionConfidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const MANUFACTURER_HEURISTIC = /(sonoff|silicon labs|texas instruments|dresden|deconz)/i;

function vendorIdIsKnown(vendorId: string): boolean {
  return KNOWN_COORDINATORS.some((k) => k.vendorId === vendorId);
}

export function detectCoordinatorsFromPorts(ports: SerialPortInfo[]): DetectedCoordinator[] {
  const classified: DetectedCoordinator[] = [];

  for (const port of ports) {
    if (isBlocklisted(port.vendorId, port.productId)) continue;

    const known = matchKnown(port.vendorId, port.productId);
    if (known) {
      classified.push({ ...port, match: known, confidence: "high" });
      continue;
    }

    if (port.vendorId !== undefined && vendorIdIsKnown(port.vendorId)) {
      classified.push({ ...port, match: null, confidence: "medium" });
      continue;
    }

    if (port.manufacturer !== undefined && MANUFACTURER_HEURISTIC.test(port.manufacturer)) {
      classified.push({ ...port, match: null, confidence: "low" });
    }
  }

  classified.sort((a, b) => {
    const rank = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
    if (rank !== 0) return rank;
    return a.path.localeCompare(b.path);
  });

  return classified;
}

export async function detectCoordinators(
  lister?: SerialPortLister,
): Promise<DetectedCoordinator[]> {
  const ports = await listSerialPorts(lister);
  return detectCoordinatorsFromPorts(ports);
}
