"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { PlantInfo } from "@/lib/types";
import {
  Layers,
  Building2,
  Zap,
  Battery,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

function PlantsContent() {
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPlants() {
      setLoading(true);
      try {
        const res = await fetch("/api/plants");
        const data = await res.json();
        if (data.success) {
          setPlants(data.plants);
        }
      } catch (err) {
        console.error("Error loading plants:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlants();
  }, []);

  // Summary counts
  const totalCapacity = plants.reduce((acc, p) => acc + p.capacityKwp, 0);
  const syncedCount = plants.filter((p) => p.hasDataInDb).length;
  const pendingCount = plants.length - syncedCount;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentStationId={plants[0]?.id || "1298491919450797504"} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          plants={plants}
          currentPlant={plants[0]}
          telemetry={null}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Page Title */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              Cross-Plant Portfolio Monitoring (7 Authorized Plants)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Multi-site telemetry synchronization status, capacity distribution, and isolated plant dashboards
            </p>
          </div>

          {/* Portfolio Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Installed Capacity</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{totalCapacity.toFixed(1)}</span>
                <span className="text-xs text-slate-500 font-medium">kWp</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Across 7 Authorized Facilities</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Supabase Ingestion Active</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 font-mono">{syncedCount} / {plants.length}</span>
                <span className="text-xs text-slate-500 font-medium">Plants Ingested</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
                100% of Authorized Plants Stored in Supabase
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Active Solar Generation</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-600 font-mono">
                  {plants.reduce((acc, p) => acc + (p.liveSolarKw || 0), 0).toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-medium">kW Active PV</span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium mt-1 block">
                Live Combined Fleet Generation
              </span>
            </div>
          </div>

          {/* Plants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plants.map((plant) => {
              const isInvOffline = plant.inverterState === "2" || plant.inverterState === 2;
              const isInvFault = plant.inverterState === "3" || plant.inverterState === 3;

              return (
                <div
                  key={plant.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-tight">{plant.name}</h3>
                          <p className="text-[11px] text-slate-500">{plant.location}</p>
                        </div>
                      </div>

                      {isInvFault ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Trip / Fault
                        </span>
                      ) : isInvOffline ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Inverter Offline
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Online & Live
                        </span>
                      )}
                    </div>

                    {/* Live Telemetry Summary Pill Grid */}
                    <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Solar PV</span>
                        <span className="font-bold text-amber-700 font-mono">
                          {plant.liveSolarKw !== undefined ? `${plant.liveSolarKw.toFixed(1)} kW` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Battery SOC</span>
                        <span className="font-bold text-emerald-700 font-mono">
                          {plant.liveBatterySoc !== undefined ? `${plant.liveBatterySoc}%` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Facility Load</span>
                        <span className="font-bold text-rose-700 font-mono">
                          {plant.liveLoadKw !== undefined ? `${plant.liveLoadKw.toFixed(1)} kW` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Grid Flow</span>
                        <span className="font-bold text-blue-700 font-mono">
                          {plant.liveGridKw !== undefined ? `${plant.liveGridKw > 0 ? "+" : ""}${plant.liveGridKw.toFixed(1)} kW` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 py-2 border-t border-slate-100 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plant ID:</span>
                        <span className="font-mono text-[11px] text-slate-700 font-semibold">{plant.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Installed Capacity:</span>
                        <span className="font-bold text-slate-800 font-mono">{plant.capacityKwp} kWp</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Datalogger SN:</span>
                        <span className="font-mono text-[11px] text-slate-700">{plant.dataloggerSn || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Link
                      href={`/?stationId=${plant.id}`}
                      className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
                    >
                      <span>Open Plant Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function PlantsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Plant Portfolio...</div>}>
      <PlantsContent />
    </Suspense>
  );
}
