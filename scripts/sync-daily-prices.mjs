const SCRIPT_VERSION = "2026-05-16.3";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function optionalEnv(name) {
  return process.env[name]?.trim() ?? "";
}

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

// Gọi API Firecrawl ép AI tự tìm và bốc chuẩn số
async function firecrawlExtractAll(url, apiKey) {
  if (!url) return null;
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["extract"],
      extract: {
        schema: {
          type: "object",
          properties: {
            gold_buy: { type: "number" },
            gold_sell: { type: "number" },
            ron95: { type: "number" },
            e5: { type: "number" },
            diesel: { type: "number" }
          },
          required: ["gold_buy", "gold_sell", "ron95"]
        },
        prompt: "Lấy giá vàng SJC (mua vào, bán ra) và giá xăng dầu (RON 95, E5, Diesel) mới nhất trên web, trả về số nguyên."
      }
    }),
  });

  if (!res.ok) {
    console.log(`Firecrawl failed ${res.status}`);
    return null;
  }
  const json = await res.json();
  return json?.data?.extract ?? null;
}

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

  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status}`);
  return res.json();
}

async function main() {
  const firecrawlApiKey = requiredEnv("FIRECRAWL_API_KEY");
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const targetUrl = optionalEnv("PRICE_URL_FUEL"); // Chỉ cần dùng 1 link tygia.vn là đủ cào cả 2
  const dateIso = todayInVietnam();

  console.log(`Syncing prices for ${dateIso} using LLM Extract`);

  const rawData = await firecrawlExtractAll(targetUrl, firecrawlApiKey);
  
  let fuel = null;
  let gold = null;

  if (rawData && rawData.ron95 && rawData.gold_buy) {
    fuel = [
      { name: "RON 95", price: formatThousands(rawData.ron95), unit: "đ/lít", trend: "none" },
      { name: "E5 RON 92", price: formatThousands(rawData.e5 || 0), unit: "đ/lít", trend: "none" },
      { name: "Diesel", price: formatThousands(rawData.diesel || 0), unit: "đ/lít", trend: "none" },
    ];
    gold = [
      { name: "Mua vào", price: formatThousands(rawData.gold_buy), unit: "đ/lượng", trend: "none" },
      { name: "Bán ra", price: formatThousands(rawData.gold_sell), unit: "đ/lượng", trend: "none" },
    ];
  }

  const existing = await fetchExistingSnapshot(supabaseUrl, serviceRoleKey, dateIso);

  if (!fuel && !gold && existing) {
    console.log("No valid parsed data. Keeping existing snapshot unchanged.");
    return;
  }

  if (!fuel && !gold && !existing) {
    throw new Error("No valid live data and no existing snapshot to preserve");
  }

  const row = {
    date: dateIso,
    fuel: fuel ?? existing?.fuel,
    gold: gold ?? existing?.gold,
    source: fuel && gold ? "firecrawl_ai" : "mixed",
    fetched_at: new Date().toISOString(),
  };

  const result = await upsertSnapshot(supabaseUrl, serviceRoleKey, row);
  console.log("Saved snapshot successfully!", { date: dateIso, rows: result.length });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});