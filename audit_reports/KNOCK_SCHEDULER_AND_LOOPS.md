# POWER2GO KNOCK — SCHEDULER AND LOOPS AUDIT

## 1. Actual Scheduling Architecture

The system operates under a **Dual-Redundancy Scheduling Strategy**:
1. **Primary Local Daemon:** Windows Host Service via Registry Autostart (`start_collector_silently.vbs` → `collector_guardian.js` → `solis_auto_daemon.js`).
2. **Cloud Redundancy:** GitHub Actions Workflow (`.github/workflows/solis-sync.yml`) configured on a cron trigger (`*/5 * * * *` - every 5 minutes).

### Observed Runtime Evidence:
- **Observed Running Process:** Verified actively executing on local machine:
  - Process ID: `21076` (node `solis_auto_daemon.js`), spawned by `collector_guardian.js` (PID recorded in `logs/collector.pid`).
  - Active log: `logs/solis_collector.log` actively writing live iteration timestamps every minute (e.g. `11:53:45 PKT`, `11:54:45 PKT`).
- **Schedule Interval in Code:**
  - `solis_auto_daemon.js` L747: `setInterval(runLiveSyncWithRetry, 60 * 1000)` (Runs every **1 minute**).
  - `solis_auto_daemon.js` L753: `setInterval(runMissingDataAudit, 6 * 60 * 60 * 1000)` (Runs every **6 hours**).
- **Timezone Handling:** Hardcoded to Pakistan Standard Time (PKT, UTC+5). `localTimeZone: 5` and `Date.now() + 5 * 3600 * 1000` applied consistently.

---

## 2. Iteration Loops & Concurrency Model

### Loop 1: Plant Iteration Loop
- **File:** `solis_auto_daemon.js` (L331-L568) and `collect_live_now.js` (L252-L570)
- **Input:** Hardcoded registry array `PLANTS` containing 8 authorized plants:
  1. `1298491919451014032` (Towfiq chinoy)
  2. `1298491919450797504` (Menu Karachi Office)
  3. `1298491919450958553` (OPL Residence)
  4. `1298491919450873747` (36 Chenab)
  5. `1298491919450740581` (P2G 50KW)
  6. `1298491919450840394` (P2G 1ST 6kw)
  7. `1298491919450851319` (P2G 20kw)
  8. `1298491919450734544` (P2G 15KW)
- **Concurrency:** **Strictly Sequential (`for (let i = 0; i < PLANTS.length; i++)` with `await`)**. Concurrency = 1.
- **Delay:** ~1.5s between requests to prevent SolisCloud WAF rate-limiting.
- **Timeout:** 25,000 ms (`req.setTimeout(25000)`).
- **Failure Behavior:** `try/catch` per plant; an error in plant $N$ is caught and logged, execution immediately proceeds to plant $N+1$.

### Loop 2: 5-Minute Curve Ingestion Loop
- **File:** `solis_auto_daemon.js` (L368-L400)
- **Input:** Arrays returned by `/api/chart/station/day/v2`: `pvAndAcCoupledPowerList`, `batteryPower`, `psum`, `totalAndSmartLoadPowerList`, `batteryCapacitySocList`.
- **Iterations:** Up to 288 data points per 24-hour day ($288 \times 5\text{ min} = 1440\text{ min}$).
- **Database Processing:** Batch upsert constructed into a single multi-row SQL query (`UNNEST($1::text[], $2::date[], ...)`), processed in a single round-trip to Supabase.

### Loop 3: Historical Backfill Audit Loop (Runs every 6 hours)
- **File:** `solis_auto_daemon.js` (L575-L680)
- **Input:** Discovered plant commissioning dates from Day 1 to Today.
- **Backfill Window:** Checks whether any calendar date lacks curve records in `solis_battery_power_curve`.
- **Stop Condition:** Stops upon reaching `todayDateStr`.

---

## 3. Request Count Formula & Verified Estimate

$$\text{Requests Per Run} = N_{\text{auth}} + \sum_{p \in \text{Plants}} \left( N_{\text{detailMix}} + N_{\text{dayCurve}} + N_{\text{monthEnergy}} + N_{\text{alarmList}} \right)$$

For the **8 authorized plants** currently registered:
- **Authentication Requests:** 1 (reused via session token)
- **Plant Snapshot Requests (`detailMix`):** 8
- **Day Curve Requests (`day/v2`):** 8 (pulls today's curve up to current minute)
- **Monthly Daily Energy Requests (`station/month`):** 8
- **Alarm List Requests (`alarm/list`):** 8
- **Total Requests per Standard Sync Cycle:** **$1 + (8 \times 4) = 33\text{ HTTP Requests}$**

*Runtime Duration:* Verified from `daemon.log` to take **~61 to 67 seconds** across all 8 plants sequentially.
