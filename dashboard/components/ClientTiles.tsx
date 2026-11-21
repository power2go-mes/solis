"use client";

import React from "react";
import { Sun, Battery, Globe, Zap, CheckCircle2, Building2, ArrowDownRight, Radio } from "lucide-react";
import { PlantInfo } from "@/lib/types";

interface ClientTilesProps {
  plants: PlantInfo[];
  selectedPlantId: string;
  onSelectPlant: (plantId: string) => void;
}

export default function ClientTiles({
  plants,
  selectedPlantId,
  onSelectPlant,
}: ClientTilesProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-sky-600 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            All Clients & Plants ({plants.length})
          </h2>
        </div>
        <span className="text-xs text-slate-500 hidden sm:inline">
          Click any client tile below to view detailed power & battery analytics
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {plants.map((plant) => {
          const isSelected = plant.id === selectedPlantId;
          const pvKw = Number(plant.liveSolarKw ?? 0);
          const soc = Number(plant.liveBatterySoc ?? 0);
          const rawBatKw = Number(plant.liveBatteryPowerKw ?? 0);
          const batState =
            plant.liveBatteryState ||
            (rawBatKw > 0.05 ? "Charging" : rawBatKw < -0.05 ? "Discharging" : "Idle");

          const isCharging = batState === "Charging" || rawBatKw > 0.05;
          const isDischarging = batState === "Discharging" || rawBatKw < -0.05;
          const batKwDisplay = Math.abs(rawBatKw);

          // Status determinations
          const isOffline = plant.isOnlineToday === false || (plant.isStale && pvKw === 0);
          const isGenerating = !isOffline && pvKw > 0.5;

          return (
            <button
              key={plant.id}
              onClick={() => onSelectPlant(plant.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-300 relative flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] ${
                isSelected
                  ? "bg-white border-2 border-sky-500 ring-4 ring-sky-500/15 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              {/* Active Selection Badge */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs animate-in fade-in duration-300">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Viewing</span>
                </div>
              )}

              {/* Plant Header */}
              <div className="pr-14">
                <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {plant.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate font-medium">
                  {plant.location} • {plant.capacityKwp} kWp
                </p>
              </div>

              {/* Real-time Telemetry Metrics Grid */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                {/* Solar PV Power */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex flex-col justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <Sun className={`w-3.5 h-3.5 ${isGenerating ? "text-amber-500 animate-spin-slow" : "text-slate-400"}`} />
                    <span>PV Power</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="font-mono font-black text-slate-900 text-base">
                      {isOffline ? "0" : pvKw}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">kW</span>
                  </div>
                </div>

                {/* Battery SOC & Flow */}
                <div
                  className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors ${
                    isCharging
                      ? "bg-emerald-50/70 border-emerald-200"
                      : isDischarging
                      ? "bg-amber-50/70 border-amber-200"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1">
                      <Battery
                        className={`w-3.5 h-3.5 ${
                          isCharging
                            ? "text-emerald-600 animate-pulse"
                            : isDischarging
                            ? "text-amber-600"
                            : "text-slate-400"
                        }`}
                      />
                      <span>Battery</span>
                    </div>
                    <span
                      className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                        isCharging
                          ? "bg-emerald-100 text-emerald-800"
                          : isDischarging
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isCharging ? "Chg" : isDischarging ? "Dis" : "Idle"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono font-black text-slate-900 text-base">
                        {soc}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">%</span>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isCharging
                          ? "text-emerald-700"
                          : isDischarging
                          ? "text-amber-700"
                          : "text-slate-400"
                      }`}
                    >
                      {isCharging
                        ? `+${batKwDisplay}kW`
                        : isDischarging
                        ? `-${batKwDisplay}kW`
                        : "0kW"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated High-Contrast Battery Charging / Discharging Flow Bar (No truncation) */}
              <div
                className={`mt-2.5 px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs font-semibold transition-all ${
                  isCharging
                    ? "bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs"
                    : isDischarging
                    ? "bg-amber-50 text-amber-950 border-amber-300 shadow-2xs"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isCharging ? (
                    <Zap className="w-3.5 h-3.5 text-emerald-600 animate-bounce shrink-0" />
                  ) : isDischarging ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate font-bold text-[11px]">
                    {isCharging
                      ? "Charging Battery"
                      : isDischarging
                      ? "Discharging"
                      : "Battery Idle"}
                  </span>
                </div>
                <span className="font-mono text-xs font-black shrink-0 ml-1">
                  {isCharging
                    ? `+${batKwDisplay} kW`
                    : isDischarging
                    ? `-${batKwDisplay} kW`
                    : "0 kW"}
                </span>
              </div>

              {/* Footer Row 1: Status & Grid Power */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    {isGenerating && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isOffline
                          ? "bg-slate-400"
                          : isGenerating
                          ? "bg-emerald-500"
                          : "bg-amber-400"
                      }`}
                    ></span>
                  </span>
                  <span
                    className={`font-bold ${
                      isOffline
                        ? "text-slate-500"
                        : isGenerating
                        ? "text-emerald-700"
                        : "text-amber-800"
                    }`}
                  >
                    {isOffline ? "Offline" : isGenerating ? "Generating" : "Standby"}
                  </span>
                </div>

                <div className="text-slate-500 font-mono text-[10px]">
                  Grid: <strong className="text-slate-800 font-bold">{isOffline ? "0" : Number(plant.liveGridKw ?? 0)}</strong> kW
                </div>
              </div>

              {/* Footer Row 2: Clean Latest Data Timestamp Bar */}
              <div className="mt-1.5 pt-1 border-t border-slate-100/60 flex items-center justify-between text-[10px]">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Data:
                </span>
                <span
                  className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                    isOffline
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-sky-50 text-sky-800 border-sky-200"
                  }`}
                  title={
                    isOffline
                      ? `Plant was last seen on ${plant.latestDataDate || "yesterday"} at ${plant.latestDataTime || "--:--"}`
                      : `Live telemetry recorded at ${plant.latestDataTime} PKT`
                  }
                >
                  🕒 {isOffline ? (plant.latestDataDate ? `${plant.latestDataDate.slice(5)} ${plant.latestDataTime}` : "Offline") : `${plant.latestDataTime || "--:--"} PKT`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
