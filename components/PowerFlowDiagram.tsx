"use client";

import React from "react";
import { Sun, Battery, Zap, Home, Globe, AlertTriangle } from "lucide-react";
import { TelemetryLatest } from "@/lib/types";

interface PowerFlowProps {
  telemetry: TelemetryLatest | null;
}

export default function PowerFlowDiagram({ telemetry }: PowerFlowProps) {
  if (!telemetry) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-[380px] shadow-xs">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <h3 className="font-semibold text-slate-800 text-base mb-1">
          No Live Telemetry Available
        </h3>
        <p className="text-sm text-slate-500 max-w-md">
          This plant does not have real-time telemetry stored in Supabase yet.
          Ensure the external scraper has synchronized this plant.
        </p>
      </div>
    );
  }

  const isStale = telemetry.is_stale;
  const solarKw = Number(telemetry.solar_power_kw) || 0;
  const batteryKw = Math.abs(Number(telemetry.battery_power_kw) || 0);
  const batteryDir = telemetry.battery_direction || "Idle";
  const isCharging = batteryDir.toLowerCase().includes("charg") && !batteryDir.toLowerCase().includes("dis");
  const isDischarging = batteryDir.toLowerCase().includes("discharg");
  const gridKw = Math.abs(Number(telemetry.grid_power_kw) || 0);
  const gridDir = telemetry.grid_direction || "Normal";
  const isExporting = gridDir.toLowerCase().includes("export") || gridDir.toLowerCase().includes("sell");
  const isImporting = gridDir.toLowerCase().includes("import") || gridDir.toLowerCase().includes("purchas");
  const loadKw = Number(telemetry.load_power_kw) || 0;
  const soc = Number(telemetry.battery_soc) || 0;

  // Determine if flows are active
  const hasSolarFlow = solarKw > 0.05 && !isStale;
  const hasBatteryFlow = batteryKw > 0.05 && !isStale && (isCharging || isDischarging);
  const hasGridFlow = gridKw > 0.05 && !isStale;
  const hasLoadFlow = loadKw > 0.05 && !isStale;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Real-Time Power Flow
            {isStale && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                Telemetry Stale
              </span>
            )}
          </h2>
          <div className="text-xs text-slate-400 mt-0.5">
            Updated: {telemetry.data_timestamp || "Live"} (PKT)
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Solar</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Battery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span>Grid</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Load</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas for Flow Lines & Diagram */}
      <div className="relative w-full max-w-2xl mx-auto h-[340px] flex items-center justify-center select-none">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 340"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>{`
            @keyframes flowForward {
              from { stroke-dashoffset: 24; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes flowReverse {
              from { stroke-dashoffset: 0; }
              to { stroke-dashoffset: 24; }
            }
            .flow-solar {
              stroke-dasharray: 6 6;
              animation: flowForward 1.2s linear infinite;
            }
            .flow-battery-charge {
              stroke-dasharray: 6 6;
              animation: flowForward 1.2s linear infinite;
            }
            .flow-battery-discharge {
              stroke-dasharray: 6 6;
              animation: flowReverse 1.2s linear infinite;
            }
            .flow-grid-export {
              stroke-dasharray: 6 6;
              animation: flowForward 1.2s linear infinite;
            }
            .flow-grid-import {
              stroke-dasharray: 6 6;
              animation: flowReverse 1.2s linear infinite;
            }
            .flow-load {
              stroke-dasharray: 6 6;
              animation: flowForward 1.2s linear infinite;
            }
          `}</style>

          {/* Background Paths */}
          {/* Solar (120, 80) -> Inverter (300, 170) */}
          <line x1="130" y1="90" x2="280" y2="160" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
          {/* Inverter (320, 160) -> Grid (470, 90) */}
          <line x1="320" y1="160" x2="470" y2="90" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
          {/* Inverter (280, 180) -> Battery (130, 250) */}
          <line x1="280" y1="180" x2="130" y2="250" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />
          {/* Inverter (320, 180) -> Load (470, 250) */}
          <line x1="320" y1="180" x2="470" y2="250" stroke="#e2e8f0" strokeWidth="4" strokeLinecap="round" />

          {/* Active Flow Overlays */}
          {hasSolarFlow && (
            <line
              x1="130"
              y1="90"
              x2="280"
              y2="160"
              stroke="#f59e0b"
              strokeWidth="4"
              strokeLinecap="round"
              className="flow-solar"
            />
          )}

          {hasGridFlow && (
            <line
              x1="320"
              y1="160"
              x2="470"
              y2="90"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeLinecap="round"
              className={isExporting ? "flow-grid-export" : "flow-grid-import"}
            />
          )}

          {hasBatteryFlow && (
            <line
              x1="280"
              y1="180"
              x2="130"
              y2="250"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
              className={isCharging ? "flow-battery-charge" : "flow-battery-discharge"}
            />
          )}

          {hasLoadFlow && (
            <line
              x1="320"
              y1="180"
              x2="470"
              y2="250"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              className="flow-load"
            />
          )}
        </svg>

        {/* Node 1: Solar PV (Top Left) */}
        <div className="absolute top-2 left-6 w-36 bg-amber-50/90 border border-amber-200 rounded-xl p-3 shadow-xs flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 mb-1.5">
            <Sun className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Solar PV</span>
          <span className="text-base font-extrabold text-amber-700">
            {solarKw.toFixed(1)} <span className="text-xs font-normal">kW</span>
          </span>
          <span className="text-[10px] text-amber-800/80 mt-0.5">
            {telemetry.summary?.solar?.strings?.filter((s: any) => (s.voltageV > 0 || s.powerW > 0)).length || telemetry.summary?.solar?.strings?.length || 4} MPPT Strings
          </span>
        </div>

        {/* Node 2: Center Inverter (Center) */}
        <div className="absolute top-[115px] left-1/2 -translate-x-1/2 w-44 bg-slate-900 border-2 border-sky-500 text-white rounded-2xl p-3 shadow-xl flex flex-col items-center z-10 text-center">
          <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md mb-1.5">
            <Zap className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-sky-400">Hybrid Inverter</span>
          <span className="text-sm font-extrabold text-white truncate max-w-[150px]">
            {telemetry.inverter_model || (telemetry.installed_capacity_kw ? `Solis ${telemetry.installed_capacity_kw}kW` : "Inverter")}
          </span>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-center gap-2">
            <span>DC: {telemetry.summary?.inverter?.dcBusVoltageV !== undefined ? `${telemetry.summary.inverter.dcBusVoltageV} V` : "—"}</span>
            <span>•</span>
            <span>{telemetry.summary?.inverter?.temperatureC !== undefined ? `${telemetry.summary.inverter.temperatureC} °C` : "—"}</span>
          </div>
        </div>

        {/* Node 3: Utility Grid (Top Right) */}
        <div className="absolute top-2 right-6 w-36 bg-blue-50/90 border border-blue-200 rounded-xl p-3 shadow-xs flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 mb-1.5">
            <Globe className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Utility Grid</span>
          <span className="text-base font-extrabold text-blue-700">
            {gridKw.toFixed(1)} <span className="text-xs font-normal">kW</span>
          </span>
          <span className="text-[10px] text-blue-800/80 mt-0.5 font-medium px-1.5 py-0.5 rounded bg-blue-100/60">
            {gridDir || (isExporting ? "Exporting" : "Importing")}
          </span>
        </div>

        {/* Node 4: Battery Storage (Bottom Left) */}
        <div className="absolute bottom-2 left-6 w-36 bg-emerald-50/90 border border-emerald-200 rounded-xl p-3 shadow-xs flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 mb-1.5">
            <Battery className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Battery Storage</span>
          <span className="text-base font-extrabold text-emerald-700">
            {soc}% <span className="text-xs font-normal">SOC</span>
          </span>
          <div className="text-[10px] text-emerald-800/80 mt-0.5 flex items-center gap-1 font-medium">
            <span>{batteryKw.toFixed(1)} kW</span>
            <span>•</span>
            <span className="capitalize">{batteryDir}</span>
          </div>
        </div>

        {/* Node 5: Facility Load (Bottom Right) */}
        <div className="absolute bottom-2 right-6 w-36 bg-rose-50/90 border border-rose-200 rounded-xl p-3 shadow-xs flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 mb-1.5">
            <Home className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-700">Facility Load</span>
          <span className="text-base font-extrabold text-rose-700">
            {loadKw.toFixed(1)} <span className="text-xs font-normal">kW</span>
          </span>
          <span className="text-[10px] text-rose-800/80 mt-0.5">
            Backup: {Number(telemetry.summary?.load?.bypassPowerKw ?? telemetry.summary?.load?.bypassLoadPowerKw ?? 0).toFixed(1)} kW
          </span>
        </div>
      </div>
    </div>
  );
}
