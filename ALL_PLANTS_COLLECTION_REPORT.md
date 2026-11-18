# SolisCloud — All 7 Authorized Plants One-Time Ingestion & Forensic Report

**Execution Timestamp:** November 18, 2026, 13:05 PKT (UTC+05:00)  
**Authenticated User:** `Qasim Moosvi`  
**Execution Script:** `collect_all_plants_once.js` (Sequential single-shot execution, zero background daemons)  
**Database Target:** Supabase PostgreSQL (`solis_telemetry`, `solis_telemetry_latest`, `solis_bms_telemetry`, `solis_alarm_logs`, `solis_battery_power_curve`, `solis_daily_energy`)  
**Dashboard Status:** 100% Synchronized (`http://localhost:3001`)

---

## 1. Discovered Plants & Hardware Architecture

Through authenticated API discovery (`/api/station/list`), exactly **seven authorized solar power stations** were discovered under the account. All seven were queried sequentially:

| # | Plant Name | Station ID | Capacity (kWp) | Location | Operating State | Associated Inverter(s) | Datalogger Collector SN | Battery Racks |
| :-: | :--- | :--- | :-: | :--- | :---: | :--- | :--- | :--- |
| **1** | **OPL Residence** | `1298491919450958553` | 55.5 | Gharo, Sindh | State 1 (Normal) | `1053050258110159` (S6-EH3P50K-H) | `7A1257240AE01C5A` (WL Cellular) | `1053050258110159BAT01` (PYLON_HV, 100% SOC) |
| **2** | **36 Chenab** | `1298491919450873747` | 25.155 | Lahore, Punjab | State 1 (Normal) | `1053010259280019` (Hybrid) | `7A1259260A40120D` (WL Cellular) | `1053010259280019BAT01` (HV Lithium, 100% SOC) |
| **3** | **P2G 20kw** | `1298491919450851319` | 18.0 | Karachi, Sindh | State 2 (Offline) | `1033161256090193` (Hybrid) | `7A12532605C0A5DB` (WL Cellular) | `1033161256090193BAT01` (HV Lithium, 70% SOC) |
| **4** | **P2G 1ST 6kw** | `1298491919450840394` | 20.0 | Karachi, Sindh | State 1 (Normal) | `1031731257050184` (Hybrid) | `7A1256240B001722` (WL Cellular) | `1031731257050184BAT01` (HV Lithium, 99% SOC) |
| **5** | **Menu Karachi Office** | `1298491919450797504` | 80.0 | Karachi, Sindh | State 3 (Fault) | `1053050258140015`, `1053050258180057` | `7A12570303D040F0` (WL), `5A1249020280457B` (WiFi) | `...140015BAT01`, `...180057BAT01`, `...180057BAT02` |
| **6** | **P2G 50KW** | `1298491919450740581` | 32.0 | Karachi, Sindh | State 1 (Normal) | `1053050255210107` (Hybrid) | `7A12551308F022F8` (WL Cellular) | `1053050255210107BAT01` (HV Lithium, 65% SOC, 2 Units) |
| **7** | **P2G 15KW** | `1298491919450734544` | 20.0 | Karachi, Sindh | State 2 (Offline) | `1033320253150969` (Hybrid) | `7A12541606D04928` (WL Cellular) | `1033320253150969BAT01` (HV Lithium, 21% SOC) |

---

## 2. Ingestion & Storage Results per Plant

Each plant was processed for:
- Live electrical mix (`/api/station/detailMix`)
- Inverter string & 3-phase grid telemetry (`/api/inverter/detail`)
- BMS/BMU deep registers (`batteryList`, `bmsU`, `bmsI`, cell delta, temperature)
- 5-minute instantaneous power curves (`/api/chart/station/day/v2`)
- Historical daily energy accounting records (`/api/chart/station/month`)
- Historical alarm and fault logs (`/api/alarm/list`)

### Summary of Stored Database Records:

| Plant Name | Station ID | `solis_telemetry` | `solis_telemetry_latest` | `solis_bms_telemetry` | `solis_alarm_logs` | `solis_battery_power_curve` | `solis_daily_energy` |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **OPL Residence** | `1298491919450958553` | 17 | Synchronized | 7 | 5 | 152 points | 30 days |
| **36 Chenab** | `1298491919450873747` | 1 | Synchronized | 1 | 4 | 156 points | 18 days |
| **P2G 20kw** | `1298491919450851319` | 1 | Synchronized | 1 | 8 | 0 points (Offline) | 0 days (Offline) |
| **P2G 1ST 6kw** | `1298491919450840394` | 1 | Synchronized | 1 | 9 | 155 points | 18 days |
| **Menu Karachi Office** | `1298491919450797504` | 3 | Synchronized | 3 | 23 | 157 points | 121 days |
| **P2G 50KW** | `1298491919450740581` | 1 | Synchronized | 1 | 12 | 145 points | 18 days |
| **P2G 15KW** | `1298491919450734544` | 1 | Synchronized | 1 | 9 | 0 points (Offline) | 1 day |
| **TOTALS** | — | **25 rows** | **7 rows (100%)** | **15 rows** | **70 alarms** | **765 points** | **206 days** |

