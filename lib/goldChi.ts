import type { PriceCardItem } from "@/components/PriceCard";
import { formatThousands } from "@/lib/priceMocks";

/** Display gold as VND/chi (1 tael = 10 chi). Keep values already in chi. */
export function ensureGoldAsChi(items: PriceCardItem[]): PriceCardItem[] {
  return items.map((it) => {
    if (it.unit.includes("chỉ")) return it;
    const v = parseInt(it.price.replace(/\./g, ""), 10);
    if (!Number.isFinite(v)) return { ...it, unit: "đ/chỉ" };
    return {
      ...it,
      price: formatThousands(Math.round(v / 10)),
      unit: "đ/chỉ",
    };
  });
}
