import { Text, View } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";

export type TrendChartPoint = {
  label: string;
  value: number;
};

export type TrendChartProps = {
  data: TrendChartPoint[];
  color: string;
  caption?: string;
};

const WIDTH = 300;
const HEIGHT = 74;
const PAD_X = 8;
const PAD_Y = 10;

function compactValue(value: number): string {
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export function TrendChart({ data, color, caption }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <View className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
        <Text className="text-xs font-medium text-slate-500">
          Cần thêm một ngày dữ liệu để vẽ biểu đồ.
        </Text>
      </View>
    );
  }

  const values = data.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartW = WIDTH - PAD_X * 2;
  const chartH = HEIGHT - PAD_Y * 2;

  const points = data.map((p, index) => {
    const x = PAD_X + (chartW * index) / (data.length - 1);
    const y = PAD_Y + chartH - ((p.value - min) / range) * chartH;
    return { ...p, x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;

  return (
    <View className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-xs font-semibold text-slate-500">
          {caption ?? `${first.label} - ${last.label}`}
        </Text>
        <Text className="text-xs font-semibold text-slate-700">
          {compactValue(last.value)}
        </Text>
      </View>
      <Svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        accessibilityRole="image"
      >
        <Line
          x1={PAD_X}
          y1={HEIGHT - PAD_Y}
          x2={WIDTH - PAD_X}
          y2={HEIGHT - PAD_Y}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <Polyline
          points={polyline}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />
        {points.map((p, index) => (
          <Circle
            key={`${p.label}-${index}`}
            cx={p.x}
            cy={p.y}
            r={index === points.length - 1 ? 4 : 2.75}
            fill={index === points.length - 1 ? color : "#ffffff"}
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Svg>
    </View>
  );
}
