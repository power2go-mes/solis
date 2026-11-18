# SolisCloud Solar, Battery, BMS & Fault Monitoring Dashboard

A production-quality **SolisCloud-style Solar, Battery, BMS & Fault Monitoring Dashboard** built with Next.js (App Router), TypeScript, React, Tailwind CSS, and Apache ECharts, powered exclusively by existing Supabase PostgreSQL telemetry.

---

## Architecture & Safety Guarantees

This dashboard implements strict 3-tier decoupling:
1. **Layer 1 — Existing Scraper (READ-ONLY):** Remains 100% untouched. No scraper files were modified, moved, or executed during dashboard development.
2. **Layer 2 — Supabase PostgreSQL Database (READ-ONLY):** All dashboard data queries use parameterized read-only `SELECT` queries with SSL. No database schemas, rows, or policies are modified.
3. **Layer 3 — Next.js Dashboard:** Resides completely in `dashboard/`. Does not call SolisCloud APIs, never uses SolisCloud credentials, and remains fully functional even when the scraper is offline.

---

## Features & Implemented Pages

1. **Overview Dashboard (`/`):**
   - Plant selector supporting all 7 authorized SolisCloud sites.
   - SVG Animated Power Flow Diagram reflecting real-time generation, battery charge/discharge, grid import/export, and facility load.
   - 24-hour 5-minute operating power curve (ECharts) with crosshairs and zoom.
   - High-voltage battery pack gauge (SOC, SOH, Voltage, Current, Power).
   - Solar MPPT string telemetry (PV1–PV4 voltages, currents, and powers).
   - Station metadata and carbon savings (avoided CO2, trees planted, coal saved).

2. **Historical Energy Analytics (`/analytics`):**
   - Multi-metric daily energy accounting bar chart (Solar PV, Battery Charge, Battery Discharge, Grid Import, Grid Export, Load).
   - Timeframe filtering (30 days, 90 days, all 121+ historical days).
   - Self-sufficiency and grid dependence calculation.
   - One-click CSV export of historical ledger data.

3. **Battery & BMS/BMU Diagnostics (`/bms`):**
   - Deep cell balance monitoring: Min/Max cell voltages, delta (mV), cell location identifiers.
   - Thermal telemetry: Average, min, max temperatures (°C) and sensor locations.
   - Operational setpoints: Dynamic charge current limits, target voltage, and discharge cutoff.
   - Decoded alarm registers: `bms_alarm` (0x0000), `failure_info_01`, and `failure_info_02`.

4. **Inverter & 3-Phase Grid Telemetry (`/inverters`):**
   - Multi-inverter overview (e.g. Inverters 1 & 2 for Menu Karachi Office).
   - Active power PAC, DC bus voltage, internal temperatures, and operating states.
   - 3-Phase AC grid measurements: Phase A, B, and C voltages, currents, and powers.
   - Grid frequency (Hz) and power factor.

5. **Alarms, Errors & Event Logs (`/alarms`):**
   - Comprehensive filterable alarm ledger (Severity Level 1/2/3, State Active/Recovered, Code search).
   - Decodes known codes: `1054` (UN-Vbatt), `1055` (NO-Battery), `1015` (NO-Grid), `1011` (UN03-G-V sag), `1027` (DC-INTF), `2011`, and `2012`.
   - Recurring fault frequency analytics.

6. **System Health & Forensic Audit (`/health`):**
   - Dedicated investigation module for the **Menu Karachi Office, November 8–17, 2026** incident.
   - 10-day numerical parity verification comparing 5-minute curve integration against daily counter tables (proving the 808.4 kWh real PV generation).
   - Datalogger packet collision analysis (17–54 second packet flood).
   - Categorization into Confirmed Facts, Probable Explanations, and Unverified Hypotheses.
   - Technician remediation action plan.

7. **Cross-Plant Portfolio Monitoring (`/plants`):**
   - Overview of all 7 authorized SolisCloud plants with capacity totals and Supabase ingestion status.

---

## Local Development & Startup Instructions

### 1. Requirements
- Node.js >= 18.0.0 (Tested on Node v24.18.0)
- npm >= 9.0.0

### 2. Configure Database Connection
Create `.env.local` inside the `dashboard/` folder (already provided):
```bash
DATABASE_URL=postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

### 3. Start Development Server
```bash
cd dashboard
npm run dev
```

The dashboard will be available at:
**`http://localhost:3000`**

### 4. Build for Production
```bash
cd dashboard
npm run build
npm run start
```
