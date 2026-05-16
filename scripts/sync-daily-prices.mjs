const FUEL_VND_L_MIN = 13_000;
const FUEL_VND_L_MAX = 40_000;
const GOLD_VND_MIN = 55_000_000;
const GOLD_VND_MAX = 250_000_000;
const SCRIPT_VERSION = "2026-05-16.3";

// ================= ENV =================
function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

// ================= UTIL =================
function formatThousands(value) {
  return Math.round(value).toLocaleString("vi-VN");
}

function todayInVietnam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) throw new Error("Could not resolve Vietnam date");
  return `${y}-${m}-${d}`;
}

// ================= FIRECRAWL =================
async function firecrawlScrapeMarkdown(url, apiKey) {
  if (!url) return null;

  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      waitFor: 3000, // 🔥 quan trọng để load JS
    }),
  });

  if (!res.ok) {
    console.log(`Firecrawl failed ${res.status} for ${url}`);
    return null;
  }

  const json = await res.json();
  return json?.data?.markdown ?? null;
}

// ================= PARSE COMMON =================
function numbersFromLine(line, min, max) {
  const values = [];

  for (const match of line.matchAll(/\b\d{1,3}(?:\.\d{3})+\b/g)) {
    const n = Number.parseInt(match[0].replace(/\./g, ""), 10);
    if (n >= min && n <= max) values.push(n);
  }

  for (const match of line.matchAll(/\b\d{5,10}\b/g)) {
    const n = Number.parseInt(match[0], 10);
    if (n >= min && n <= max) values.push(n);
  }

  return values;
}

function firstPricedLineMatch(lines, re, min, max) {
  return lines.find(
    (line) => re.test(line) && numbersFromLine(line, min, max).length > 0,
  );
}

// ================= FUEL =================
function parseFuel(md, region) {
  const regionIndex = region === "2" ? 1 : 0;
  const lines = md.split("\n");

  const ronLine = firstPricedLineMatch(
    lines,
    /RON\s*95|RON95/i,
    FUEL_VND_L_MIN,
    FUEL_VND_L_MAX,
  );

  const e5Line = firstPricedLineMatch(
    lines,
    /E5.*RON\s*92/i,
    FUEL_VND_L_MIN,
    FUEL_VND_L_MAX,
  );

  const dieselLine = firstPricedLineMatch(
    lines,
    /DO|Diesel/i,
    FUEL_VND_L_MIN,
    FUEL_VND_L_MAX,
  );

  const pick = (line) => {
    if (!line) return null;
    const values = numbersFromLine(line, FUEL_VND_L_MIN, FUEL_VND_L_MAX);
    return values[regionIndex] ?? values[0] ?? null;
  };

  const ron95 = pick(ronLine);
  const e5 = pick(e5Line);
  const diesel = pick(dieselLine);

  if (!ron95 || !e5 || !diesel) {
    console.log("Fuel parse failed", {
      ronLine,
      e5Line,
      dieselLine,
    });
    return null;
  }

  return [
    { name: "RON 95", price: formatThousands(ron95), unit: "đ/lít", trend: "none" },
    { name: "E5 RON 92", price: formatThousands(e5), unit: "đ/lít", trend: "none" },
    { name: "Diesel", price: formatThousands(diesel), unit: "đ/lít", trend: "none" },
  ];
}

// ================= GOLD (tygia.vn) =================
function parseGold(md) {
  const lines = md.split("\n");

  const targetLine =
    lines.find(
      (l) =>
        /SJC/i.test(l) &&
        /\d{1,3}(?:\.\d{3}){2,3}/.test(l)
    ) ||
    lines.find((l) =>
      /\d{1,3}(?:\.\d{3}){2,3}/.test(l)
    );

  if (!targetLine) {
    console.log("Gold parse failed: no valid line");
    return null;
  }

  const values = [
    ...targetLine.matchAll(/\d{1,3}(?:\.\d{3}){2,3}/g),
  ].map((m) => Number(m[0].replace(/\./g, "")));

  console.log("Gold line:", targetLine);
  console.log("Gold values:", values);

  if (values.length < 2) {
    console.log("Gold parse failed: not enough values");
    return null;
  }

  const buy = values[0];
  const sell = values[1];

  if (
    buy < GOLD_VND_MIN ||
    buy > GOLD_VND_MAX ||
    sell < GOLD_VND_MIN ||
    sell > GOLD_VND_MAX
  ) {
    console.log("Gold out of range", { buy, sell });
    return null;
  }

  return [
    { name: "Mua vào", price: formatThousands(buy), unit: "đ/lượng", trend: "none" },
    { name: "Bán ra", price: formatThousands(sell), unit: "đ/lượng", trend: "none" },
  ];
}

// ================= SUPABASE =================
async function fetchExistingSnapshot(supabaseUrl, serviceRoleKey, dateIso) {
  const url = new URL("/rest/v1/price_snapshots", supabaseUrl);
  url.searchParams.set("date", `eq.${dateIso}`);
  url.searchParams.set("select", "date,fuel,gold,source,fetched_at");

  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!res.ok) throw new Error(`Supabase select failed: ${res.status}`);
  const rows = await res.json();
  return rows[0] ?? null;
}

async function upsertSnapshot(supabaseUrl, serviceRoleKey, row) {
  const url = new URL("/rest/v1/price_snapshots", supabaseUrl);
  url.searchParams.set("on_conflict", "date");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${body}`);
  }

  return res.json();
}

// ================= MAIN =================
async function main() {
  const firecrawlApiKey = requiredEnv("FIRECRAWL_API_KEY");
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  const fuelUrl = optionalEnv("PRICE_URL_FUEL");
  const goldUrl = optionalEnv("PRICE_URL_GOLD");
  const fuelRegion = optionalEnv("FUEL_PRICE_REGION") || "1";

  const dateIso = todayInVietnam();

  console.log(`Syncing prices for ${dateIso}`);
  console.log(`Script version ${SCRIPT_VERSION}`);

  const [fuelMd, goldMd] = await Promise.all([
    firecrawlScrapeMarkdown(fuelUrl, firecrawlApiKey),
    firecrawlScrapeMarkdown(goldUrl, firecrawlApiKey),
  ]);

  const fuel = fuelMd ? parseFuel(fuelMd, fuelRegion) : null;
  const gold = goldMd ? parseGold(goldMd) : null;

  const existing = await fetchExistingSnapshot(
    supabaseUrl,
    serviceRoleKey,
    dateIso,
  );

  if (!fuel && !gold && existing) {
    console.log("No valid parsed data. Keeping existing snapshot.");
    return;
  }

  if (!fuel && !gold && !existing) {
    throw new Error("No valid data and no fallback snapshot");
  }

  const row = {
    date: dateIso,
    fuel: fuel ?? existing?.fuel,
    gold: gold ?? existing?.gold,
    source: fuel && gold ? "live" : "mixed",
    fetched_at: new Date().toISOString(),
  };

  if (!row.fuel || !row.gold) {
    throw new Error("Snapshot incomplete");
  }

  const result = await upsertSnapshot(
    supabaseUrl,
    serviceRoleKey,
    row,
  );

  console.log("Saved snapshot", {
    date: dateIso,
    source: row.source,
    fuelUpdated: Boolean(fuel),
    goldUpdated: Boolean(gold),
    rows: result.length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});