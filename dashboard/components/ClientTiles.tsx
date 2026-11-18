"use client";

import React from "react";
import { Sun, Battery, Globe, Zap, CheckCircle2, Building2 } from "lucide-react";
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {plants.map((plant) => {
          const isSelected = plant.id === selectedPlantId;
          const pvKw = Number(plant.liveSolarKw ?? 0);
          const soc = Number(plant.liveBatterySoc ?? 0);
          const isGenerating = pvKw > 0.5;

          const socColor =
            soc > 50
              ? "text-emerald-600 bg-emerald-50 border-emerald-200"
              : soc > 20
              ? "text-amber-600 bg-amber-50 border-amber-200"
              : "text-rose-600 bg-rose-50 border-rose-200";

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
              <div className="pr-12">
                <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">
                  {plant.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {plant.location} • {plant.capacityKwp} kWp
                </p>
              </div>

              {/* Real-time Telemetry Metrics */}
              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
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

                {/* Battery SOC */}
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <Battery className="w-3 h-3 text-emerald-500" />
                    <span>Battery SOC</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-mono font-bold text-slate-900 text-base">
                      {soc}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">%</span>
                  </div>
                </div>
              </div>

              {/* Footer: Status badge & Capacity */}
              <div className="mt-3 flex items-center justify-between text-[11px] pt-1">
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

                {plant.liveGridKw !== undefined && (
                  <span className="text-slate-500 font-mono text-[10px]">
                    Grid: {Number(plant.liveGridKw).toFixed(1)} kW
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
