# Data Pipeline Notes

## Current Direction

LifePrice should treat Supabase as the source of truth for historical price
snapshots. The mobile app should read from Supabase, cache the result in
AsyncStorage, and render from that cache for fast/offline access.

Long-term flow:

```txt
Price sources on the web
 -> GitHub Actions scheduled job
 -> Firecrawl scrape/parse
 -> validate and normalize
 -> upsert Supabase price_snapshots
 -> app syncs Supabase into AsyncStorage
 -> app renders history
```

The app should not depend on each user's device to create historical data.
Mobile background tasks are not reliable enough for daily snapshots, and public
client keys should not be used to write trusted price rows.

## Current App Behavior

- Supabase table: `public.price_snapshots`
- App env:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- App sync:
  - Fetch up to 30 rows from Supabase.
  - Save rows into AsyncStorage.
  - Remove local cached snapshot days that no longer exist remotely.
  - Reload the selected snapshot after a remote sync.
- Chart:
  - No demo history fallback.
  - If fewer than 2 real points exist, show the empty-state message.
- Gold:
  - Store SJC gold in Supabase as `VND/luong`.
  - App converts display to `VND/chi`.

## Planned GitHub Actions Job

Run twice per day in Vietnam time:

```txt
05:00 Asia/Ho_Chi_Minh -> 22:00 UTC previous day
17:00 Asia/Ho_Chi_Minh -> 10:00 UTC same day
```

Cron candidates:

```yaml
schedule:
  - cron: "0 22 * * *"
  - cron: "0 10 * * *"
```

The job should use GitHub Secrets:

```txt
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIRECRAWL_API_KEY
PRICE_URL_FUEL
PRICE_URL_GOLD
FUEL_PRICE_REGION
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` or production Firecrawl secrets in the
mobile app.

## Guardrails To Add Before Relying On Automation

### Validation

- Fuel prices must stay within a realistic range, for example
  `13,000 - 40,000 VND/liter`.
- Gold prices must stay within a realistic range, for example
  `55,000,000 - 250,000,000 VND/luong`.
- Reject missing required items:
  - Fuel: RON95, E5 RON92, Diesel.
  - Gold: buy, sell.
- Compare with the previous accepted snapshot. If the parsed value jumps too
  much, reject it or try a unit correction first.

### Safe Update Rules

- If fuel succeeds and gold fails, update fuel and keep the previous gold.
- If gold succeeds and fuel fails, update gold and keep the previous fuel.
- If both fail, keep the previous row and do not overwrite with mock data.
- Never overwrite a good row with fallback/mock data from an automation job.
- Use `upsert` by `date`, because only the latest price per day is needed for
  now.

### Unit Recovery

If gold parsing returns a value that looks like `VND/chi`, try converting it to
`VND/luong` before rejecting:

```txt
16,500,000 VND/chi -> 165,000,000 VND/luong
```

Only accept the corrected value if it passes validation.

### Source Fallbacks

Try the main source first:

```txt
Fuel: Petrolimex
Gold: SJC official page
```

If parsing fails, later add fallback sources. Fallback data should be marked as
`source = mixed` or `source = fallback`.

## Future Admin / Dry-Run Idea

Before building a full admin app, add a manual GitHub Actions `workflow_dispatch`
mode:

```txt
mode = dry-run
```

Dry-run should:

- Fetch the sources.
- Parse the data.
- Validate the result.
- Print raw matched lines and parsed values.
- Not write to Supabase.

This supports a daily pre-check workflow:

```txt
04:30 VN time: run dry-run manually
if parser fails: inspect logs, fix parser/source, rerun dry-run
05:00 VN time: scheduled job commits data
```

Admin dashboard can come later if needed:

- Test fetch button.
- Show raw source snippets.
- Show parsed result.
- Commit button.
- Manual correction form.

## Possible Schema Additions Later

Current table is enough for one latest row per day:

```txt
date primary key
fuel jsonb
gold jsonb
source text
fetched_at timestamptz
```

Consider adding:

```sql
alter table public.price_snapshots
add column if not exists status text not null default 'ok',
add column if not exists error text,
add column if not exists checked_at timestamptz;
```

Suggested statuses:

```txt
ok       -> full live data accepted
partial  -> one category updated, one category reused
stale    -> job ran but kept old data
fallback -> fallback source accepted
```

Use `checked_at` to know the job ran even when prices were not updated.

## Later Optimization Checklist

- Move Firecrawl usage out of the mobile app before release.
- Add GitHub Actions scheduled job.
- Add `workflow_dispatch` dry-run.
- Add validation and previous-day comparison.
- Add safe partial updates.
- Add structured logs for parser failures.
- Consider `status`, `error`, and `checked_at` columns.
- Keep Supabase as source of truth and AsyncStorage as cache only.
