# MT5 TradeTracker — AI Build Prompt

Copy the prompt below and paste it into any capable AI coding assistant (Claude, Cursor, v0, Bolt, etc.)

---

## Prompt

Build me a full-stack MT5 trading performance web app with the following architecture and requirements.

---

### Architecture (this repo: Firebase)

- **MT5 EA (`TradeTracker.mq5`)** — `WebRequest` **POST** to `{APP_URL}/api/mt5/trades` with header `Authorization: Bearer <ingest token>` (no query params). Token is per **Firebase Auth user**, not per bot P&amp;L account.
- **Next.js API + Firebase Admin** — Looks up **`userPrivateSettings`** where `mt5IngestToken` matches; writes **`userPrivateSettings/{uid}/mt5Trades/{ticket}`** (keeps ingest token off the strict `users` profile rules). Requires **`FIREBASE_SERVICE_ACCOUNT`** in server `.env`.
- **Web app** — **Trading → MT5 trade log** (`/trading/mt5_tracker`). First visit creates **`userPrivateSettings/{uid}`** with `mt5IngestToken`. **Regenerate** rotates it. Deploy **`firestore.rules`** and **`firestore.indexes.json`** (index on `userPrivateSettings.mt5IngestToken`).

---

### Supabase Setup

Create a table called `trades` with these columns:

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key, default gen_random_uuid() |
| ticket | bigint | unique, MT5 deal ticket |
| symbol | varchar(20) | e.g. EURUSD |
| trade_type | varchar(4) | BUY or SELL |
| lot_size | numeric(10,2) | |
| open_price | numeric(20,5) | |
| close_price | numeric(20,5) | |
| open_time | timestamptz | |
| close_time | timestamptz | |
| sl | numeric(20,5) | stop loss |
| tp | numeric(20,5) | take profit |
| profit | numeric(12,2) | in account currency |
| pips | numeric(10,1) | |
| commission | numeric(10,2) | |
| swap | numeric(10,2) | |
| magic_number | bigint | EA identifier |
| comment | varchar(255) | trade comment |
| created_at | timestamptz | default now() |

Enable RLS. Add two policies on the `trades` table:
- Allow anon INSERT (so the EA can write)
- Allow anon SELECT (so the web app can read)

---

### MT5 EA Requirements (MQL5)

- Input parameters: `SupabaseURL` (string), `AnonKey` (string), `TableName` (string, default "trades"), `DebugMode` (bool)
- Use `OnTradeTransaction` to detect `TRADE_TRANSACTION_DEAL_ADD` events
- Only process deals where `DEAL_ENTRY == DEAL_ENTRY_OUT` (closing deals)
- Cache open positions in a struct array so SL/TP are captured before the position closes
- Update the cache on `TRADE_TRANSACTION_POSITION` events (handles SL/TP modifications)
- Look up the opening deal from history to get `open_price`, `open_time`, and `trade_type`
- Calculate pips correctly (handle 5-digit brokers: multiply point by 10 for EUR/USD, GBP/USD etc; handle JPY pairs, XAU, indices)
- Build a JSON payload with all fields and POST to `{SupabaseURL}/rest/v1/{TableName}`
- Set headers: `Content-Type: application/json`, `apikey`, `Authorization: Bearer {key}`, `Prefer: return=minimal`
- HTTP 201 = success. Log result with Print()
- The user must whitelist the Supabase domain in MT5: Tools → Options → Expert Advisors → Allow WebRequest

---

### Web App Requirements

**Settings / Connection**
- On first load, show a settings panel asking for Supabase Project URL and Anon Key
- Save credentials to localStorage
- On connect, fetch trades from `/rest/v1/trades?order=close_time.desc&limit=1000`
- Show connection status badge (Demo / Live · N trades)
- Show demo data (generated realistic trades) when not connected

**Summary stat cards (always visible)**
- Total Net P&L (profit + commission + swap)
- Win Rate %
- Total Trades
- Average R:R (avg winning trade / avg losing trade)
- Profit Factor (gross profit / gross loss)
- Max Drawdown $

**Charts**
1. Equity curve — cumulative net P&L over time (area line chart, green if positive, red if negative)
2. P&L by symbol — horizontal bar chart, green/red bars per symbol
3. Drawdown chart — shows peak-to-trough loss at each point in time

**Filters**
- Search by symbol
- Filter by trade type (BUY / SELL)
- Filter by result (Wins / Losses)
- All filters apply to the trade log table (charts always show full data)

**Trade log table** — sortable columns:
- Close Date, Symbol, Type (BUY/SELL chip), Lots, Open Price, Close Price, Pips, Profit, Commission, Swap, Net P&L
- Paginate: show 30 rows, "Load more" button
- Color code Pips and P&L columns (green positive, red negative)

**Demo data generation**
- Generate ~60 realistic trades spanning ~3 months
- Mix of symbols: EURUSD, GBPUSD, USDJPY, XAUUSD, US30, NAS100, GBPJPY
- ~58% win rate
- Random lot sizes: 0.01, 0.05, 0.1, 0.2, 0.5
- Winning trades: 5–40 pips. Losing trades: 5–28 pips
- Include realistic commission (−$0.70 per 0.1 lot) and small swap values

---

### Tech Stack

- **Frontend**: React + Vite (or plain HTML/CSS/JS in a single file — either is fine)
- **Charts**: Recharts (if React) or Chart.js (if plain HTML)
- **Styling**: Tailwind CSS or plain CSS — clean, dark trading terminal aesthetic
- **No backend needed** — Supabase REST API is called directly from the browser

---

### Deliverables

1. `TradeTracker.mq5` — the complete MT5 Expert Advisor
2. `supabase_setup.sql` — SQL to paste into Supabase SQL Editor to create the table, indexes, and RLS policies
3. Web app source files (React project or single `index.html`)
4. Brief setup instructions covering: Supabase project creation, running the SQL, MT5 EA installation and WebRequest whitelist, web app deployment

---

### Notes

- The EA should handle multiple symbols, digits, and pip sizes correctly
- The EA should not duplicate trades — use the deal ticket as unique key; Supabase will reject duplicates on the `ticket` UNIQUE constraint
- The web app should be usable on mobile (responsive layout)
- All monetary values displayed as `$0.00` format; negative values as `−$0.00` not `$−0.00`
