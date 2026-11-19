"use client";

import React from "react";
import { Sun, Battery, Globe, Zap, CheckCircle2, Building2, ArrowDownRight } from "lucide-react";
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
          <Building2 className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            All Clients & Plants ({plants.length})
          </h2>
        </div>
        <span className="text-xs text-slate-500">
          Click any client tile below to view detailed power & battery graphs
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
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
          const isGenerating = pvKw > 0.5;
          const batKwDisplay = Math.abs(rawBatKw);

          return (
            <button
              key={plant.id}
              onClick={() => onSelectPlant(plant.id)}
              className={`text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-2 border-sky-500 ring-4 ring-sky-500/10 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              {/* Active Selection Pin */}
              {isSelected && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-sky-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Viewing</span>
                </div>
              )}

              {/* Plant Header */}
              <div className="pr-10">
                <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {plant.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {plant.location} • {plant.capacityKwp} kWp
                </p>
              </div>

              {/* Real-time Telemetry Metrics */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                {/* Solar PV Power */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <Sun className="w-3 h-3 text-amber-500" />
                    <span>PV Power</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono font-bold text-slate-900 text-base">
                      {pvKw.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">kW</span>
                  </div>
                </div>

                {/* Battery SOC & Flow */}
                <div
                  className={`p-2 rounded-lg border ${
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
                        className={`w-3 h-3 ${
                          isCharging
                            ? "text-emerald-600"
                            : isDischarging
                            ? "text-amber-600"
                            : "text-slate-400"
                        }`}
                      />
                      <span>Battery SOC</span>
                    </div>
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wider px-1 rounded ${
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
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono font-bold text-slate-900 text-base">
                        {soc}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">%</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] font-bold ${
                        isCharging
                          ? "text-emerald-700"
                          : isDischarging
                          ? "text-amber-700"
                          : "text-slate-400"
                      }`}
                    >
                      {isCharging
                        ? `+${batKwDisplay.toFixed(1)} kW`
                        : isDischarging
                        ? `-${batKwDisplay.toFixed(1)} kW`
                        : "0.0 kW"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated High-Contrast Battery Charging / Discharging Flow Pill */}
              <div
                className={`mt-2.5 px-2.5 py-1.5 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                  isCharging
                    ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                    : isDischarging
                    ? "bg-amber-50 text-amber-950 border-amber-300"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCharging ? (
                    <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                  ) : isDischarging ? (
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate font-bold">
                    {isCharging
                      ? `Charging +${batKwDisplay.toFixed(1)} kW`
                      : isDischarging
                      ? `Discharging -${batKwDisplay.toFixed(1)} kW`
                      : "Battery Idle (0.0 kW)"}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ml-1 shadow-2xs ${
                    isCharging
                      ? "bg-emerald-600 text-white"
                      : isDischarging
                      ? "bg-amber-600 text-white"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {isCharging ? "Charging" : isDischarging ? "Discharging" : "Idle"}
                </span>
              </div>

              {/* Footer: Status badge & Grid Power & Latest Time */}
              <div className="mt-3 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isGenerating ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span className="font-medium text-slate-600">
                    {isGenerating ? "Generating" : "Standby"}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {plant.latestDataTime && (
                    <span
                      className="font-mono text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200"
                      title={`Latest data reading at ${plant.latestDataTime} (${plant.latestDataDate || "Today"})`}
                    >
                      🕒 {plant.latestDataTime}
                    </span>
                  )}
                  {plant.liveGridKw !== undefined && (
                    <span className="text-slate-500 font-mono text-[10px]">
                      Grid: {Number(plant.liveGridKw).toFixed(1)} kW
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
