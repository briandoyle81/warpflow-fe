export type PurchaseInfoNormalized = {
  tierCount: number;
  tiers: number[];
  shipsPerTier: number[];
  pricesWei: bigint[];
};

/** Normalize `getPurchaseInfo()` tuple from Ships or ShipPurchaser. */
export function normalizeGetPurchaseInfoTuple(
  data: unknown,
): PurchaseInfoNormalized | null {
  if (!data || !Array.isArray(data) || data.length < 2) return null;
  const ts = data[0] as readonly (bigint | number)[];
  const tp = data[1] as readonly bigint[];
  const n = Math.min(ts.length, tp.length);
  if (n === 0) return null;
  return {
    tierCount: n,
    tiers: Array.from({ length: n }, (_, i) => i),
    shipsPerTier: Array.from({ length: n }, (_, i) =>
      Math.min(255, Math.max(0, Number(ts[i] ?? 0))),
    ),
    pricesWei: Array.from({ length: n }, (_, i) => BigInt(tp[i] ?? 0n)),
  };
}
