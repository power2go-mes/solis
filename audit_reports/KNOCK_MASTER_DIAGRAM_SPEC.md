# POWER2GO KNOCK — MASTER SYSTEM ARCHITECTURE SPECIFICATION

This document provides the exact technical specification for building the complete visual end-to-end flow diagram of the Power2Go Knock monitoring infrastructure.

---

## LEVEL 1: DATA INGESTION & SOLISCLOUD INTEGRATION

```
[ SolisCloud Enterprise Web Portal ]
           │
           │ (HTTPS POST + HMAC-SHA1 + MD5 Signature + Cookie Token)
           ▼
[ collector_guardian.js / solis_auto_daemon.js ]
  ├── 1. POST /api/login ─────────────► Session Token & Cookies
  ├── 2. Sequential Plant Loop ───────► Iterates 8 Authorized Plants (P1 to P8)
  │      ├── POST /api/station/detailMix ────► Live Power Snapshot & Battery SOC
  │      ├── POST /api/chart/station/day/v2 ─► 5-Min Telemetry Curves (288 pts)
  │      ├── POST /api/chart/station/month ──► Daily Energy Totals
  │      └── POST /api/alarm/list ───────────► Active Alarms & Protection Codes
  └── 3. Data Transformation & Normalization (kW conversion, PKT timestamps)
```

- **Block 1: SolisCloud API Server**
  - *Purpose:* External telemetry source for inverters, batteries, and smart meters.
  - *Protocols:* HTTPS POST with custom HMAC signature (`Authorization: API 2424:...`).
- **Block 2: Node.js Ingestion Engine**
  - *Files:* `solis_auto_daemon.js` (local host daemon) and `collect_live_now.js` (GitHub Actions runner).
  - *Mechanics:* Strictly sequential iteration with rate-limiting backoff (1.5s delay).

---

## LEVEL 2: DUAL-REDUNDANT SCHEDULER

```
                   ┌──────────────────────────────────────────────┐
                   │             SCHEDULING LAYER                 │
                   └──────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     [ Local Windows Host ]                            [ GitHub Actions Cloud ]
  • Registry HKCU Auto-start                       • .github/workflows/solis-sync.yml
  • collector_guardian.js (PID Guard)              • Trigger: cron '*/5 * * * *' (5 mins)
  • solis_auto_daemon.js                           • Failsafe redundancy when PC is asleep
  • Trigger: 1-minute live loop                    • Single-run: node collect_live_now.js
  • Trigger: 6-hour Day 1 backfill audit
```

- **Block 3: Windows Local Daemon**
  - *Trigger:* Auto-starts at user login via Registry Run (`HKCU:\...\Run\Power2GoSolisCollector`).
  - *Guardian:* `collector_guardian.js` monitors process life, prevents duplicate instances via `logs/collector.pid`, and restarts on network failure.
- **Block 4: GitHub Actions Cloud Fallback**
  - *Trigger:* Standard cron running every 5 minutes on GitHub cloud runners.
  - *Outcome:* Ensures database continues receiving data even when local laptop is powered down.

---

## LEVEL 3: SUPABASE POSTGRESQL DATABASE STORAGE

```
                  [ Transformed Normalized Data Arrays ]
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────┐
        │       Supabase PostgreSQL (AWS ap-south-1)          │
        ├─────────────────────────────────────────────────────┤
        │ 1. solis_telemetry_latest                           │
        │    - PK: station_id                                 │
        │    - Behavior: UPSERT overwrite live snapshot       │
        ├─────────────────────────────────────────────────────┤
        │ 2. solis_battery_power_curve                        │
        │    - Unique: (station_id, curve_date, time_str)     │
        │    - Resolution: 5-minute discrete records          │
        │    - Behavior: Batch UNNEST UPSERT                  │
        ├─────────────────────────────────────────────────────┤
        │ 3. solis_daily_energy                               │
        │    - Unique: (station_id, energy_date)              │
        │    - Behavior: UPSERT using GREATEST() logic        │
        ├─────────────────────────────────────────────────────┤
        │ 4. solis_alarm_logs                                 │
        │    - Unique: alarm_pk                               │
        │    - Behavior: Permanent audit log append           │
        └─────────────────────────────────────────────────────┘
```

- **Block 5: PostgreSQL Database Engine**
  - *Host:* AWS Mumbai (`aws-1-ap-south-1.pooler.supabase.com:5432`).
  - *Tables:* 4 active tables (`solis_telemetry_latest`, `solis_battery_power_curve`, `solis_daily_energy`, `solis_alarm_logs`).
  - *Duplicate Prevention:* Hard database unique constraints on `(station_id, date, time)`.

---

## LEVEL 4: NEXT.JS SERVER BACKEND & API ROUTES

```
[ Client Browser / Mobile Web ]
            │ (HTTP GET via SWR / Fetch every 30s)
            ▼
[ Next.js Server Runtime (Vercel / Local Webpack) ]
  ├── GET /api/plants ──────────► Joins latest telemetry & online status
  ├── GET /api/plant/details ───► Fetches single plant metrics & weather
  ├── GET /api/telemetry/curve ─► Fetches 288-pt intraday curve for date
  ├── GET /api/energy/daily ────► Historical generation/consumption breakdown
  ├── GET /api/alarms/all ──────► Active/resolved plant alerts & faults
  └── GET /api/reports ─────────► Fleet generation totals & Excel/PDF data
            │
            ▼ (Parameterized SQL via pg Pool)
[ Supabase PostgreSQL ]
```

- **Block 6: API Layer**
  - *Runtime:* Next.js Serverless Route Handlers (`app/api/*`).
  - *Security:* Connection pooling (`lib/db.ts`), parameterized queries with SQL-injection protection.

---

## LEVEL 5: USER EXPERIENCE & DASHBOARD PRESENTATION

```
[ Modern Single Page Application ]
  ├── 1. Fleet Overview Table (8 Plants, Online/Offline, Live kW, Daily Yield)
  ├── 2. 3D Villa House Power Flow (Animated solar, battery, grid, load currents)
  ├── 3. Dynamic Intraday Chart (ECharts: 5-min PV, battery, load, grid curves)
  ├── 4. Operating Data Multi-Date Navigator (< / > day picker)
  ├── 5. Device, Alarms & Reports Tabs
  └── 6. PDF / Excel Generation Engines (jsPDF + autoTable + canvas image)
```

- **Block 7: User Interface**
  - *Responsive Design:* Tailwind CSS dual desktop/mobile architecture.
  - *Animation:* SVG dashed stroke dash-offset animations for live power currents.
