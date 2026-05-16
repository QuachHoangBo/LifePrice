import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Coins, Droplet, Info } from "lucide-react-native";
import { DateSelector } from "@/components/DateSelector";
import { PriceCard } from "@/components/PriceCard";
import type { TrendChartPoint } from "@/components/TrendChart";
import { ensureGoldAsChi } from "@/lib/goldChi";
import {
  fetchMergedDashboardPrices,
  getFirecrawlConfig,
} from "@/lib/livePrices";
import {
  formatLocalISO,
  getDashboardPrices,
  type DashboardPrices,
} from "@/lib/priceMocks";
import {
  buildChipsFromStoredHistory,
  chartPointsForStoredHistory,
  dashboardFromSnapshot,
  dashboardWithStoredTrends,
  listSnapshotDates,
  loadSnapshot,
  pruneOldSnapshots,
  saveSnapshot,
} from "@/lib/priceSnapshots";
import { syncRemoteSnapshots } from "@/lib/remoteSnapshots";

export default function HomeScreen() {
  const router = useRouter();

  const anchorDate = useMemo(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, []);

  const todayId = formatLocalISO(anchorDate);

  const [extraSnapshotDates, setExtraSnapshotDates] = useState<string[]>([]);
  const chips = useMemo(
    () => buildChipsFromStoredHistory(anchorDate, extraSnapshotDates, 30),
    [anchorDate, extraSnapshotDates],
  );

  const [selectedDateId, setSelectedDateId] = useState(todayId);
  const [prices, setPrices] = useState<DashboardPrices>(() =>
    getDashboardPrices(todayId),
  );
  const [fuelChart, setFuelChart] = useState<TrendChartPoint[]>([]);
  const [goldChart, setGoldChart] = useState<TrendChartPoint[]>([]);
  const [dataSourceLabel, setDataSourceLabel] = useState("Đang kiểm tra nguồn");
  const [liveLoading, setLiveLoading] = useState(false);
  const [snapshotSyncVersion, setSnapshotSyncVersion] = useState(0);

  const refreshSnapshotDates = useCallback(async () => {
    await pruneOldSnapshots(anchorDate, 30);
    const dates = await listSnapshotDates();
    setExtraSnapshotDates(dates);
  }, [anchorDate]);

  useEffect(() => {
    void refreshSnapshotDates();
  }, [refreshSnapshotDates]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const synced = await syncRemoteSnapshots(30);
      if (!cancelled && synced > 0) {
        await refreshSnapshotDates();
        setSnapshotSyncVersion((version) => version + 1);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [refreshSnapshotDates]);

  useEffect(() => {
    if (!chips.length) return;
    if (!chips.some((c) => c.id === selectedDateId)) {
      const t = chips.find((c) => c.isToday)?.id ?? chips[chips.length - 1]!.id;
      setSelectedDateId(t);
    }
  }, [chips, selectedDateId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const [fuel, gold] = await Promise.all([
        chartPointsForStoredHistory("fuel", selectedDateId),
        chartPointsForStoredHistory("gold", selectedDateId),
      ]);
      if (cancelled) return;

      setFuelChart(fuel);
      setGoldChart(gold);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [anchorDate, extraSnapshotDates, selectedDateId]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const snap = await loadSnapshot(selectedDateId);
      if (cancelled) return;

      if (snap) {
        const withTrends = await dashboardWithStoredTrends(
          selectedDateId,
          dashboardFromSnapshot(snap),
        );
        if (cancelled) return;
        setPrices(withTrends);
        setDataSourceLabel(
          snap.source === "live"
            ? "Nguồn live đã lưu"
            : snap.source === "mock"
              ? "Dữ liệu mô phỏng đã lưu"
              : "Nguồn dự phòng đã lưu",
        );
        setLiveLoading(false);
        return;
      }

      if (selectedDateId !== todayId) {
        const withTrends = await dashboardWithStoredTrends(
          selectedDateId,
          getDashboardPrices(selectedDateId),
        );
        if (cancelled) return;
        setPrices(withTrends);
        setDataSourceLabel("Dữ liệu mô phỏng");
        setLiveLoading(false);
        return;
      }

      const cfg = getFirecrawlConfig();
      const canCrawl = !!(cfg.apiKey && (cfg.fuelUrl || cfg.goldUrl));

      if (!canCrawl) {
        const mock = getDashboardPrices(todayId);
        const withTrends = await dashboardWithStoredTrends(todayId, mock);
        if (cancelled) return;
        setPrices(withTrends);
        setDataSourceLabel("Dữ liệu mô phỏng");
        setLiveLoading(false);
        await saveSnapshot(todayId, {
          fuel: withTrends.fuel,
          gold: withTrends.gold,
          savedAt: new Date().toISOString(),
          source: "mock",
        });
        if (!cancelled) void refreshSnapshotDates();
        return;
      }

      setLiveLoading(true);
      const { prices: next, source } = await fetchMergedDashboardPrices(
        todayId,
        { isToday: true },
      );
      if (cancelled) return;
      const withTrends = await dashboardWithStoredTrends(todayId, next);
      if (cancelled) return;
      setPrices(withTrends);
      setDataSourceLabel(source === "live" ? "Nguồn live" : "Nguồn dự phòng");
      setLiveLoading(false);
      await saveSnapshot(todayId, {
        fuel: withTrends.fuel,
        gold: withTrends.gold,
        savedAt: new Date().toISOString(),
        source: source === "live" ? "live" : "mixed",
      });
      if (!cancelled) void refreshSnapshotDates();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedDateId, snapshotSyncVersion, todayId, refreshSnapshotDates]);

  const goldDisplay = useMemo(() => ensureGoldAsChi(prices.gold), [prices.gold]);
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} className="bg-emerald-600">
        <View className="px-5 pb-5 pt-1">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-bold tracking-tight text-white">
                LifePrice
              </Text>
              <Text className="mt-1 text-sm leading-5 text-emerald-50">
                Giá xăng dầu và vàng (đ/chỉ).
              </Text>
              {liveLoading ? (
                <View className="mt-2 flex-row items-center gap-2">
                  <ActivityIndicator color="#ecfdf5" size="small" />
                  <Text className="text-xs text-emerald-100">
                    Đang cập nhật...
                  </Text>
                </View>
              ) : (
                <Text className="mt-2 text-xs font-medium text-emerald-100">
                  {dataSourceLabel}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Thông tin"
              hitSlop={12}
              onPress={() => router.push("/about")}
              className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-90"
            >
              <Info size={22} color="#047857" strokeWidth={2.25} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <DateSelector
          selectedId={selectedDateId}
          onSelect={setSelectedDateId}
          chips={chips}
        />

        <View className="mt-5 gap-4 px-5">
          <PriceCard
            title="Xăng dầu"
            Icon={Droplet}
            iconColor="#3b82f6"
            accentBorderClass="border-t-blue-500"
            items={prices.fuel}
            chartData={fuelChart}
            chartColor="#2563eb"
            onHistoryPress={() =>
              router.push({
                pathname: "/history/[kind]",
                params: {
                  kind: "fuel",
                  focusDate: selectedDateId,
                },
              })
            }
          />

          <PriceCard
            title="Vàng SJC"
            Icon={Coins}
            iconColor="#f59e0b"
            accentBorderClass="border-t-amber-500"
            items={goldDisplay}
            chartData={goldChart}
            chartColor="#d97706"
            onHistoryPress={() =>
              router.push({
                pathname: "/history/[kind]",
                params: {
                  kind: "gold",
                  focusDate: selectedDateId,
                },
              })
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}
