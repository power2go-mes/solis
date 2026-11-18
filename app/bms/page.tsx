"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { PlantInfo, TelemetryLatest, BmsTelemetry } from "@/lib/types";
import {
  BatteryCharging,
  Cpu,
  Thermometer,
  ShieldAlert,
  Zap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

function BmsContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [bms, setBms] = useState<BmsTelemetry | null>(null);
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
        const [plantsRes, telRes, bmsRes] = await Promise.all([
          fetch("/api/plants"),
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(`/api/bms?stationId=${stationId}`),
        ]);

        const pData = await plantsRes.json();
        const tData = await telRes.json();
        const bData = await bmsRes.json();

        if (pData.success) setPlants(pData.plants);
        if (tData.success && tData.hasData) setTelemetry(tData.telemetry);
        else setTelemetry(null);

        if (bData.success && bData.bms) setBms(bData.bms);
        else setBms(null);
      } catch (err) {
        console.error("Error loading BMS data:", err);
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
          {/* Page Title */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BatteryCharging className="w-5 h-5 text-emerald-600" />
              Battery Management System (BMS/BMU) Diagnostics
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Deep telemetry: cell balance, thermal monitoring, charge current restrictions, and register decoding
            </p>
          </div>

          {!bms ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-800 text-sm">No BMS Telemetry Ingested</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Deep BMS/BMU registers have not been recorded in Supabase for this plant yet.
              </p>
            </div>
          ) : (
            <>
              {/* Top Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* SOC & SOH */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">SOC / SOH</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 font-mono">{bms.soc_percent}%</span>
                    <span className="text-xs text-emerald-600 font-bold font-mono">SOH: {bms.soh_percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${bms.soc_percent}%` }}
                    />
                  </div>
                </div>

                {/* DC Voltage & Current */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Battery Voltage / Current</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">
                      {bms.battery_voltage.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">V</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">
                    Current: <span className="font-bold">{bms.battery_current.toFixed(1)} A</span> ({bms.bms_power_kw.toFixed(2)} kW)
                  </div>
                </div>

                {/* Cell Balance Delta */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Cell Balance Delta</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black font-mono ${bms.cell_voltage_delta_mv > 30 ? "text-amber-600" : "text-emerald-600"}`}>
                      {bms.cell_voltage_delta_mv}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">mV</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Min: {bms.min_cell_voltage.toFixed(3)} V • Max: {bms.max_cell_voltage.toFixed(3)} V
                  </div>
                </div>

                {/* Thermal Status */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <span className="text-xs text-slate-500 font-medium block">Thermal Range</span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-900 font-mono">{bms.avg_temp_c.toFixed(1)}</span>
                    <span className="text-xs text-slate-500 font-medium">°C (Avg)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Min: {bms.min_temp_c.toFixed(1)}°C • Max: {bms.max_temp_c.toFixed(1)}°C
                  </div>
                </div>
              </div>

              {/* Dynamic BMS Charge & Discharge Limits */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-600" />
                  Dynamic Operational Limits & Inverter Setpoints
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-xl border ${bms.charge_current_limit === 0 ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100"}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Charge Current Limit</span>
                    <span className={`text-xl font-black font-mono ${bms.charge_current_limit === 0 ? "text-rose-700" : "text-slate-900"}`}>
                      {bms.charge_current_limit} A
                    </span>
                    {bms.charge_current_limit === 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold block mt-1">
                        Locked / Inhibit Mode
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Discharge Current Limit</span>
                    <span className="text-xl font-black font-mono text-slate-900">{bms.discharge_current_limit} A</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Maximum discharge draw</span>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Target Charging Voltage</span>
                    <span className="text-xl font-black font-mono text-slate-900">{bms.charging_voltage_target} V</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Absorption CV target</span>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Cutoff Voltage</span>
                    <span className="text-xl font-black font-mono text-slate-900">{bms.discharge_cutoff_voltage} V</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Lower protection threshold</span>
                  </div>
                </div>
              </div>

              {/* Cell Balance & Thermal Telemetry Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cell Balance Details */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-slate-900 text-sm">Individual Cell Balance Telemetry</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Minimum Cell Voltage</span>
                      <span className="font-mono font-bold text-slate-800">
                        {bms.min_cell_voltage.toFixed(3)} V ({bms.min_cell_location || "Cell #1"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Maximum Cell Voltage</span>
                      <span className="font-mono font-bold text-slate-800">
                        {bms.max_cell_voltage.toFixed(3)} V ({bms.max_cell_location || "Cell #14"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Cell Voltage Delta</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {bms.cell_voltage_delta_mv} mV (Nominal &lt; 50 mV)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500">Battery Loop Cycles</span>
                      <span className="font-mono font-bold text-slate-800">{bms.loop_cycles} Full Cycles</span>
                    </div>
                  </div>
                </div>

                {/* Thermal Sensor Details */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Thermometer className="w-4 h-4 text-rose-500" />
                    <h3 className="font-bold text-slate-900 text-sm">Thermal Monitoring & Sensors</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Average Pack Temperature</span>
                      <span className="font-mono font-bold text-slate-800">{bms.avg_temp_c.toFixed(1)} °C</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Lowest Sensor Temperature</span>
                      <span className="font-mono font-bold text-slate-800">
                        {bms.min_temp_c.toFixed(1)} °C ({bms.min_temp_location || "Sensor #1"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500">Highest Sensor Temperature</span>
                      <span className="font-mono font-bold text-slate-800">
                        {bms.max_temp_c.toFixed(1)} °C ({bms.max_temp_location || "Sensor #4"})
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500">Rated Energy Capacity</span>
                      <span className="font-mono font-bold text-slate-800">{bms.capacity_ah} Ah (~67.5 kWh)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* BMS Alarm & Fault Register Decoding */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ShieldAlert className="w-4 h-4 text-sky-600" />
                  <h3 className="font-bold text-slate-900 text-sm">BMS Internal Fault & Alarm Register Decoding</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">bms_alarm Register</span>
                    <span className="text-lg font-mono font-bold text-slate-800 block mt-1">
                      {bms.bms_alarm} ({bms.alarm_hex})
                    </span>
                    <span className="text-xs text-emerald-700 font-medium block mt-1">
                      {bms.bms_alarm === 0 ? "✓ 0x0000 (No Active Alarm)" : "Alarm Flags Present"}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">failure_info_01 Register</span>
                    <span className="text-lg font-mono font-bold text-slate-800 block mt-1">
                      {bms.fail01_hex}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">Hardware/Contactor Flags</span>
                  </div>

                  <div className="p-4 rounded-xl border bg-slate-50 border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">failure_info_02 Register</span>
                    <span className="text-lg font-mono font-bold text-slate-800 block mt-1">
                      {bms.fail02_hex}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">Communication/CAN Flags</span>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Engineering Rule:</strong> The BMS registers are extracted directly from the battery CAN bus. Inverter-reported alarms (such as <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">1054 UN-Vbatt</code>) originate in the inverter&apos;s DSP controller, while BMS registers originate in the battery pack BMU.
                  </p>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function BmsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading BMS Diagnostics...</div>}>
      <BmsContent />
    </Suspense>
  );
}
