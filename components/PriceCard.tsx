import { Pressable, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react-native";
import { TrendChart, type TrendChartPoint } from "@/components/TrendChart";

export type PriceTrend = "up" | "down" | "none";

export type PriceCardItem = {
  name: string;
  price: string;
  unit: string;
  trend: PriceTrend;
};

export type PriceCardProps = {
  title: string;
  Icon: LucideIcon;
  iconColor: string;
  accentBorderClass: string;
  items: PriceCardItem[];
  chartData?: TrendChartPoint[];
  chartColor?: string;
  chartCaption?: string;
  onHistoryPress?: () => void;
};

const trendStroke = {
  up: "#ef4444",
  down: "#10b981",
  none: "#94a3b8",
} as const;

function TrendIcon({ trend }: { trend: PriceTrend }) {
  if (trend === "up") {
    return <ArrowUpRight size={14} color={trendStroke.up} strokeWidth={2.5} />;
  }
  if (trend === "down") {
    return (
      <ArrowDownRight size={14} color={trendStroke.down} strokeWidth={2.5} />
    );
  }
  return <Minus size={14} color={trendStroke.none} strokeWidth={2.5} />;
}

export function PriceCard({
  title,
  Icon,
  iconColor,
  accentBorderClass,
  items,
  chartData,
  chartColor,
  chartCaption,
  onHistoryPress,
}: PriceCardProps) {
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${accentBorderClass} border-t-4`}
    >
      <View className="px-4 pb-4 pt-3">
        <View className="mb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Icon size={22} color={iconColor} strokeWidth={2.25} />
            <Text className="text-base font-bold text-slate-900">{title}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lịch sử ${title}`}
            accessibilityHint="Mở màn hình biến động giá theo ngày"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            onPress={onHistoryPress}
            className="rounded-full bg-slate-100 px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-xs font-semibold text-slate-700">
              Lịch sử
            </Text>
          </Pressable>
        </View>

        <View className="gap-3.5">
          {items.map((item) => (
            <View
              key={item.name}
              className="flex-row items-center justify-between gap-3"
            >
              <Text className="flex-1 text-sm text-slate-800">{item.name}</Text>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-bold text-slate-900">
                  {item.price}
                </Text>
                <Text className="text-xs text-slate-500">{item.unit}</Text>
                <TrendIcon trend={item.trend} />
              </View>
            </View>
          ))}
        </View>

        {chartData ? (
          <TrendChart
            data={chartData}
            color={chartColor ?? iconColor}
            caption={chartCaption}
          />
        ) : null}
      </View>
    </View>
  );
}
