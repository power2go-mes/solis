# SolisCloud Fleet Client Telemetry & Battery Monitoring Dashboard

A production-quality **SolisCloud Single-Page Monitoring Dashboard** built with Next.js (App Router), TypeScript, React, Tailwind CSS, and Apache ECharts, powered exclusively by Supabase PostgreSQL telemetry.

---

## Features

1. **All Client / Plant Tiles:**
   - Real-time client overview tiles for all registered SolisCloud plants.
   - Shows live Solar PV generation (kW), Battery SOC (%), grid import/export, and system capacity.
   - Interactive selection: click any client tile to load its detailed power curves and battery analytics.

2. **Dual SolisCloud Power & SOC Graphs (Matching SolisCloud UI):**
   - **Top Graph (Power Curve):**
     - Multi-metric power curves: 🟡 PV, 🔵 Grid (with Exporting/Importing distinction and area gradients), 🟢 Battery, and 🟣 Total Load.
     - Custom SolisCloud floating tooltip with exact kW values and UTC+05:00 timestamp.
   - **Bottom Graph (Battery SOC & Tariff):**
     - 🟢 Battery SOC (%) tracking on the left axis (0–100%).
     - 🩵 Purchase Tariff & 🔵 Feed-in Tariff reference rates on the right axis (PKR/kWh).
     - **"Now"** dashed vertical marker at current operational timestamp.

3. **Time Range Filtering:**
   - **Day:** 5-minute resolution 24-hour intraday power curve.
   - **Week:** 7-day generation & battery accounting breakdown.
   - **Month:** Full month day-by-day energy ledger.
   - **Year:** 12-month energy performance overview.
   - **Custom:** Interactive date-range picker.

---

## Deployment on Vercel

1. Import this repository into Vercel.
2. Root Directory: `./` (Default).
3. Under **Project Settings &rarr; Environment Variables**, add:
   - `DATABASE_URL` = Your Supabase PostgreSQL Connection Pooler URL (e.g. port `6543` or `5432` with SSL).
4. Deploy!
