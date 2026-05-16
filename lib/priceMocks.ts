import type { PriceCardItem } from "@/components/PriceCard";

export type PriceCategory = "fuel" | "gold";

function hashStr(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Format a VND number with dot thousands separators. */
export function formatThousands(value: number): string {
  const n = Math.round(value);
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function deltaFor(dateIso: string, key: string, range: number): number {
  return hashStr(`${dateIso}|${key}`) % (range * 2 + 1) - range;
}

function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export { formatLocalISO };

const BASE = {
  ron95: 23850,
  e592: 22520,
  diesel: 20880,
  goldBuy: 79220000,
  goldSell: 81220000,
} as const;

function fuelItems(dateIso: string): PriceCardItem[] {
  const ron = BASE.ron95 + deltaFor(dateIso, "ron95", 40) * 10;
  const e5 = BASE.e592 + deltaFor(dateIso, "e592", 40) * 10;
  const die = BASE.diesel + deltaFor(dateIso, "diesel", 45) * 10;

  return [
    {
      name: "RON 95",
      price: formatThousands(ron),
      unit: "đ/L",
      trend: "none",
    },
    {
      name: "E5 RON 92",
      price: formatThousands(e5),
      unit: "đ/L",
      trend: "none",
    },
    {
      name: "Diesel",
      price: formatThousands(die),
      unit: "đ/L",
      trend: "none",
    },
  ];
}

function goldItems(dateIso: string): PriceCardItem[] {
  const buy = BASE.goldBuy + deltaFor(dateIso, "gb", 120) * 5000;
  const sell = BASE.goldSell + deltaFor(dateIso, "gs", 120) * 5000;

  return [
    {
      name: "Mua vào",
      price: formatThousands(buy),
      unit: "đ/lượng",
      trend: "none",
    },
    {
      name: "Bán ra",
      price: formatThousands(sell),
      unit: "đ/lượng",
      trend: "none",
    },
  ];
}

export function getDashboardPrices(dateIso: string) {
  return {
    fuel: fuelItems(dateIso),
    gold: goldItems(dateIso),
  };
}

export type DashboardPrices = ReturnType<typeof getDashboardPrices>;

/** Local calendar dates in YYYY-MM-DD format from (end - count + 1) to end. */
export function listPastIsoDates(end: Date, count: number): string[] {
  const anchor = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    out.push(formatLocalISO(d));
  }
  return out;
}

export type HistorySummary = {
  dateIso: string;
  summary: string;
};

export function historySummaries(
  kind: PriceCategory,
  dateIsoFocus: Date,
): HistorySummary[] {
  const ids = listPastIsoDates(dateIsoFocus, 8);
  return ids.map((id) => {
    const p = getDashboardPrices(id);
    if (kind === "fuel") {
      const [a, b, c] = p.fuel;
      return {
        dateIso: id,
        summary: `${a.name}: ${a.price} · ${b.name}: ${b.price} · ${c.name}: ${c.price}`,
      };
    }
    const [buy, sell] = p.gold;
    return {
      dateIso: id,
      summary: `${buy.name}: ${buy.price} · ${sell.name}: ${sell.price}`,
    };
  });
}

export function isPriceCategory(k: string): k is PriceCategory {
  return k === "fuel" || k === "gold";
}
