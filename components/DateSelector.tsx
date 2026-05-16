import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

export type DateChip = {
  id: string;
  labelTop: string;
  labelBottom: string;
  isToday: boolean;
};

function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildPastWeekChips(reference: Date): DateChip[] {
  const anchor = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );
  const chips: DateChip[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const isToday = i === 0;
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    chips.push({
      id: formatLocalISO(d),
      labelTop: isToday ? "Hôm nay" : dayNames[d.getDay()],
      labelBottom: String(d.getDate()),
      isToday,
    });
  }
  return chips;
}

export type DateSelectorProps = {
  selectedId: string;
  onSelect: (dateIso: string) => void;
  reference?: Date;
  chips?: DateChip[];
};

export function DateSelector({
  selectedId,
  onSelect,
  reference = new Date(),
  chips: chipsProp,
}: DateSelectorProps) {
  const chips = useMemo(
    () => chipsProp ?? buildPastWeekChips(reference),
    [chipsProp, reference],
  );

  return (
    <View className="mt-1">
      <Text className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Chọn ngày
      </Text>
      <FlatList
        horizontal
        data={chips}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-5 pb-1"
        extraData={selectedId}
        renderItem={({ item }) => {
          const selected = item.id === selectedId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={
                item.isToday
                  ? `Hôm nay ngày ${item.labelBottom}`
                  : `${item.labelTop} ngày ${item.labelBottom}`
              }
              onPress={() => onSelect(item.id)}
              className={`min-w-[72px] items-center rounded-xl border px-3 py-2.5 active:opacity-80 ${
                selected
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-slate-200 bg-white"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selected ? "text-white" : "text-slate-600"
                }`}
              >
                {item.labelTop}
              </Text>
              <Text
                className={`mt-0.5 text-lg font-bold ${
                  selected ? "text-white" : "text-slate-900"
                }`}
              >
                {item.labelBottom}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
