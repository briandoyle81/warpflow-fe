/**
 * Local-only fleet composition presets (Manage Navy). Scoped by chain + wallet.
 */

export type FleetComposition = {
  id: string;
  name: string;
  shipIds: string[];
};

export const FLEET_COMPOSITION_EXPORT_KIND =
  "void-tactics-fleet-composition-export" as const;

export type FleetCompositionExportFile = {
  version: "1";
  kind: typeof FLEET_COMPOSITION_EXPORT_KIND;
  chainId: number;
  exportedAt: string;
  fleets: FleetComposition[];
};

function storageKey(chainId: number, address: string): string {
  return `void-tactics-fleet-composition-v1:${chainId}:${address.toLowerCase()}`;
}

export function fleetCompositionLocalNoticeSessionKey(
  chainId: number,
  address: string,
): string {
  return `void-tactics-fleet-composition-local-notice-v1:${chainId}:${address.toLowerCase()}`;
}

export type FleetCompositionPersisted = {
  fleets: FleetComposition[];
  /** Last-opened preset in Manage Navy; validated against `fleets` on read. */
  selectedFleetId: string | null;
};

export function readFleetCompositionPersisted(
  chainId: number,
  address: string | undefined,
): FleetCompositionPersisted {
  if (typeof window === "undefined" || !address) {
    return { fleets: [], selectedFleetId: null };
  }
  try {
    const raw = localStorage.getItem(storageKey(chainId, address));
    if (!raw) return { fleets: [], selectedFleetId: null };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { fleets: [], selectedFleetId: null };
    }
    const po = parsed as Record<string, unknown>;
    const fleetsRaw = po.fleets;
    if (!Array.isArray(fleetsRaw)) return { fleets: [], selectedFleetId: null };
    const fleets = fleetsRaw
      .map((f): FleetComposition | null => {
        if (!f || typeof f !== "object") return null;
        const o = f as Record<string, unknown>;
        const id = typeof o.id === "string" ? o.id : null;
        const name = typeof o.name === "string" ? o.name : null;
        const shipIds = Array.isArray(o.shipIds)
          ? o.shipIds.filter((x): x is string => typeof x === "string")
          : null;
        if (!id || !name || !shipIds) return null;
        return { id, name, shipIds };
      })
      .filter((x): x is FleetComposition => x != null);

    const rawSel = po.selectedFleetId;
    const selectedFleetId =
      typeof rawSel === "string" && rawSel.length > 0 ? rawSel : null;
    const validSelected =
      selectedFleetId && fleets.some((f) => f.id === selectedFleetId)
        ? selectedFleetId
        : null;

    return { fleets, selectedFleetId: validSelected };
  } catch {
    return { fleets: [], selectedFleetId: null };
  }
}

export function writeFleetCompositionPersisted(
  chainId: number,
  address: string,
  fleets: FleetComposition[],
  selectedFleetId: string | null,
): void {
  if (typeof window === "undefined" || !address) return;
  try {
    const k = storageKey(chainId, address);
    if (fleets.length === 0) {
      localStorage.removeItem(k);
    } else {
      localStorage.setItem(
        k,
        JSON.stringify({
          fleets,
          selectedFleetId: selectedFleetId ?? null,
        }),
      );
    }
  } catch (e) {
    console.warn("Failed to persist fleet compositions:", e);
  }
}

export function newFleetCompositionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function parseFleetCompositionImport(
  json: string,
  expectedChainId: number,
):
  | { ok: true; fleets: FleetComposition[] }
  | { ok: false; error: string } {
  try {
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== "object") {
      return { ok: false, error: "Invalid file." };
    }
    const o = data as Record<string, unknown>;
    if (o.kind !== FLEET_COMPOSITION_EXPORT_KIND) {
      return { ok: false, error: "Not a fleet composition export file." };
    }
    if (o.version !== "1") {
      return { ok: false, error: "Unsupported export version." };
    }
    if (typeof o.chainId !== "number" || !Number.isFinite(o.chainId)) {
      return { ok: false, error: "Missing chain id in file." };
    }
    if (o.chainId !== expectedChainId) {
      return {
        ok: false,
        error: `This file is for chain ${o.chainId}; switch networks or use a matching export.`,
      };
    }
    const fleetsRaw = o.fleets;
    if (!Array.isArray(fleetsRaw)) {
      return { ok: false, error: "Missing fleets array." };
    }
    const fleets: FleetComposition[] = [];
    for (const f of fleetsRaw) {
      if (!f || typeof f !== "object") continue;
      const fo = f as Record<string, unknown>;
      const id = typeof fo.id === "string" ? fo.id : newFleetCompositionId();
      const name =
        typeof fo.name === "string" && fo.name.trim()
          ? fo.name.trim()
          : "Imported fleet";
      const shipIds = Array.isArray(fo.shipIds)
        ? fo.shipIds.filter((x): x is string => typeof x === "string")
        : [];
      fleets.push({ id, name, shipIds });
    }
    if (fleets.length === 0) {
      return { ok: false, error: "No valid fleets in file." };
    }
    return { ok: true, fleets };
  } catch {
    return { ok: false, error: "Could not read JSON." };
  }
}

export function buildFleetCompositionExport(
  chainId: number,
  fleets: FleetComposition[],
): FleetCompositionExportFile {
  return {
    version: "1",
    kind: FLEET_COMPOSITION_EXPORT_KIND,
    chainId,
    exportedAt: new Date().toISOString(),
    fleets,
  };
}
