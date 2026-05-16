import type { DashboardPrices } from "@/lib/priceMocks";
import {
  listSnapshotDates,
  removeSnapshot,
  saveSnapshot,
  type StoredSnapshot,
} from "@/lib/priceSnapshots";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";

type SnapshotRow = {
  date: string;
  fuel: DashboardPrices["fuel"];
  gold: DashboardPrices["gold"];
  source: StoredSnapshot["source"] | null;
  fetched_at: string | null;
};

export async function syncRemoteSnapshots(limit = 30): Promise<number> {
  if (!hasSupabaseConfig()) return 0;

  const { data, error } = await supabase
    .from("price_snapshots")
    .select("date,fuel,gold,source,fetched_at")
    .order("date", { ascending: false })
    .limit(limit)
    .returns<SnapshotRow[]>();

  if (error || !data) {
    console.warn("syncRemoteSnapshots failed", error?.message);
    return 0;
  }

  const remoteDates = new Set(data.map((row) => row.date));

  await Promise.all(
    data.map((row) =>
      saveSnapshot(row.date, {
        fuel: row.fuel,
        gold: row.gold,
        savedAt: row.fetched_at ?? new Date().toISOString(),
        source: row.source ?? "mixed",
      }),
    ),
  );

  const localDates = await listSnapshotDates();
  const staleDates = localDates.filter((dateIso) => !remoteDates.has(dateIso));
  await Promise.all(staleDates.map((dateIso) => removeSnapshot(dateIso)));

  return data.length;
}
