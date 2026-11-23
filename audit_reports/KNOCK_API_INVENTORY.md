# POWER2GO KNOCK — API INVENTORY

**Classification System:**
- **VERIFIED:** Directly observed in source code, live API responses, or confirmed via database rows.
- **CONFIGURED:** Declared in code/config files, but dynamic invocation depends on specific runtime conditions.
- **INFERRED:** Deduced logically from architecture and network artifacts.
- **UNKNOWN:** Insufficient evidence.

---

## 1. SolisCloud Endpoint Catalog

All API endpoints connect to base URL: `https://www.soliscloud.com`.
Authentication uses SolisCloud Enterprise Web Portal HMAC-SHA1 signatures and MD5 body hashes with Session Cookie management.

| Endpoint | Method & Route | Purpose | Caller & Line Reference | Parameters & Body Payload | Frequency | Destination Table | Failure Handling | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **EP-01** | `POST /api/login` | Portal user authentication & session cookie generation | `collect_live_now.js` (L237), `solis_auto_daemon.js` (L304) | `{ userInfo, password (MD5), yingZhenType: 1, localTime, localTimeZone: 5, language: "2" }` | Once per daemon startup / session refresh (or every 5m in GitHub Actions) | Session Cookie stored in memory (`sessionCookie`) | Exit with code 1 in one-shot; retry loop in daemon (15s backoff) | **VERIFIED** |
| **EP-02** | `POST /api/station/detailMix` | Real-time plant power snapshot (solar, battery, grid, load, SOC, alarms) | `collect_live_now.js` (L258), `solis_auto_daemon.js` (L335) | `{ id: plantId, localTime, localTimeZone: 5, language: "2" }` | Every iteration per plant (1m daemon / 5m CI) | `solis_telemetry_latest` | Caught, logged as error, continues to next plant | **VERIFIED** |
| **EP-03** | `POST /api/chart/station/day/v2` | High-resolution (5-minute interval) intraday generation, battery, grid, & load curve | `collect_live_now.js` (L267), `solis_auto_daemon.js` (L353, L584) | `{ id: plantId, time: "YYYY-MM-DD", timeZone: 5 }` | Every iteration per plant (1m daemon / 5m CI) + 6h backfill audit | `solis_battery_power_curve` | Caught, logs warning, skips curve update | **VERIFIED** |
| **EP-04** | `POST /api/chart/station/month` | Daily aggregated energy totals for the current month (produce, consume, charge, discharge, grid buy/sell) | `collect_live_now.js` (L445), `solis_auto_daemon.js` (L493) | `{ id: plantId, time: "YYYY-MM", month: "YYYY-MM", timeZone: 5, money: "PKR" }` | Every iteration per plant | `solis_daily_energy` | Caught, falls back to `detailMix` accumulator fields | **VERIFIED** |
| **EP-05** | `POST /api/alarm/list` | Real-time & historical alarm events, fault codes, protection states, and technician advice | `collect_live_now.js` (L525), `solis_auto_daemon.js` (L407) | `{ pageNo: 1, pageSize: 100, stationId: plantId }` | Every iteration per plant | `solis_alarm_logs` | Caught, logs warning, continues execution | **VERIFIED** |
| **EP-06** | `POST /api/device/inverterList` | Inverter discovery, rated power, serial numbers, firmware version | `check_inv_deep.py`, `harvest_all_lifetime_daily_energy.js` | `{ pageNo: 1, pageSize: 20, stationId: plantId }` | One-off discovery / diagnostics (Historical scripts) | Script memory / stdout | Retried or script exits | **CONFIGURED / HISTORICAL** |
| **EP-07** | `POST /api/station/energy/month` | Historical monthly plant yield for commissioning year discovery | `test_lifetime_discovery.js`, `solis_auto_daemon.js` (L575) | `{ id: plantId, month: "YYYY-MM", timeZone: 5 }` | Every 6 hours during backfill audit | In-memory scan for Day 1 commissioning date | Skips to next month | **VERIFIED** |

---

## 2. API Header & Authentication Mechanics

Each POST request constructs standard HMAC-SHA1 headers required by SolisCloud:
```http
Content-Type: application/json;charset=UTF-8
Content-MD5: <Base64(MD5(bodyStr))>
Date: <GMT Date String>
Authorization: API <KeyId>:<Base64(HMAC_SHA1(secret, stringToSign))>
Cookie: token=<sessionToken>; acw_tc=<routingToken>
```
* **Credential Redaction:** Credentials (`SOLIS_USERNAME`, `SOLIS_PASSWORD`, `DATABASE_URL`) are read exclusively from environment variables or `.env.local`.
