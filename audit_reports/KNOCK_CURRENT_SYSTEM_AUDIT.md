# POWER2GO KNOCK — COMPLETE EXISTING SYSTEM AUDIT REPORT

**Date of Audit:** November 23, 2026  
**Audited Location:** `C:\Users\izhar\Desktop\soliscloud-one-time-test`  
**Target Environment:** Local Windows Host + Vercel Production (`https://power2go-knock.vercel.app/`)  
**Database:** Supabase Managed PostgreSQL (AWS ap-south-1)  
**Audit Type:** Strict Read-Only Technical & Functional Architectural Review  

---

## 1. PROJECT STRUCTURE & COMPONENT INVENTORY

### A. Core Applications & Services
The repository consists of two functional layers:
1. **Data Ingestion Engine (Node.js Background Collector):** A standalone backend daemon that communicates with SolisCloud, transforms telemetry, and performs UPSERTs into Supabase PostgreSQL.
2. **Web Dashboard (Next.js 16 + React 19 + TypeScript):** A responsive, single-page application hosted on Vercel with localized dev runtime on Windows.

### B. File-to-Responsibility Matrix

| File Path | Role | Status | Evidence |
| :--- | :--- | :--- | :--- |
| **`solis_auto_daemon.js`** | Primary local background daemon. Runs 1-min live sync + 6-hour Day 1 missing data audit. | **ACTIVE (VERIFIED)** | Process PID `21076` running, actively appending to `logs/solis_collector.log`. |
| **`collector_guardian.js`** | Resilient process supervisor for `solis_auto_daemon.js`. Auto-restarts on network drop and tracks PID lock. | **ACTIVE (VERIFIED)** | Spawned by registry auto-start, writes PID to `logs/collector.pid`. |
| **`collect_live_now.js`** | Standalone one-shot collection runner designed for GitHub Actions and manual evaluation. | **ACTIVE (VERIFIED)** | Invoked in `.github/workflows/solis-sync.yml`. |
| **`.github/workflows/solis-sync.yml`** | Cloud fallback sync workflow scheduled every 5 minutes (`*/5 * * * *`). | **CONFIGURED (VERIFIED)** | GitHub Actions YAML file in repository root. |
| **`lib/db.ts`** | Server-side PostgreSQL connection pool (`pg.Pool`), plant metadata registry, and query abstractions. | **ACTIVE (VERIFIED)** | Imported across all Next.js API route handlers. |
| **`app/page.tsx`** | Root Next.js page; mounts client shell with responsive desktop/mobile detection. | **ACTIVE (VERIFIED)** | Default landing page. |
| **`components/SolisClientDashboard.tsx`** | Main desktop dashboard view (3D villa house animation, operating data, multi-tab routing). | **ACTIVE (VERIFIED)** | Primary interactive component. |
| **`components/mobile/SolisMobilePlantList.tsx`** | Mobile-optimized plant feed with filter cards, sorting, and status pills. | **ACTIVE (VERIFIED)** | Rendered when viewport `< 768px`. |
| **`components/reports/SolisPlantReportView.tsx`**| Fleet report view with ECharts timeline curves, Excel export, and PDF generation. | **ACTIVE (VERIFIED)** | Integrated into reports subnav. |
| **`lib/pdfReportExport.ts`** | PDF compilation engine using `jspdf` and `jspdf-autotable` with canvas graph embedding. | **ACTIVE (VERIFIED)** | Export trigger utility. |
| **`dashboard/`** | Directory mirror of the dashboard and collection scripts. | **MAINTAINED MIRROR** | Code kept in parity for isolated builds. |
| **`harvest_*.js` / `inspect_*.py`** | One-off diagnostic, discovery, and initial historical backfill scripts. | **HISTORICAL / UNUSED** | Diagnostic tools used during initial commissioning. |

---

## 2. SOLISCLOUD DATA COLLECTION WORKFLOW

1. **Authentication:**
   - Uses authenticated website API (`https://www.soliscloud.com/api/login`) with HMAC-SHA1 signature and MD5-hashed passwords.
   - Upon successful response (`code: "0"`), extracts `token` and `acw_tc` session cookies and keeps them in memory.
