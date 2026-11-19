"use client";

import React, { useEffect, useState } from "react";
import { Clock, Sun, Battery, Globe, Zap, RotateCw } from "lucide-react";
import { TelemetryLatest } from "@/lib/types";

interface HeaderProps {
  currentPlantName: string;
  telemetry: TelemetryLatest | null;
  latestDataTime?: string;
  latestDataDate?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Header({
  currentPlantName,
  telemetry,
  latestDataTime,
  latestDataDate,
  onRefresh,
  loading = false,
}: HeaderProps) {
  const [currentTimePkt, setCurrentTimePkt] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Karachi",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTimePkt(
        new Intl.DateTimeFormat("en-GB", options).format(now) + " (PKT)"
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Brand & Active Station */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center text-white shadow-xs">
          <Sun className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-extrabold text-slate-900 text-sm tracking-tight flex items-center gap-2">
            <span>Power2Go</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
              SolisCloud Live
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-none mt-0.5 font-medium">
            Monitoring Client: <span className="font-bold text-slate-800">{currentPlantName}</span>
          </p>
        </div>
      </div>

      {/* Right: Quick Pills & Pakistan Clock */}
      <div className="flex items-center gap-4">
        {telemetry && (
          <div className="hidden lg:flex items-center gap-2.5 pr-3 border-r border-slate-200">
            {/* PV */}
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>PV: {Number(telemetry.solar_power_kw ?? 0).toFixed(1)} kW</span>
            </div>

            {/* Battery */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-medium">
              <Battery className="w-3.5 h-3.5 text-emerald-600" />
              <span>SOC: {telemetry.battery_soc}%</span>
            </div>

            {/* Grid */}
            <div className="flex items-center gap-1.5 bg-sky-50 text-sky-800 px-2.5 py-1 rounded-lg border border-sky-200 text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-sky-600" />
              <span>Grid: {Number(telemetry.grid_power_kw ?? 0).toFixed(1)} kW</span>
            </div>

            {/* Load */}
            <div className="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg border border-purple-200 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>Load: {Number(telemetry.load_power_kw ?? 0).toFixed(1)} kW</span>
            </div>
          </div>
        )}

        {/* Latest Data Fetched Time */}
        {latestDataTime && (
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Data Time: <span className="font-mono font-bold text-emerald-950">{latestDataTime} PKT</span></span>
            {latestDataDate && (
              <span className="text-[10px] text-emerald-700 font-mono hidden sm:inline">({latestDataDate})</span>
            )}
          </div>
        )}

        {/* Live Clock */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span suppressHydrationWarning>{currentTimePkt || "Loading PKT..."}</span>
        </div>

        {/* Refresh button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh dashboard"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>
        )}
      </div>
    </header>
  );
}
