"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import PowerFlowDiagram from "@/components/PowerFlowDiagram";
import PowerCurveChart from "@/components/PowerCurveChart";
import BatteryCard from "@/components/BatteryCard";
import PlantInfoCard from "@/components/PlantInfoCard";
import { PlantInfo, TelemetryLatest, PowerCurvePoint } from "@/lib/types";
import { Sun, Battery, Globe, Home, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";

function DashboardContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [curvePoints, setCurvePoints] = useState<PowerCurvePoint[]>([]);
  const [curveDate, setCurveDate] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Sync stationId state with URL param
  useEffect(() => {
    if (stationIdParam && stationIdParam !== stationId) {
      setStationId(stationIdParam);
    }
  }, [stationIdParam]);

  // Fetch plants list on mount
  useEffect(() => {
    async function loadPlants() {
      try {
        const res = await fetch("/api/plants");
        const data = await res.json();
        if (data.success) {
          setPlants(data.plants);
        }
      } catch (err) {
        console.error("Failed to fetch plants:", err);
      }
    }
    loadPlants();
  }, []);

  // Fetch telemetry & curve whenever stationId changes
  useEffect(() => {
    async function loadStationData() {
      setLoading(true);
      try {
        const [telRes, curveRes] = await Promise.all([
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(`/api/telemetry/curve?stationId=${stationId}`),
        ]);

        const telData = await telRes.json();
        const curData = await curveRes.json();

        if (telData.success && telData.hasData) {
          setTelemetry(telData.telemetry);
        } else {
          setTelemetry(null);
        }

        if (curData.success && curData.points) {
          setCurvePoints(curData.points);
          setCurveDate(curData.date || "");
        } else {
          setCurvePoints([]);
        }
      } catch (err) {
        console.error("Error loading station data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStationData();
  }, [stationId]);

  const currentPlant = plants.find((p) => p.id === stationId);
  const isPlantOffline =
    telemetry?.summary?.inverter?.state === "2" ||
    telemetry?.summary?.inverter?.state === 2;

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
          {/* Plant Unsynchronized Notification (if plant has no data in DB) */}
          {currentPlant && !currentPlant.hasDataInDb && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">
                  Plant Synchronization Pending ({currentPlant.name})
                </h4>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  No telemetry or curve records have been ingested into the Supabase database for this plant yet.
                  To view live telemetry, run the external scraper to fetch and sync data for Plant ID{" "}
                  <code className="font-mono bg-amber-100 px-1 py-0.5 rounded font-bold">{currentPlant.id}</code>.
                </p>
              </div>
            </div>
          )}

          {/* Plant Inverter Offline in SolisCloud Notification */}
          {isPlantOffline && (
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Plant Inverter Offline in SolisCloud ({currentPlant?.name || telemetry?.station_name})
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  The physical inverter and datalogger at this station are currently reported as disconnected (State 2 Offline) in SolisCloud.
                  Displaying the latest synchronized configuration and battery storage records from Supabase PostgreSQL.
                  Live generation and 5-minute curve streaming will resume once the inverter communication is restored.
                </p>
              </div>
            </div>
          )}

          {/* Quick Metrics Ribbon */}
          {telemetry && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Solar Yield Today */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Solar Today</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Sun className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {Number(telemetry.summary?.solar?.yieldTodayKwh ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <div className="mt-1 text-[11px] text-amber-700 font-medium">
                  Peak Power: {telemetry.solar_power_kw.toFixed(1)} kW
                </div>
              </div>

              {/* Battery Charged Today */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Battery Charged</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Battery className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {Number(telemetry.summary?.battery?.chargeEnergyTodayKwh ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <div className="mt-1 text-[11px] text-emerald-700 font-medium">
                  SOC: {telemetry.battery_soc}% • {telemetry.battery_direction}
                </div>
              </div>

              {/* Grid Sold Today */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">Grid Exported</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {Number(telemetry.summary?.grid?.soldTodayKwh ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <div className="mt-1 text-[11px] text-blue-700 font-medium">
                  Grid Power: {telemetry.grid_power_kw.toFixed(1)} kW
                </div>
              </div>

              {/* Facility Consumption Today */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500">House Load</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Home className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {Number(telemetry.summary?.load?.consumptionTodayKwh ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">kWh</span>
                </div>
                <div className="mt-1 text-[11px] text-rose-700 font-medium">
                  Live Demand: {telemetry.load_power_kw.toFixed(1)} kW
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Flow Diagram & Trend Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Power Flow Diagram */}
              <PowerFlowDiagram telemetry={telemetry} />

              {/* 5-Minute Operating Curve Chart */}
              <PowerCurveChart
                points={curvePoints}
                dateTitle={curveDate}
                loading={loading}
              />

              {/* Solar MPPT Strings Telemetry Card */}
              {telemetry && telemetry.summary?.solar?.strings && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-slate-900 text-sm">Solar PV MPPT Strings</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Total Active Power: <span className="font-bold text-slate-800">{telemetry.solar_power_kw.toFixed(1)} kW</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {telemetry.summary.solar.strings.map((str: any) => (
                      <div key={str.string} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700">PV String {str.string}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            {str.powerW} W
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <div>Voltage: <span className="font-mono font-medium text-slate-700">{str.voltageV} V</span></div>
                          <div>Current: <span className="font-mono font-medium text-slate-700">{str.currentA} A</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Battery & Station Metadata */}
            <div className="space-y-6">
              <BatteryCard telemetry={telemetry} />
              <PlantInfoCard telemetry={telemetry} />

              {/* Diagnostics Navigation Teaser */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-sm text-white">System Diagnostics</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Access forensic audits, deep cell balance registers, alarm logs, and the Menu Karachi root cause investigation.
                </p>
                <div className="pt-1 flex flex-col gap-2">
                  <Link
                    href={`/health?stationId=${stationId}`}
                    className="flex items-center justify-between text-xs font-medium text-sky-400 hover:text-sky-300 py-1 transition-colors"
                  >
                    <span>Nov 8–17 Incident Investigation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/bms?stationId=${stationId}`}
                    className="flex items-center justify-between text-xs font-medium text-sky-400 hover:text-sky-300 py-1 transition-colors"
                  >
                    <span>High-Voltage BMS Cell Telemetry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href={`/alarms?stationId=${stationId}`}
                    className="flex items-center justify-between text-xs font-medium text-sky-400 hover:text-sky-300 py-1 transition-colors"
                  >
                    <span>Historical Alarm & Trip Logs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading SolisCloud Overview...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
