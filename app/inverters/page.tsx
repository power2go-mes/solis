"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { PlantInfo, TelemetryLatest, InverterTelemetry } from "@/lib/types";
import { Zap, Activity, Sun, Globe, Thermometer, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

function InvertersContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [inverters, setInverters] = useState<InverterTelemetry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (stationIdParam && stationIdParam !== stationId) {
      setStationId(stationIdParam);
    }
  }, [stationIdParam]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plantsRes, telRes, invRes] = await Promise.all([
          fetch("/api/plants"),
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(`/api/inverters?stationId=${stationId}`),
        ]);

        const pData = await plantsRes.json();
        const tData = await telRes.json();
        const iData = await invRes.json();

        if (pData.success) setPlants(pData.plants);
        if (tData.success && tData.hasData) setTelemetry(tData.telemetry);
        else setTelemetry(null);

        if (iData.success && iData.inverters) setInverters(iData.inverters);
        else setInverters([]);
      } catch (err) {
        console.error("Error loading inverters:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [stationId]);

  const currentPlant = plants.find((p) => p.id === stationId);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentStationId={stationId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          plants={plants}
          currentPlant={currentPlant}
          telemetry={telemetry}
          onPlantChange={(newId) => setStationId(newId)}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-sky-600" />
                Inverter & 3-Phase Grid Telemetry
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-inverter monitoring, per-string MPPT currents, and 3-phase grid electrical parameters
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs text-slate-700">
              Total Inverters: {inverters.length || currentPlant?.inverterCount || 1}
            </span>
          </div>

          {inverters.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">No Inverter Telemetry Ingested</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Individual inverter records have not been recorded in Supabase for this plant yet.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {inverters.map((inv, idx) => {
                const isFault = inv.inverter_state === "3" || inv.inverter_state === "Fault" || inv.inverter_alarm_state === "1";
                const isOffline = inv.inverter_state === "2" || inv.inverter_state === "Offline";

                return (
                  <div key={inv.inverter_sn || idx} className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
                    {/* Inverter Profile Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-base">Inverter {idx + 1}: {inv.inverter_model}</h3>
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              SN: {inv.inverter_sn}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Last Telemetry: {inv.data_timestamp || "Live"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isFault ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Fault / Lockout (State 3)</span>
                          </div>
                        ) : isOffline ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Offline in SolisCloud (State 2)</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Operating Normal (State 1)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inverter Core Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Power (PAC)</span>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {inv.inverter_pac_output_kw.toFixed(1)} <span className="text-xs font-normal">kW</span>
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">DC Bus Voltage</span>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {inv.inverter_dc_bus_voltage.toFixed(1)} <span className="text-xs font-normal">V</span>
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Inverter Temperature</span>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {inv.inverter_temp_c.toFixed(1)} <span className="text-xs font-normal">°C</span>
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Grid Frequency / PF</span>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {inv.grid_frequency_hz.toFixed(2)} <span className="text-xs font-normal">Hz</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block">PF: {inv.grid_power_factor.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Solar MPPT Strings Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        DC Solar MPPT Strings (Inverter {idx + 1})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block mb-1">String 1</span>
                          <div className="text-slate-500 space-y-0.5 font-mono text-[11px]">
                            <div>V: <span className="text-slate-900 font-medium">{inv.pv1_voltage} V</span></div>
                            <div>I: <span className="text-slate-900 font-medium">{inv.pv1_current} A</span></div>
                            <div className="font-bold text-amber-700">{inv.pv1_power_w} W</div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block mb-1">String 2</span>
                          <div className="text-slate-500 space-y-0.5 font-mono text-[11px]">
                            <div>V: <span className="text-slate-900 font-medium">{inv.pv2_voltage} V</span></div>
                            <div>I: <span className="text-slate-900 font-medium">{inv.pv2_current} A</span></div>
                            <div className="font-bold text-amber-700">{inv.pv2_power_w} W</div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block mb-1">String 3</span>
                          <div className="text-slate-500 space-y-0.5 font-mono text-[11px]">
                            <div>V: <span className="text-slate-900 font-medium">{inv.pv3_voltage} V</span></div>
                            <div>I: <span className="text-slate-900 font-medium">{inv.pv3_current} A</span></div>
                            <div className="font-bold text-amber-700">{inv.pv3_power_w} W</div>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <span className="font-bold text-slate-700 block mb-1">String 4</span>
                          <div className="text-slate-500 space-y-0.5 font-mono text-[11px]">
                            <div>V: <span className="text-slate-900 font-medium">{inv.pv4_voltage} V</span></div>
                            <div>I: <span className="text-slate-900 font-medium">{inv.pv4_current} A</span></div>
                            <div className="font-bold text-amber-700">{inv.pv4_power_w} W</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3-Phase AC Grid Telemetry */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        3-Phase AC Grid Electrical Measurements
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                          <span className="font-bold text-blue-900 block mb-1">Phase A (L1)</span>
                          <div className="text-slate-600 space-y-0.5 font-mono text-[11px]">
                            <div>Voltage: <span className="text-slate-900 font-medium">{inv.phase_a_voltage} V</span></div>
                            <div>Current: <span className="text-slate-900 font-medium">{inv.phase_a_current} A</span></div>
                            <div>Power: <span className="font-bold text-blue-700">{inv.phase_a_power_kw.toFixed(2)} kW</span></div>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                          <span className="font-bold text-blue-900 block mb-1">Phase B (L2)</span>
                          <div className="text-slate-600 space-y-0.5 font-mono text-[11px]">
                            <div>Voltage: <span className="text-slate-900 font-medium">{inv.phase_b_voltage} V</span></div>
                            <div>Current: <span className="text-slate-900 font-medium">{inv.phase_b_current} A</span></div>
                            <div>Power: <span className="font-bold text-blue-700">{inv.phase_b_power_kw.toFixed(2)} kW</span></div>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
                          <span className="font-bold text-blue-900 block mb-1">Phase C (L3)</span>
                          <div className="text-slate-600 space-y-0.5 font-mono text-[11px]">
                            <div>Voltage: <span className="text-slate-900 font-medium">{inv.phase_c_voltage} V</span></div>
                            <div>Current: <span className="text-slate-900 font-medium">{inv.phase_c_current} A</span></div>
                            <div>Power: <span className="font-bold text-blue-700">{inv.phase_c_power_kw.toFixed(2)} kW</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function InvertersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Inverters...</div>}>
      <InvertersContent />
    </Suspense>
  );
}
