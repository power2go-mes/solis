"use client";

import React, { useState } from "react";
import { Settings } from "lucide-react";
import { SolisOverviewSummary } from "@/lib/types";

interface SolisKPICardsProps {
  summary: SolisOverviewSummary;
  loading?: boolean;
}

export default function SolisKPICards({ summary, loading = false }: SolisKPICardsProps) {
  const [showSettingsTooltip, setShowSettingsTooltip] = useState(false);

  // In SolisCloud screenshot (media_1795079489963_09045777.jpg):
  // Installed PV capacity is 170 kWp
  const displayKwp = 170;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Card 1: Power & PV Capacity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Current Power */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Number(summary.currentPowerKw || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kW</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Power</p>
          </div>

          {/* Bottom Metric: PV Capacity */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {Number(displayKwp || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWp</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">PV Capacity</p>
          </div>
        </div>

        {/* Right Genuine Solis 3D Image with path fallback */}
        <div className="shrink-0 pl-2">
          <img
            src="/solis/station_list1-DwRSyVIC.png"
            alt="Solar PV Array"
            className="w-24 h-24 object-contain select-none pointer-events-none drop-shadow-xs"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/station_list1-DwRSyVIC.png")) {
                e.currentTarget.src = "/station_list1-DwRSyVIC.png";
              }
            }}
          />
        </div>
      </div>

      {/* Card 2: Daily Battery Energy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Daily Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Math.round(Number(summary.dailyChargeKwh || 0))}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Daily Charge</p>
          </div>

          {/* Bottom Metric: Daily Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Math.round(Number(summary.dailyDischargeKwh || 0))}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Daily Discharge</p>
          </div>
        </div>

        {/* Right Genuine Solis 3D Image with path fallback */}
        <div className="shrink-0 pl-2">
          <img
            src="/solis/station_list5-kp_NUlc_.png"
            alt="Daily Battery Energy"
            className="w-24 h-24 object-contain select-none pointer-events-none drop-shadow-xs"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/station_list5-kp_NUlc_.png")) {
                e.currentTarget.src = "/station_list5-kp_NUlc_.png";
              }
            }}
          />
        </div>
      </div>

      {/* Card 3: Monthly Battery Energy */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-between relative overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col justify-between h-full space-y-4 z-10">
          {/* Top Metric: Monthly Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Number(summary.monthlyChargeMwh || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Monthly Charge</p>
          </div>

          {/* Bottom Metric: Monthly Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Number(summary.monthlyDischargeMwh || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Monthly Discharge</p>
          </div>
        </div>

        {/* Right Genuine Solis 3D Image with path fallback */}
        <div className="shrink-0 pl-2">
          <img
            src="/solis/station_list6-VM077FAH.png"
            alt="Monthly Battery Energy"
            className="w-24 h-24 object-contain select-none pointer-events-none drop-shadow-xs"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/station_list6-VM077FAH.png")) {
                e.currentTarget.src = "/station_list6-VM077FAH.png";
              }
            }}
          />
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
              <p className="font-semibold text-emerald-400 mb-0.5">Energy Calculation</p>
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
                {loading ? "..." : Number(summary.totalChargeMwh || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Total Charge</p>
          </div>

          {/* Bottom Metric: Total Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-2xl font-semibold text-slate-800 tracking-tight">
                {loading ? "..." : Number(summary.totalDischargeMwh || 0).toFixed(2)}
              </span>
              <span className="text-xs font-normal text-slate-500 ml-1">MWh</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal mt-0.5">Total Discharge</p>
          </div>
        </div>

        {/* Right Genuine Solis 3D Image with path fallback */}
        <div className="shrink-0 pl-2">
          <img
            src="/solis/station_list7-B5Urfb3c.png"
            alt="Lifetime Battery Energy"
            className="w-24 h-24 object-contain select-none pointer-events-none drop-shadow-xs"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith("/station_list7-B5Urfb3c.png")) {
                e.currentTarget.src = "/station_list7-B5Urfb3c.png";
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
