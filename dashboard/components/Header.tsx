"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Sun,
  Battery,
  Zap,
  Globe,
  Clock,
  ChevronDown,
  Building2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { PlantInfo, TelemetryLatest } from "@/lib/types";

interface HeaderProps {
  plants: PlantInfo[];
  currentPlant: PlantInfo | undefined;
  telemetry: TelemetryLatest | null;
  onPlantChange?: (plantId: string) => void;
}

export default function Header({
  plants,
  currentPlant,
  telemetry,
  onPlantChange,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [currentTimePkt, setCurrentTimePkt] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      // Format current time in Pakistan Standard Time (UTC+05:00)
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

  const handleSelectPlant = (plantId: string) => {
    setDropdownOpen(false);
    if (onPlantChange) {
      onPlantChange(plantId);
    }
    const targetPath = pathname === "/plants" ? "/" : pathname;
    const params = new URLSearchParams(searchParams.toString());
    params.set("stationId", plantId);
    router.push(`${targetPath}?${params.toString()}`);
  };

  const invState = String(telemetry?.summary?.inverter?.state || "");
  const isFault = invState === "3" || invState === "Fault" || telemetry?.summary?.inverter?.alarmState === "1";
  const isOffline = invState === "2" || invState === "Offline";
  const isStale = telemetry?.is_stale;
  const isOnline = telemetry !== null && !isStale && !isOffline && !isFault;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      {/* Left: Plant Selector & Status */}
      <div className="flex items-center gap-4">
        {/* Plant Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left"
          >
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <div className="font-semibold text-sm text-slate-800 leading-tight flex items-center gap-1.5">
                {currentPlant ? currentPlant.name : "Select Plant"}
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-[11px] text-slate-500">
                {currentPlant?.location || "SolisCloud Network"} •{" "}
                {currentPlant?.capacityKwp || 0} kWp
              </div>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                Authorized SolisCloud Plants (7)
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {plants.map((plant) => (
                  <button
                    key={plant.id}
                    onClick={() => handleSelectPlant(plant.id)}
                    className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors ${plant.id === currentPlant?.id ? "bg-sky-50 font-semibold text-sky-900" : "text-slate-700"
                      }`}
                  >
                    <div>
                      <div className="font-medium text-slate-800">{plant.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {plant.location} • {plant.capacityKwp} kWp
                      </div>
                    </div>
                    {plant.hasDataInDb ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                        Live Data
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 font-medium">
                        Pending Sync
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plant Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
          {telemetry === null ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Pending Scraper Sync</span>
            </div>
          ) : isFault ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Fault / Inverter Trip (State 3)</span>
            </div>
          ) : isOffline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Inverter Offline (State 2)</span>
            </div>
          ) : isStale ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Telemetry Stale (&gt;30m)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Generating Normally</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Quick Telemetry Pills & Clock */}
      <div className="flex items-center gap-4">
        {telemetry && (
          <div className="hidden md:flex items-center gap-3 pr-4 border-r border-slate-200">
            {/* Solar Pill */}
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-200 text-xs font-medium">
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span>PV: {telemetry.solar_power_kw.toFixed(1)} kW</span>
            </div>

            {/* Battery Pill */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs font-medium">
              <Battery className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                SOC: {telemetry.battery_soc}% ({telemetry.battery_power_kw.toFixed(1)} kW)
              </span>
            </div>

            {/* Grid Pill */}
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200 text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>
                Grid: {telemetry.grid_power_kw.toFixed(1)} kW ({telemetry.grid_direction})
              </span>
            </div>

            {/* Load Pill */}
            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span>Load: {telemetry.load_power_kw.toFixed(1)} kW</span>
            </div>
          </div>
        )}

        {/* Live Pakistan Clock */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span suppressHydrationWarning>{currentTimePkt || "Loading PKT..."}</span>
        </div>
      </div>
    </header>
  );
}
