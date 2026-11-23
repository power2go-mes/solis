# POWER2GO KNOCK — DATABASE AND DATA FLOW AUDIT

## 1. Verified Supabase PostgreSQL Schema

All telemetry and historical data is stored in a managed PostgreSQL database hosted on Supabase (AWS ap-south-1 region, connection pooled via port 5432).

### Schema Table Catalog:

| Table Name | Purpose | Primary Key | Unique Constraints | Approx Rows | Retention |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`solis_telemetry_latest`** | Real-time plant snapshot (single row per plant) | `station_id` (text) | `station_id` | **8** | Overwritten live on each sync cycle |
| **`solis_battery_power_curve`** | 5-minute telemetry intervals (solar, battery kW/SOC, grid, load) | `id` (bigserial) | `(station_id, curve_date, time_str)` | **117,377** | Permanent append-only (UPSERT on timestamp collision) |
| **`solis_daily_energy`** | Daily aggregated energy totals (PV yield, charge, discharge, import, export) | `id` (bigserial) | `(station_id, energy_date)` | **465** | Permanent append-only (UPSERT preserves highest `GREATEST` values) |
| **`solis_alarm_logs`** | Device & plant faults, alarm codes, protection categories, advice | `id` (bigserial) | `alarm_pk` (text) | **80** | Permanent append-only |
| **`solis_bms_telemetry`** | In-depth BMS battery pack & cell telemetry (voltage, current, temps) | `id` (bigserial) | None | **41** | Historical records from BMS diagnostic sweeps |
| **`solis_telemetry`** | Historical snapshot archive | `id` (bigserial) | None | **51** | Historical records |

---

## 2. Row Resolution & Data Granularity

- **API-Supported Granularity:** SolisCloud provides **5-minute discrete intervals** (`timeStr`: `00:00:00`, `00:05:00`, ... `23:55:00`). SolisCloud does **not** provide 1-minute historical curve data via `/api/chart/station/day/v2`.
- **Collector Execution Frequency:** Runs every **1 minute** locally (and every 5 minutes in GitHub Actions). Because SolisCloud updates its 5-minute curve buffer every 5 minutes, running the collector every 1-2 minutes ensures new 5-minute points are ingested into Supabase with zero latency.
- **Database Storage Frequency:** Exactly **5-minute intervals** in `solis_battery_power_curve`.
- **Dashboard Refresh Frequency:** Auto-refreshes every **30 seconds** via client polling hooks and SWR in Next.js.

---

## 3. Transformations & Sign Conventions

1. **Battery Power Sign:**
   - In SolisCloud API, battery power is reported in Watts or kW.
   - Discharging: Power flow outward from battery ($> 0\text{ kW}$ discharge or marked by `battery_state: 'Discharging'`).
   - Charging: Power flow inward into battery ($< 0\text{ kW}$ or marked by `battery_state: 'Charging'`).
   - Stored in database as positive magnitude with a discrete state string column: `battery_direction` ('Charging' | 'Discharging' | 'Idle').

2. **Grid Import vs Export:**
   - On hybrid inverters, grid power is extracted from `mix.psum` / `mix.psumV2`.
   - **Negative kW ($< 0$):** Grid Import / Purchasing from utility.
   - **Positive kW ($> 0$):** Grid Export / Selling to utility.

3. **Cumulative Daily Yield & `GREATEST` Strategy:**
   - Daily yield in `solis_daily_energy` uses:
     $$\text{solar\_pv\_kwh} = \max(\text{incoming}, \text{existing\_recorded})$$
     This guarantees that mid-day Solis server lags never reset or overwrite live generation counters with lower values.
