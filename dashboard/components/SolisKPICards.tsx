"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SolisOverviewSummary } from "@/lib/types";
import {
  SolarPanelIllustration,
  DailyBatteryIllustration,
  MonthlyBatteryIllustration,
  LifetimeBatteryIllustration,
} from "./SolisKpiIllustrations";

interface SolisKPICardsProps {
  summary: SolisOverviewSummary;
  loading?: boolean;
}

export default function SolisKPICards({ summary, loading = false }: SolisKPICardsProps) {
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Power & PV Capacity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Current Power */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.currentPowerKw.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kW</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Power</p>
          </div>

          {/* Bottom Metric: PV Capacity */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Math.round(summary.installedCapacityKwp)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWp</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">PV Capacity</p>
          </div>
        </div>

        {/* Right 3D Solar Panel Illustration */}
        <div className="shrink-0 pl-2">
          <SolarPanelIllustration className="w-20 h-20 lg:w-24 lg:h-24" />
        </div>
      </div>

      {/* Card 2: Daily Battery Energy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Daily Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.dailyChargeKwh.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Daily Charge</p>
          </div>

          {/* Bottom Metric: Daily Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.dailyDischargeKwh.toFixed(1)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Daily Discharge</p>
          </div>
        </div>

        {/* Right 3D Daily Calendar & Battery Illustration */}
        <div className="shrink-0 pl-2">
          <DailyBatteryIllustration className="w-20 h-20 lg:w-24 lg:h-24" />
        </div>
      </div>

      {/* Card 3: Monthly Battery Energy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Monthly Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.monthlyChargeMwh.toFixed(3)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Monthly Charge</p>
          </div>

          {/* Bottom Metric: Monthly Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.monthlyDischargeMwh.toFixed(3)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Monthly Discharge</p>
          </div>
        </div>

        {/* Right 3D Monthly Calendar & Battery Illustration */}
        <div className="shrink-0 pl-2">
          <MonthlyBatteryIllustration className="w-20 h-20 lg:w-24 lg:h-24" />
        </div>
      </div>

      {/* Card 4: Lifetime Battery Energy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        {/* Top-Right Settings Gear Icon */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={() => setShowSettingsTooltip(!showSettingsTooltip)}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Configure Energy Metrics"
          >
            <Settings className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {showSettingsTooltip && (
            <div className="absolute right-0 mt-1 w-52 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-100">
              <p className="font-semibold text-amber-400 mb-0.5">Energy Calculation</p>
              <p className="text-slate-300 leading-relaxed">
                Lifetime battery throughput aggregated from synchronized SolisCloud inverter telemetry registers.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Total Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.totalChargeMwh.toFixed(3)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Total Charge</p>
          </div>

          {/* Bottom Metric: Total Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : summary.totalDischargeMwh.toFixed(3)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Total Discharge</p>
          </div>
        </div>

        {/* Right 3D Lifetime Chart & Battery Illustration */}
        <div className="shrink-0 pl-2">
          <LifetimeBatteryIllustration className="w-20 h-20 lg:w-24 lg:h-24" />
        </div>
      </div>
    </div>
  );
}