---

## 3. Telemetry Freshness & Operational Profiles

### 1. OPL Residence (`1298491919450958553`)
* **Solar Generation:** 33.8 kW (Day yield: 137.5 kWh)
* **Battery:** 100% SOC (Idle, 0 kW, 722.2 V)
* **Grid Flow:** Exporting 31.152 kW to utility grid
* **Facility Load:** 1.4 kW
* **Alarms:** 5 recovered historical grid/battery disconnects

### 2. 36 Chenab (`1298491919450873747`)
* **Solar Generation:** 5.3 kW (Day yield: 55.4 kWh)
* **Battery:** 100% SOC (Idle, 0 kW, Nominal ~718 V)
* **Grid Flow:** Exporting 10.6 kW
* **Facility Load:** 3.3 kW
* **Alarms:** 4 recovered alarms

### 3. P2G 20kw (`1298491919450851319`)
* **Status:** Inverter State 2 (Offline / Disconnected from Cloud)
* **Last Known Battery SOC:** 70%
* **Telemetry Note:** Because the station is offline in SolisCloud, 5-minute curve points and current day generation return 0. The dashboard accurately marks this station as "Offline / Pending Inverter Reconnection".

### 4. P2G 1ST 6kw (`1298491919450840394`)
* **Solar Generation:** 6.0 kW
* **Battery:** 99% SOC (Float state, 0 kW)
* **Grid Flow:** -0.048 kW (Neutral balance)
* **Facility Load:** Self-powered directly from PV

### 5. Menu Karachi Office (`1298491919450797504`)
* **Status:** Inverter State 3 (Active Trip State)
* **Solar Generation:** 50.0 kW
* **Battery:** 38% SOC (0 kW, Active `1054 UN-Vbatt` & `1055 NO-Battery` lockout)
* **Grid Flow:** Importing 6.588 kW
* **Facility Load:** 6.4 kW

### 6. P2G 50KW (`1298491919450740581`)
* **Solar Generation:** 17.6 kW (Day yield: 73.2 kWh)
* **Battery:** 65% SOC, actively charging at **+5.4 kW** (Dual pack strings installed)
* **Facility Load:** 11.9 kW
* **Grid Flow:** Balanced

### 7. P2G 15KW (`1298491919450734544`)
* **Status:** State 2 (Offline)
* **Battery:** 21% SOC (Last recorded snapshot)
* **Alarms:** 9 historical alarms stored

---

## 4. Supabase Verification & Integrity Checks

1. **Alarm Deduplication:**
   ```sql
   SELECT alarm_pk, COUNT(*) FROM solis_alarm_logs GROUP BY alarm_pk HAVING COUNT(*) > 1;
   ```
   * Result: **0 duplicates**. Every alarm across all 7 plants uses composite key `station_inverter_alarmCode` and upserts safely.
2. **Curve Points Uniqueness:**
   ```sql
   SELECT station_id, curve_date, time_str, COUNT(*) FROM solis_battery_power_curve GROUP BY station_id, curve_date, time_str HAVING COUNT(*) > 1;
   ```
   * Result: **0 duplicates**. Table constraint `UNIQUE(station_id, curve_date, time_str)` prevents any duplicate time slices.
3. **Daily Energy Accounting:**
   ```sql
   SELECT station_id, energy_date, COUNT(*) FROM solis_daily_energy GROUP BY station_id, energy_date HAVING COUNT(*) > 1;
   ```
   * Result: **0 duplicates**. Total 206 days stored with zero conflicts.

---

## 5. Next.js Dashboard Synchronization

The Next.js dashboard at `C:\Users\izhar\Desktop\soliscloud-one-time-test\dashboard` was updated and restarted:

* The plant selector dropdown now includes all **7 verified plants**:
  - `Menu Karachi Office` (80.0 kWp) — Live Data
  - `OPL Residence` (55.5 kWp) — Live Data
  - `36 Chenab` (25.155 kWp) — Live Data
  - `P2G 50KW` (32.0 kWp) — Live Data
  - `P2G 1ST 6kw` (20.0 kWp) — Live Data
  - `P2G 20kw` (18.0 kWp) — Offline State
  - `P2G 15KW` (20.0 kWp) — Offline State
* All 7 plants return `hasDataInDb: true` from `/api/plants`.
* The Cross-Plant Portfolio page (`/plants`) displays the live status, capacity totals, and inverter metrics for all 7 sites.
* Power-flow diagrams, battery gauges, and 5-minute ECharts curves load dynamically based on the active plant selection.

---

## 6. Execution Verification Sign-off

- [x] Scraper executed **one time only** via `collect_all_plants_once.js`.
- [x] Zero background services or cron jobs scheduled.
- [x] All existing scraper files (`one_time_eval.js`, `fetch_month.js`, `supabase.js`, etc.) remain 100% unmodified.
- [x] Supabase PostgreSQL contains valid, verified records for all 7 plants.
- [x] Dashboard server is live at `http://localhost:3001` with zero hydration warnings.
