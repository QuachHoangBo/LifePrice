import type { PriceCardItem } from "@/components/PriceCard";
import {
  formatThousands,
  getDashboardPrices,
  type DashboardPrices,
} from "@/lib/priceMocks";

/*
 * Expo only exposes EXPO_PUBLIC_* variables to the client build.
 * Keep the Firecrawl key here only for local/demo use; production should proxy
 * this through a backend.
 */
function env(name: string): string {
  return (process.env[name] as string | undefined)?.trim() ?? "";
}

export function getFirecrawlConfig() {
  const regionRaw = env("EXPO_PUBLIC_FUEL_PRICE_REGION");
  const fuelPriceRegion: 1 | 2 = regionRaw === "2" ? 2 : 1;
  return {
    apiKey: env("EXPO_PUBLIC_FIRECRAWL_API_KEY"),
    fuelUrl: env("EXPO_PUBLIC_PRICE_URL_FUEL"),
    goldUrl: env("EXPO_PUBLIC_PRICE_URL_GOLD"),
    // Petrolimex: 1 = Region 1, 2 = Region 2.
    fuelPriceRegion,
  };
}

export function shouldAttemptLiveFetch(): boolean {
  const c = getFirecrawlConfig();
  if (!c.apiKey) return false;
  return !!(c.fuelUrl || c.goldUrl);
}

export async function firecrawlScrapeMarkdown(
  url: string,
  apiKey: string,
): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success?: boolean;
      data?: { markdown?: string };
    };
    if (!json.success || typeof json.data?.markdown !== "string") return null;
    return json.data.markdown;
  } catch {
    return null;
  }
}

const FUEL_VND_L_MIN = 13_000;
const FUEL_VND_L_MAX = 40_000;
const GOLD_VND_MIN = 55_000_000;
const GOLD_VND_MAX = 250_000_000;

function pickFuelLiterPriceFromLine(
  line: string,
  regionColumn: 0 | 1,
): number | null {
  const hits: number[] = [];
  for (const m of line.matchAll(/\b\d{1,2}\.\d{3}\b/g)) {
    const n = parseInt(m[0].replace(/\./g, ""), 10);
    if (n >= FUEL_VND_L_MIN && n <= FUEL_VND_L_MAX) hits.push(n);
  }
  for (const m of line.matchAll(/\b\d{5}\b/g)) {
    const n = parseInt(m[0], 10);
    if (n >= FUEL_VND_L_MIN && n <= FUEL_VND_L_MAX) hits.push(n);
  }
  const idx = regionColumn === 1 ? 1 : 0;
  return hits[idx] ?? hits[0] ?? null;
}

function pickGoldTaelPriceFromLine(line: string): number | null {
  const triplets = [...line.matchAll(/\d{1,3}(?:\.\d{3}){2}\b/g)].map((x) =>
    parseInt(x[0].replace(/\./g, ""), 10),
  );
  const plain = [...line.matchAll(/\b\d{7,10}\b/g)].map((x) =>
    parseInt(x[0], 10),
  );
  const ok = [...triplets, ...plain].filter(
    (n) => n >= GOLD_VND_MIN && n <= GOLD_VND_MAX,
  );
  return ok.length ? ok[0]! : null;
}

function firstLineMatch(lines: string[], re: RegExp): string | undefined {
  return lines.find((l) => re.test(l));
}

function withPrice(
  fallback: PriceCardItem,
  live: number | null,
): PriceCardItem {
  return {
    ...fallback,
    price: live !== null ? formatThousands(live) : fallback.price,
    trend: "none",
  };
}

function parseFuel(
  md: string,
  base: PriceCardItem[],
  fuelPriceRegion: 1 | 2,
): PriceCardItem[] {
  const col: 0 | 1 = fuelPriceRegion === 2 ? 1 : 0;
  const lines = md.split("\n");
  const ronL = firstLineMatch(
    lines,
    /RON\s*95(?:-V|-III|\b)|Xăng\s*RON\s*95|RON95/i,
  );
  const e5L =
    firstLineMatch(lines, /E5\s*RON\s*92|E5\s+RON\s*92|Xăng\s*E5\s+RON/i) ??
    firstLineMatch(lines, /\bE5\b.*\bRON\s*92/i);
  const dieL =
    firstLineMatch(lines, /DO\s*0[\d,.]*S|Diesel|Dầu\s*DO|DO\s*0/i) ??
    firstLineMatch(lines, /\bDO\b/i);

  const ron = ronL ? pickFuelLiterPriceFromLine(ronL, col) : null;
  const e5 = e5L ? pickFuelLiterPriceFromLine(e5L, col) : null;
  const die = dieL ? pickFuelLiterPriceFromLine(dieL, col) : null;

  return [
    withPrice(base[0]!, ron),
    withPrice(base[1]!, e5),
    withPrice(base[2]!, die),
  ];
}

function parseGold(md: string, base: PriceCardItem[]): PriceCardItem[] {
  const lines = md.split("\n");
  const buyL =
    firstLineMatch(lines, /Mua\s*vào|mua\s*vào|Giá\s*mua|Buy/i) ??
    firstLineMatch(lines, /Mua/i);
  const sellL =
    firstLineMatch(lines, /Bán\s*ra|bán\s*ra|Giá\s*bán|Sell/i) ??
    firstLineMatch(lines, /Bán/i);

  const buy = buyL ? pickGoldTaelPriceFromLine(buyL) : null;
  const sell = sellL ? pickGoldTaelPriceFromLine(sellL) : null;

  return [withPrice(base[0]!, buy), withPrice(base[1]!, sell)];
}

export type LivePriceSource = "mock" | "live";

export async function fetchMergedDashboardPrices(
  dateIso: string,
  options: { isToday: boolean },
): Promise<{ prices: DashboardPrices; source: LivePriceSource }> {
  const base = getDashboardPrices(dateIso);
  if (!options.isToday || !shouldAttemptLiveFetch()) {
    return { prices: base, source: "mock" };
  }

  const cfg = getFirecrawlConfig();
  const [fuelMd, goldMd] = await Promise.all([
    cfg.fuelUrl
      ? firecrawlScrapeMarkdown(cfg.fuelUrl, cfg.apiKey)
      : Promise.resolve(null),
    cfg.goldUrl
      ? firecrawlScrapeMarkdown(cfg.goldUrl, cfg.apiKey)
      : Promise.resolve(null),
  ]);

  let usedLive = false;
  let fuel = base.fuel;
  let gold = base.gold;

  if (fuelMd) {
    fuel = parseFuel(fuelMd, base.fuel, cfg.fuelPriceRegion);
    usedLive = true;
  }
  if (goldMd) {
    gold = parseGold(goldMd, base.gold);
    usedLive = true;
  }

  return {
    prices: { fuel, gold },
    source: usedLive ? "live" : "mock",
  };
}
