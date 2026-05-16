import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DateChip } from "@/components/DateSelector";
import type { PriceCardItem } from "@/components/PriceCard";
import type { TrendChartPoint } from "@/components/TrendChart";
import { ensureGoldAsChi } from "@/lib/goldChi";
import type {
  DashboardPrices,
  HistorySummary,
  PriceCategory,
} from "@/lib/priceMocks";
import { formatLocalISO } from "@/lib/priceMocks";

const PREFIX = "lifeprice:snap:v1:";

export type StoredSnapshot = {
  v: 1;
  fuel: DashboardPrices["fuel"];
  gold: DashboardPrices["gold"];
  savedAt: string;
  source: "live" | "mock" | "mixed";
};

function keyFor(dateIso: string): string {
  return `${PREFIX}${dateIso}`;
}

function asNumber(price: string): number | null {
  const n = parseInt(price.replace(/\./g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function labelForDate(dateIso: string): string {
  const [, m, d] = dateIso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function averagePrice(items: PriceCardItem[]): number | null {
  const values = items.map((item) => asNumber(item.price));
  if (values.some((value) => value === null)) return null;
  const numericValues = values as number[];
  return (
    numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
  );
}

function trendFor(
  current: PriceCardItem,
  previous?: PriceCardItem,
): PriceCardItem["trend"] {
  if (!previous) return "none";
  const curr = asNumber(current.price);
  const prev = asNumber(previous.price);
  if (curr === null || prev === null) return "none";
  if (curr > prev) return "up";
  if (curr < prev) return "down";
  return "none";
}

function applyItemTrends(
  current: PriceCardItem[],
  previous: PriceCardItem[] | undefined,
): PriceCardItem[] {
  return current.map((item, index) => ({
    ...item,
    trend: trendFor(item, previous?.[index]),
  }));
}

export async function saveSnapshot(
  dateIso: string,
  payload: Omit<StoredSnapshot, "v">,
): Promise<void> {
  const body: StoredSnapshot = { v: 1, ...payload };
  await AsyncStorage.setItem(keyFor(dateIso), JSON.stringify(body));
}

export async function removeSnapshot(dateIso: string): Promise<void> {
  await AsyncStorage.removeItem(keyFor(dateIso));
}

export async function loadSnapshot(
  dateIso: string,
): Promise<StoredSnapshot | null> {
  const raw = await AsyncStorage.getItem(keyFor(dateIso));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Partial<StoredSnapshot>;
    if (!p?.fuel || !p?.gold || !p.savedAt) return null;
    return {
      v: 1,
      fuel: p.fuel,
      gold: p.gold,
      savedAt: p.savedAt,
      source: p.source ?? "mixed",
    };
  } catch {
    return null;
  }
}

export function dashboardFromSnapshot(s: StoredSnapshot): DashboardPrices {
  return { fuel: s.fuel, gold: s.gold };
}

export async function dashboardWithStoredTrends(
  dateIso: string,
  dashboard: DashboardPrices,
): Promise<DashboardPrices> {
  const dates = await listSnapshotDates();
  const previousDate = dates.filter((d) => d < dateIso).at(-1);
  const previous = previousDate ? await loadSnapshot(previousDate) : null;
  return {
    fuel: applyItemTrends(dashboard.fuel, previous?.fuel),
    gold: applyItemTrends(dashboard.gold, previous?.gold),
  };
}

export async function listSnapshotDates(): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys
    .filter((k) => k.startsWith(PREFIX))
    .map((k) => k.slice(PREFIX.length))
    .filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso))
    .sort();
}

export async function chartPointsForStoredHistory(
  kind: PriceCategory,
  focusDateIso: string,
  limit = 8,
): Promise<TrendChartPoint[]> {
  const dates = (await listSnapshotDates())
    .filter((dateIso) => dateIso <= focusDateIso)
    .slice(-limit);

  const points: TrendChartPoint[] = [];
  for (const dateIso of dates) {
    const snap = await loadSnapshot(dateIso);
    if (!snap) continue;
    const value =
      kind === "fuel"
        ? averagePrice(snap.fuel)
        : asNumber(ensureGoldAsChi(snap.gold)[1]?.price ?? "");
    if (value === null) continue;
    points.push({
      label: labelForDate(dateIso),
      value,
    });
  }
  return points;
}

/** Remove snapshots older than the local retention window. */
export async function pruneOldSnapshots(
  reference: Date,
  keepDays = 30,
): Promise<void> {
  const start = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  start.setDate(start.getDate() - keepDays);
  const cutoffIso = formatLocalISO(start);
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => {
    if (!k.startsWith(PREFIX)) return false;
    const iso = k.slice(PREFIX.length);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso < cutoffIso;
  });
  if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
}

/** Show stored snapshot days plus today, limited to the retention window. */
export function buildChipsFromStoredHistory(
  reference: Date,
  snapshotDates: string[],
  keepDays = 30,
): DateChip[] {
  const todayIso = formatLocalISO(reference);
  const start = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  start.setDate(start.getDate() - keepDays);
  const cutoffIso = formatLocalISO(start);

  const set = new Set<string>();
  for (const s of snapshotDates) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && s >= cutoffIso && s <= todayIso) {
      set.add(s);
    }
  }
  set.add(todayIso);

  const sorted = [...set].sort();
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return sorted.map((id) => {
    const [y, m, d] = id.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const isToday = id === todayIso;
    return {
      id,
      labelTop: isToday ? "Hôm nay" : dayNames[dt.getDay()]!,
      labelBottom: String(d),
      isToday,
    };
  });
}

function fuelSummary(p: DashboardPrices): string {
  const [a, b, c] = p.fuel;
  return `${a.name}: ${a.price} · ${b.name}: ${b.price} · ${c.name}: ${c.price}`;
}

function goldSummary(p: DashboardPrices): string {
  const [buy, sell] = ensureGoldAsChi(p.gold);
  return `${buy.name}: ${buy.price} ${buy.unit} · ${sell.name}: ${sell.price} ${sell.unit}`;
}

export async function historySummariesAsync(
  kind: PriceCategory,
  focusDate: Date,
): Promise<HistorySummary[]> {
  const n = new Date();
  const ref = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  await pruneOldSnapshots(ref, 30);

  const focusIso = formatLocalISO(focusDate);
  const all = await listSnapshotDates();
  const inWindow = all.filter((d) => d <= focusIso).sort();
  const last8 = inWindow.slice(-8);

  const out: HistorySummary[] = [];
  for (const id of last8) {
    const snap = await loadSnapshot(id);
    if (!snap) continue;
    const p = dashboardFromSnapshot(snap);
    out.push({
      dateIso: id,
      summary: kind === "fuel" ? fuelSummary(p) : goldSummary(p),
    });
  }
  return out;
}
