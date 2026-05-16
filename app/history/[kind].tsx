import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft } from "lucide-react-native";
import {
  isPriceCategory,
  type HistorySummary,
  type PriceCategory,
} from "@/lib/priceMocks";
import { historySummariesAsync } from "@/lib/priceSnapshots";

const TITLES: Record<PriceCategory, string> = {
  fuel: "Xăng dầu - Lịch sử",
  gold: "Vàng SJC - Lịch sử",
};

function formatShownDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  try {
    return date.toLocaleDateString("vi-VN", opts);
  } catch {
    return dateIso;
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: string | string[];
    focusDate?: string | string[];
  }>();

  const routeKindRaw = params.kind;
  const routeKind = Array.isArray(routeKindRaw)
    ? routeKindRaw[0] ?? ""
    : routeKindRaw ?? "";

  const focusDateRaw = params.focusDate;
  const focusDate =
    (Array.isArray(focusDateRaw) ? focusDateRaw[0] : focusDateRaw) ?? "";

  const baseDate = useMemo(() => {
    if (focusDate) {
      const [y, m, d] = focusDate.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }, [focusDate]);

  const [entries, setEntries] = useState<HistorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPriceCategory(routeKind)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void historySummariesAsync(routeKind, baseDate).then((rows) => {
      if (!cancelled) {
        setEntries(rows);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [routeKind, baseDate]);

  if (!isPriceCategory(routeKind)) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-8">
        <StatusBar style="dark" />
        <Text className="text-center text-slate-700">
          Không tìm thấy nhóm giá.
        </Text>
        <Pressable
          className="mt-4 rounded-full bg-emerald-500 px-4 py-2"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-white">Quay lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]} className="border-b border-slate-200 bg-white">
        <View className="flex-row items-center gap-3 px-2 py-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <ChevronLeft size={28} color="#0f172a" strokeWidth={2} />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-slate-900">
            {TITLES[routeKind]}
          </Text>
        </View>
      </SafeAreaView>

      {loading ? (
        <View className="flex-1 items-center justify-center py-16">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          contentContainerClassName="grow gap-3 px-4 py-5"
          data={entries}
          keyExtractor={(item) => item.dateIso}
          ListEmptyComponent={
            <View className="items-center justify-center px-6 py-16">
              <Text className="text-center text-sm leading-6 text-slate-500">
                Chưa có dữ liệu đã lưu.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const focus = focusDate !== "" && focusDate === item.dateIso;
            return (
              <View
                className={`rounded-2xl border bg-white px-4 py-3 shadow-sm ${
                  focus ? "border-emerald-500" : "border-slate-200"
                }`}
              >
                <Text className="text-xs font-semibold uppercase text-slate-500">
                  {formatShownDate(item.dateIso)}
                </Text>
                {focus ? (
                  <Text className="mt-0.5 text-xs font-medium text-emerald-600">
                    Ngày đang chọn
                  </Text>
                ) : null}
                <Text className="mt-2 text-sm leading-5 text-slate-800">
                  {item.summary}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
