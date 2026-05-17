export interface KnownCoordinator {
  vendorId: string;
  productId: string;
  displayName: string;
  family: string;
}

export const KNOWN_COORDINATORS: KnownCoordinator[] = [
  {
    vendorId: "10c4",
    productId: "ea60",
    displayName: "Sonoff ZBDongle-E (or other Silabs CP210x stick)",
    family: "silabs-cp210x",
  },
  {
    vendorId: "1a86",
    productId: "55d4",
    displayName: "Sonoff ZBDongle-P (CC2652P)",
    family: "ti-cc2652p",
  },
  {
    vendorId: "1cf1",
    productId: "0030",
    displayName: "ConBee II",
    family: "deconz-conbee2",
  },
  {
    vendorId: "1cf1",
    productId: "0033",
    displayName: "ConBee III",
    family: "deconz-conbee3",
  },
];

export interface BlocklistEntry {
  vendorId: string;
  productId: string;
  reason: string;
}

export const COORDINATOR_BLOCKLIST: BlocklistEntry[] = [
  {
    vendorId: "0a12",
    productId: "0001",
    reason: "Cambridge Silicon Radio / generic Bluetooth dongle — never a Zigbee coordinator",
  },
];

export function isBlocklisted(
  vendorId: string | undefined,
  productId: string | undefined,
): boolean {
  if (vendorId === undefined || productId === undefined) return false;
  return COORDINATOR_BLOCKLIST.some(
    (entry) => entry.vendorId === vendorId && entry.productId === productId,
  );
}

export function matchKnown(
  vendorId: string | undefined,
  productId: string | undefined,
): KnownCoordinator | null {
  if (vendorId === undefined) return null;
  for (const known of KNOWN_COORDINATORS) {
    if (known.vendorId === vendorId && known.productId === productId) {
      return known;
    }
  }
  return null;
}
