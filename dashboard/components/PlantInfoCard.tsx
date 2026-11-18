"use client";

import React from "react";
import { Leaf, TreePine, Flame, Building2, Sun, Zap } from "lucide-react";
import { TelemetryLatest } from "@/lib/types";

interface PlantInfoCardProps {
  telemetry: TelemetryLatest | null;
}

export default function PlantInfoCard({ telemetry }: PlantInfoCardProps) {
  if (!telemetry) return null;

  const env = telemetry.summary?.environmental || {};
  const solar = telemetry.summary?.solar || {};
  const inv = telemetry.summary?.inverter || {};

  const todayYield = Number(solar.yieldTodayKwh ?? 0);
  const monthYield = Number(solar.yieldMonthMwh ?? 0);
  const totalYield = Number(solar.yieldTotalMwh ?? 0);

  // Environmental offsets: use API data if available, or calculate based on standard generation factors
  const avoidedCo2 = Number(env.avoidedCo2Tonnes) || Number((totalYield * 0.997).toFixed(2));
  const treesPlanted = Number(env.treesPlanted) || Math.round(totalYield * 54);
  const coalSaved = Number(env.coalSavedTce) || Number((totalYield * 0.404).toFixed(2));

  const inverterModelDisplay =
    telemetry.inverter_model ||
    inv.model ||
    (telemetry.installed_capacity_kw ? `Solis ${telemetry.installed_capacity_kw}kW Hybrid` : "Hybrid Inverter");

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
      {/* Station Profile Header */}
      <div className="border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{telemetry.station_name}</h3>
            <p className="text-[11px] text-slate-500">{telemetry.location} • ID: {telemetry.station_id}</p>
          </div>
        </div>
      </div>

      {/* Hardware Specs */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Capacity</span>
          <span className="font-bold text-slate-800">{telemetry.installed_capacity_kw} kWp</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inverter Model</span>
          <span className="font-bold text-slate-800">{inverterModelDisplay}</span>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 col-span-2">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Datalogger SN</span>
          <span className="font-mono text-[11px] text-slate-700 font-medium">{telemetry.datalogger_sn || "N/A"}</span>
        </div>
      </div>

      {/* Solar Energy Yield */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          Solar Generation Totals
        </h4>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Today&apos;s Yield</span>
          <span className="font-bold text-amber-600 font-mono">{todayYield.toFixed(1)} kWh</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">This Month</span>
          <span className="font-bold text-slate-800 font-mono">{monthYield.toFixed(2)} MWh</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">Lifetime Generation</span>
          <span className="font-bold text-slate-800 font-mono">{totalYield.toFixed(2)} MWh</span>
        </div>
      </div>

      {/* Environmental & Carbon Offsets */}
      <div className="pt-2 border-t border-slate-100 space-y-2.5">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Leaf className="w-3.5 h-3.5 text-emerald-600" />
          Environmental Impact
        </h4>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">CO2 Saved</span>
            <span className="text-xs font-bold text-emerald-800 font-mono">{avoidedCo2.toFixed(1)} t</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2">
            <TreePine className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">Trees</span>
            <span className="text-xs font-bold text-emerald-800 font-mono">{treesPlanted.toFixed(0)}</span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2">
            <Flame className="w-3.5 h-3.5 text-amber-600 mx-auto mb-1" />
            <span className="text-[10px] text-slate-500 block">Coal Saved</span>
            <span className="text-xs font-bold text-amber-800 font-mono">{coalSaved.toFixed(1)} t</span>
          </div>
        </div>
      </div>
    </div>
  );
}