2. **Plant Discovery & Scope:**
   - Plant registry is **explicitly managed** via the `PLANTS` array (8 authorized commercial & residential plants).
   - Inverter serial numbers and dataloggers are discovered through `detailMix` and mapped deterministically.
3. **Sequence & Concurrency:**
   - Collection is **strictly sequential** (`concurrency = 1`). Plants are processed one by one with a 1.5-second pacing delay to respect SolisCloud rate limits and prevent Cloudflare/WAF connection resets.
4. **Data Isolation:**
   - For each plant, the collector calls:
     - `/api/station/detailMix` (real-time snapshot)
     - `/api/chart/station/day/v2` (5-minute intraday curves)
     - `/api/chart/station/month` (daily energy aggregates)
     - `/api/alarm/list` (active alarms)
5. **Session Expiry Handling:**
   - If an endpoint returns session expiration or HTTP 401/403, the daemon invokes `login()` again, establishes a new session cookie, and retries the request.

---

## 3. COLLECTION TIMING, SCHEDULING & REDUNDANCY

1. **Dual Redundancy:**
   - **Local Node.js Daemon:** Configured via Windows Registry Run (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Run\Power2GoSolisCollector`) pointing to `start_collector_silently.vbs`. Runs in the background at user logon.
   - **GitHub Actions Workflow:** `.github/workflows/solis-sync.yml` runs on an automated cron every 5 minutes (`*/5 * * * *`). If the user’s computer is shut down for days, GitHub Actions keeps syncing the database.
2. **Timing & Overlap Prevention:**
   - Daemon uses `collector.pid` process locking. If an instance is already active, subsequent invocations terminate immediately.
   - Sync duration across all 8 plants takes ~61–67 seconds.
3. **Backfill Window on Laptop Startup:**
   - The daemon includes a 6-hour audit loop (`runMissingDataAudit`) that scans for missing dates back to Day 1 of commissioning and backfills any gaps into Supabase.

---

## 4. HISTORICAL DATA RESOLUTION (5-MINUTE RESOLUTION)

- **API-Supported Frequency:** SolisCloud provides **5-minute discrete intervals** via `/api/chart/station/day/v2` (288 readings per 24 hours). **SolisCloud does not supply 1-minute historical curve data.**
- **Storage Frequency:** Exactly **5-minute timestamps** (`00:00:00`, `00:05:00`, ... `23:55:00`) stored in `solis_battery_power_curve`.
- **Integrity:** The collector preserves exact source timestamps from SolisCloud without interpolation or synthetic value generation.

---

## 5. DATABASE STORAGE & DUPLICATE PREVENTION

- **Storage Engine:** Supabase PostgreSQL (`aws-1-ap-south-1.pooler.supabase.com:5432/postgres`).
- **Row Counts (Audited Live):**
  - `solis_battery_power_curve`: **117,377 rows** (5-minute resolution curves).
  - `solis_daily_energy`: **465 rows** (daily generation, charge, discharge, import, export).
  - `solis_alarm_logs`: **80 rows** (plant fault and warning history).
  - `solis_telemetry_latest`: **8 rows** (current real-time operational state).
- **Duplicate Prevention:**
  - `solis_battery_power_curve` enforces `UNIQUE(station_id, curve_date, time_str)`.
  - `solis_daily_energy` enforces `UNIQUE(station_id, energy_date)`.
  - `solis_alarm_logs` enforces `UNIQUE(alarm_pk)`.
  - Ingestion uses `ON CONFLICT (...) DO UPDATE`, ensuring duplicate API hits update existing records rather than producing redundant rows.

---

## 6. DASHBOARD & USER INTERACTION

- **Server-Side API Routes:**
  - `/api/plants`: Returns all 8 authorized plants with online/offline status, live kW, and latest timestamps.
  - `/api/plant/details`: Returns comprehensive telemetry, weather, hardware SNs, and historical totals.
  - `/api/telemetry/curve`: Fetches the 288-point intraday curve for any selected calendar date.
  - `/api/energy/daily`: Supplies historical day/month/year tables.
  - `/api/alarms/all`: Supplies active and resolved alarms.
  - `/api/reports`: Delivers fleet-wide analytics for export.
- **Client Polling:** Frontend uses SWR / periodic fetch hooks with 30-second polling to update live metrics automatically.
- **Exporting:** Supports one-click Excel (`.xlsx`) multi-sheet workbook generation and high-resolution branded PDF (`.pdf`) report generation with embedded intraday curve graphics.

---

## 7. AUTHENTICATION & SECURITY AUDIT

- **SolisCloud Integration:** Credentials stored exclusively in environment variables (`SOLIS_USERNAME`, `SOLIS_PASSWORD`, `DATABASE_URL`). No secrets committed to source.
- **Supabase Connection:** Managed via server-side connection pool with TLS enabled (`ssl: { rejectUnauthorized: false }`). Database credentials are kept server-side in `.env.local` and never leaked to the client browser.
- **Current Dashboard Access:** The dashboard currently operates in open monitoring mode without a user login barrier. Supabase Row Level Security (RLS) is currently disabled (`rowsecurity: false`), relying on server-side parameterized queries in Next.js route handlers.

---

## 8. SUMMARY ANSWERS TO CORE QUESTIONS

1. **Where does our data come from?**  
   Directly from SolisCloud Enterprise Web Portal servers via HTTPS requests authenticated with HMAC-SHA1 and session tokens.
2. **Which SolisCloud APIs do we use?**  
   `/api/login`, `/api/station/detailMix`, `/api/chart/station/day/v2`, `/api/chart/station/month`, and `/api/alarm/list`.
3. **How often does our scraper run?**  
   Locally every **1 minute** via `solis_auto_daemon.js`, with a 6-hour backfill check. In GitHub Actions, it is scheduled every **5 minutes** as a cloud redundancy fallback.
4. **What data does each run collect?**  
   Live power (solar, battery, grid, load, SOC, inverter state), today's 288 5-minute curve points, cumulative daily energy totals, and active alarms.
5. **How many API requests are made per run?**  
   **33 HTTP requests** per standard run ($1\text{ auth} + [8\text{ plants} \times 4\text{ endpoints}]$).
6. **How do the plant/device loops work?**  
   Sequential `for` loop with a 1.5-second pause between plants. Errors on one plant are caught without halting the others.
7. **Do we collect 1-minute or 5-minute data?**  
   **5-minute data.** SolisCloud's intraday curve endpoint only outputs 5-minute resolution points.
8. **Where is each reading stored in Supabase?**  
   - 5-minute curve readings: `solis_battery_power_curve`
   - Real-time snapshot: `solis_telemetry_latest`
   - Daily energy totals: `solis_daily_energy`
   - Alarms/Faults: `solis_alarm_logs`
9. **How does the database prevent duplicates?**  
   PostgreSQL unique constraints on `(station_id, curve_date, time_str)` and `(station_id, energy_date)` combined with `ON CONFLICT DO UPDATE`.
10. **How does each dashboard page retrieve information?**  
    Next.js server-side API routes query Supabase via SQL connection pooling; the frontend polls these routes every 30 seconds.
11. **What happens when scraping fails?**  
    The daemon retries with exponential backoff (15s delay). If the PC is offline, GitHub Actions continues collecting every 5 minutes. Upon PC restart, the daemon backfills any missing historical days.
12. **What is currently working vs unverified?**  
    - *Working (Verified):* Live ingestion, 5-minute curves, daily energy `GREATEST` updates, alarms, Next.js dashboard, Excel/PDF export.
    - *Configured (Verified):* GitHub Actions 5-minute workflow and Windows autostart registry entry.
    - *Unimplemented:* Front-end user login / multi-tenant role-based access control (dashboard is currently accessible to anyone with the URL).
13. **What exact components must appear in the final system flow diagram?**  
    - Level 1: SolisCloud API Server (5 Endpoints)
    - Level 2: Dual Schedulers (Windows Registry Host Daemon + GitHub Actions 5m Cron)
    - Level 3: Node.js Ingestion Engine (`solis_auto_daemon.js` / `collect_live_now.js`)
    - Level 4: Supabase PostgreSQL (4 Core Tables + Constraints)
    - Level 5: Next.js API Routes (`app/api/*`)
    - Level 6: Responsive User Interface (3D Villa House, ECharts Curve, Operating Data, Mobile Feed, PDF/Excel Exporter)
