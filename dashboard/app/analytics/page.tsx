"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import EnergyBarChart from "@/components/EnergyBarChart";
import { PlantInfo, TelemetryLatest, DailyEnergyRecord } from "@/lib/types";
import { LineChart, Calendar, Zap, Sun, Battery, Globe, Home, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [records, setRecords] = useState<DailyEnergyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<"30d" | "90d" | "all">("all");

  useEffect(() => {
    if (stationIdParam && stationIdParam !== stationId) {
      setStationId(stationIdParam);
    }
  }, [stationIdParam]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plantsRes, telRes, energyRes] = await Promise.all([
          fetch("/api/plants"),
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(`/api/energy/daily?stationId=${stationId}`),
        ]);

        const pData = await plantsRes.json();
        const tData = await telRes.json();
        const eData = await energyRes.json();

        if (pData.success) setPlants(pData.plants);
        if (tData.success && tData.hasData) setTelemetry(tData.telemetry);
        else setTelemetry(null);

        if (eData.success && eData.records) {
          setRecords(eData.records);
        } else {
          setRecords([]);
        }
      } catch (err) {
        console.error("Error loading analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [stationId]);

  const currentPlant = plants.find((p) => p.id === stationId);

  // Filter records according to selected timeframe
  const filteredRecords = React.useMemo(() => {
    if (!records || records.length === 0) return [];
    if (timeframe === "all") return records;

    const days = timeframe === "30d" ? 30 : 90;
    return records.slice(-days);
  }, [records, timeframe]);

  // Aggregate totals
  const totalSolar = filteredRecords.reduce((acc, r) => acc + r.solar_pv_kwh, 0);
  const totalLoad = filteredRecords.reduce((acc, r) => acc + r.house_load_kwh, 0);
  const totalCharge = filteredRecords.reduce((acc, r) => acc + r.battery_charge_kwh, 0);
  const totalDischarge = filteredRecords.reduce((acc, r) => acc + r.battery_discharge_kwh, 0);
  const totalImport = filteredRecords.reduce((acc, r) => acc + r.grid_purchased_kwh, 0);
  const totalExport = filteredRecords.reduce((acc, r) => acc + r.grid_sold_kwh, 0);

  // Self-sufficiency estimate
  const selfSufficiency = totalLoad > 0 ? Math.min(100, Math.round(((totalLoad - totalImport) / totalLoad) * 100)) : 100;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentStationId={stationId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          plants={plants}
          currentPlant={currentPlant}
          telemetry={telemetry}
          onPlantChange={(newId) => setStationId(newId)}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Page Title & Timeframe Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-sky-600" />
                Historical Energy Analytics
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Day-by-day energy generation, battery cycles, and utility accounting
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-xs text-xs">
              <button
                onClick={() => setTimeframe("30d")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeframe === "30d" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setTimeframe("90d")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeframe === "90d" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Last 90 Days
              </button>
              <button
                onClick={() => setTimeframe("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  timeframe === "all" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All Records ({records.length} Days)
              </button>
            </div>
          </div>

          {/* Empty Records Notification for Offline/Unlogged Plants */}
          {records.length === 0 && !loading && (
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  No Daily Energy Ledger Records Stored for {currentPlant?.name || "this plant"}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  This station ({currentPlant?.id}) has no historical daily energy counters recorded in SolisCloud / Supabase yet.
                  Live telemetry and inverter snapshots remain accessible on the Overview and Inverters tabs.
                </p>
              </div>
            </div>
          )}

          {/* Historical Aggregate Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Solar PV</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-600 font-mono">
                  {totalSolar > 1000 ? (totalSolar / 1000).toFixed(2) : totalSolar.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">{totalSolar > 1000 ? "MWh" : "kWh"}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Avg: {(totalSolar / Math.max(1, filteredRecords.length)).toFixed(1)} kWh/day
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Facility Consumption</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-600 font-mono">
                  {totalLoad > 1000 ? (totalLoad / 1000).toFixed(2) : totalLoad.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">{totalLoad > 1000 ? "MWh" : "kWh"}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Avg: {(totalLoad / Math.max(1, filteredRecords.length)).toFixed(1)} kWh/day
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Battery Cycled</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 font-mono">
                  {totalCharge > 1000 ? (totalCharge / 1000).toFixed(2) : totalCharge.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">{totalCharge > 1000 ? "MWh" : "kWh"}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Discharged: {totalDischarge > 1000 ? (totalDischarge / 1000).toFixed(2) : totalDischarge.toFixed(1)}{" "}
                {totalDischarge > 1000 ? "MWh" : "kWh"}
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Self-Sufficiency</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-sky-600 font-mono">{selfSufficiency}%</span>
                <span className="text-xs text-slate-500">solar & storage</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Grid Purchased: {totalImport.toFixed(1)} kWh
              </span>
            </div>
          </div>

          {/* Interactive Daily Energy Bar Chart */}
          <EnergyBarChart
            records={filteredRecords}
            title={`Energy Accounting (${filteredRecords.length} Days Recorded)`}
            loading={loading}
          />

          {/* Tabular Records Preview */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Daily Energy Ledger (Supabase PostgreSQL)</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Solar PV (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Battery Charge (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Battery Discharge (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Grid Import (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Grid Export (kWh)</th>
                    <th className="py-2.5 px-3 text-right">Consumption (kWh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredRecords.slice().reverse().map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{r.energy_date}</td>
                      <td className="py-2.5 px-3 text-right text-amber-700 font-bold">{r.solar_pv_kwh.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">{r.battery_charge_kwh.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-purple-700">{r.battery_discharge_kwh.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-blue-700">{r.grid_purchased_kwh.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-cyan-700">{r.grid_sold_kwh.toFixed(1)}</td>
                      <td className="py-2.5 px-3 text-right text-rose-700 font-bold">{r.house_load_kwh.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Historical Analytics...</div>}>
      <AnalyticsContent />
    </Suspense>
  );
}
