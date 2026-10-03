// Which discovered items to fetch and in what order (pure).
import type { DiscoveredItem } from "./types";
import { diffDaysIso } from "./time";

export type MetaRow = {
  externalId: string;
  listSig?: string;
  detailFetchedAt?: number;
  contentFetchedAt?: number;
};

export type PlanOptions = {
  mergeMode: boolean;
  refreshDays: number;
  maxAgeDays?: number;
  today: string;
  now: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlannedItem = DiscoveredItem & { reason: "new" | "changed" | "stale" | "work" };

export function planFetch(items: DiscoveredItem[], meta: MetaRow[], opts: PlanOptions): PlannedItem[] {
  const byId = new Map(meta.map((row) => [row.externalId, row]));
  const rank = { work: 0, new: 1, changed: 2, stale: 3 } as const;
  const planned: PlannedItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    if (opts.maxAgeDays && item.sourceModifiedAt && /^\d{4}-\d{2}-\d{2}/.test(item.sourceModifiedAt)) {
      if (diffDaysIso(item.sourceModifiedAt.slice(0, 10), opts.today) > opts.maxAgeDays) continue;
    }
    if (!item.externalId) {
      planned.push({ ...item, reason: "work" });
      continue;
    }
    const row = byId.get(item.externalId);
    if (opts.mergeMode && item.kind !== "hotel") {
      planned.push({ ...item, reason: "work" });
      continue;
    }
    const fetchedAt = item.kind === "hotel" ? row?.contentFetchedAt : row?.detailFetchedAt;
    if (!row || fetchedAt === undefined) {
      planned.push({ ...item, reason: "new" });
    } else if (item.listSig && row.listSig !== item.listSig) {
      planned.push({ ...item, reason: "changed" });
    } else if (opts.now - fetchedAt > opts.refreshDays * DAY_MS) {
      planned.push({ ...item, reason: "stale" });
    }
  }
  return planned.sort((a, b) => rank[a.reason] - rank[b.reason] || a.priority - b.priority);
}
