# POWER2GO KNOCK — DASHBOARD & PAGE FLOW AUDIT

## 1. Next.js Routing Architecture

The Next.js application (App Router) is structured around a centralized high-performance client shell mounted at `app/page.tsx`.

- **Entry Route:** `app/page.tsx`
- **Main Client Dashboard Component:** `components/SolisClientDashboard.tsx`
- **Mobile Responsive Container:** `components/mobile/SolisMobilePlantList.tsx` and `components/mobile/SolisMobilePlantDetail.tsx`
- **Navigation Mode:** Single-Page Application (SPA) subnav architecture controlled by internal state (`activeSubnav`: Overview, Layout, Info, Device, Alarm, Alert, Reports).

---

## 2. API Routes Catalog (Server-Side Next.js)

All API routes run on Node.js server runtime and query Supabase using the read-only connection pool defined in `lib/db.ts`:

| Route Path | Method | Tables Queried | Purpose |
| :--- | :--- | :--- | :--- |
| **`/api/plants`** | `GET` | `solis_telemetry_latest`, `solis_battery_power_curve` | Returns full fleet overview with online/offline status, live power, SOC, and latest timestamps |
| **`/api/plant/details`** | `GET` | `solis_telemetry_latest`, `solis_daily_energy` | Returns detailed telemetry, weather, hardware metadata, and daily energy history for a single plant |
| **`/api/telemetry/curve`**| `GET` | `solis_battery_power_curve` | Returns 288-point intraday curve (solar kW, load kW, battery kW, SOC, grid kW) for selected date |
| **`/api/energy/daily`** | `GET` | `solis_daily_energy` | Returns day/month/year historical generation and consumption breakdown |
| **`/api/alarms/all`** | `GET` | `solis_alarm_logs` | Returns active and historical plant/inverter faults and alarms with severity levels |
| **`/api/reports`** | `GET` | `solis_daily_energy`, `solis_battery_power_curve` | Aggregates periodic energy yields, self-consumption ratios, and timeline curves for reports |

---

## 3. UI Component & Interactive Button Workflows

| UI Control / Button | Component Location | Verified Working Behavior |
| :--- | :--- | :--- |
| **Plant Row Click / View Details** | `SolisPlantTable.tsx` / `SolisMobilePlantList.tsx` | Updates `selectedPlantId`, switches view to plant detail, triggers SWR fetch for plant telemetry & day curve. |
| **Date Navigator (`<` / `>`)** | `SolisClientDashboard.tsx` (Operating Data) | Increments/decrements selected date string, re-queries `/api/telemetry/curve` and updates chart & floating KPI tiles. |
| **Day / Month / Year Granularity** | `SolisClientDashboard.tsx` / `SolisPlantReportView.tsx` | Toggles chart between 5-minute curve (Day) and daily bar aggregates (Month/Year). |
| **Export Excel** | `SolisPlantReportView.tsx` / `SolisClientDashboard.tsx` | Calls `exportToExcel()` (`xlsx` library) to download `.xlsx` workbook containing Plant Performance & Timeline sheets. |
| **Export PDF** | `SolisPlantReportView.tsx` | Captures high-res ECharts canvas (`getDataURL`), adds autoTable breakdown, and downloads branded `.pdf`. |
| **Manual Refresh** | `SolisHousePowerFlow.tsx` / `SolisClientDashboard.tsx` | Triggers immediate re-fetch of `/api/plant/details` and `/api/telemetry/curve` without full page reload. |
