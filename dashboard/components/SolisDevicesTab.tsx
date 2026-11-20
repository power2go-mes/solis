"use client";

import React, { useState } from "react";
import {
  Cpu,
  BatteryCharging,
  Radio,
  Gauge,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Thermometer,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface SolisDevicesTabProps {
  devices: any;
  isLoading?: boolean;
}

export default function SolisDevicesTab({ devices, isLoading }: SolisDevicesTabProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [expandedInverters, setExpandedInverters] = useState<Record<string, boolean>>({ "inv-1": true });

  const toggleInverter = (id: string) => {
    setExpandedInverters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading || !devices) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Fetching device details from SolisCloud...</p>
      </div>
    );
  }

  const inverters = devices.inverters || [];
  const batteries = devices.batteries || [];
  const dataloggers = devices.dataloggers || [];
  const meters = devices.meters || [];

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Pills & Device Counts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {[
            { id: "ALL", label: `All Devices (${devices.summary?.totalDevices || 4})` },
            { id: "INVERTER", label: `Inverters (${inverters.length})` },
            { id: "BATTERY", label: `Batteries (${batteries.length})` },
            { id: "COLLECTOR", label: `Dataloggers (${dataloggers.length})` },
            { id: "METER", label: `Smart Meters (${meters.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterType === tab.id
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-gray-100/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Devices Synchronized & Normal</span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 2. INVERTERS SECTION                                       */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "INVERTER") && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Solar Storage Inverters
          </h3>

          {inverters.map((inv: any) => {
            const isExpanded = !!expandedInverters[inv.id];
            return (
              <div
                key={inv.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden transition-all"
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#f37021]">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{inv.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{inv.status}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                        <span>Model: <strong className="text-slate-700 font-semibold">{inv.model}</strong></span>
                        <span>•</span>
                        <span>SN: <strong className="text-slate-700 font-semibold">{inv.sn}</strong></span>
                        <span>•</span>
                        <span>FW: <strong className="text-slate-700 font-semibold">{inv.firmware}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Active Power</span>
                      <span className="text-lg font-black text-slate-900 font-mono">
                        {inv.pacKw} <span className="text-xs font-normal text-slate-500">kW</span>
                      </span>
                    </div>

                    <button
                      onClick={() => toggleInverter(inv.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-500 transition-colors"
                      title={isExpanded ? "Collapse Details" : "Expand Details"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick KPIs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/50 border-b border-gray-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Internal Temperature</span>
                    <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{inv.temperatureC} ℃</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">DC Bus Voltage</span>
                    <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{inv.dcBusVoltageV} V</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Grid Frequency</span>
                    <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{inv.gridFrequencyHz} Hz</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Daily Inverter Yield</span>
                    <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{inv.dailyYieldKwh} kWh</p>
                  </div>
                </div>

                {/* Expandable Breakdown: DC Strings & AC Phases */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* DC PV Strings */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>DC MPPT Solar Strings (Real-time Telemetry)</span>
                      </h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {inv.strings?.map((s: any) => (
                          <div
                            key={s.string}
                            className="bg-amber-50/40 border border-amber-200/70 rounded-xl p-3 text-xs"
                          >
                            <span className="font-bold text-amber-800 block mb-1">PV String {s.string}</span>
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <div className="flex justify-between text-slate-600">
                                <span>Voltage:</span>
                                <span className="font-semibold text-slate-900">{s.voltageV} V</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Current:</span>
                                <span className="font-semibold text-slate-900">{s.currentA} A</span>
                              </div>
                              <div className="flex justify-between text-amber-700 font-bold pt-0.5 border-t border-amber-200/60">
                                <span>Power:</span>
                                <span>{s.powerW} W</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AC 3-Phase Output */}
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-blue-500" />
                        <span>AC 3-Phase Grid Output Parameters</span>
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {inv.phases?.map((p: any) => (
                          <div
                            key={p.phase}
                            className="bg-blue-50/40 border border-blue-200/70 rounded-xl p-3 text-xs"
                          >
                            <span className="font-bold text-blue-800 block mb-1">{p.phase}</span>
                            <div className="space-y-0.5 font-mono text-[11px]">
                              <div className="flex justify-between text-slate-600">
                                <span>Voltage:</span>
                                <span className="font-semibold text-slate-900">{p.voltageV} V</span>
                              </div>
                              <div className="flex justify-between text-slate-600">
                                <span>Current:</span>
                                <span className="font-semibold text-slate-900">{p.currentA} A</span>
                              </div>
                              <div className="flex justify-between text-blue-700 font-bold pt-0.5 border-t border-blue-200/60">
                                <span>Active Power:</span>
                                <span>{p.powerKw} kW</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================== */}
      {/* 3. BATTERIES SECTION                                       */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "BATTERY") && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Energy Storage Battery Units
          </h3>

          {batteries.map((bat: any) => (
            <div
              key={bat.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900">{bat.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{bat.status}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span>Model: <strong className="text-slate-700 font-semibold">{bat.model}</strong></span>
                      <span>•</span>
                      <span>SN: <strong className="text-slate-700 font-semibold">{bat.sn}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">State of Charge</span>
                    <span className="text-xl font-black text-emerald-600 font-mono">{bat.socPercent}%</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Health (SOH)</span>
                    <span className="text-xl font-black text-slate-900 font-mono">{bat.sohPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Battery Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-slate-400 font-medium">Voltage / Current</span>
                  <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">
                    {bat.voltageV} V / {bat.currentA} A
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-slate-400 font-medium">BMS Temperature</span>
                  <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{bat.temperatureC} ℃</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-slate-400 font-medium">Cell Delta Voltage</span>
                  <p className="font-bold text-emerald-700 font-mono text-sm mt-0.5">{bat.cellDeltaMv} mV (Healthy)</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-slate-400 font-medium">Charge Cycles</span>
                  <p className="font-bold text-slate-800 font-mono text-sm mt-0.5">{bat.cycles} Cycles</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-gray-100">
                <div>
                  <span className="text-slate-400 font-medium">Today Charge</span>
                  <p className="font-bold text-emerald-600 font-mono mt-0.5">{bat.todayChargeKwh} kWh</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Today Discharge</span>
                  <p className="font-bold text-amber-600 font-mono mt-0.5">{bat.todayDischargeKwh} kWh</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Total Charge</span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{bat.totalChargeMwh} MWh</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Total Discharge</span>
                  <p className="font-bold text-slate-800 font-mono mt-0.5">{bat.totalDischargeMwh} MWh</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. DATALOGGERS & SMART METERS SECTION                      */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "COLLECTOR" || filterType === "METER") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datalogger Card */}
          {(filterType === "ALL" || filterType === "COLLECTOR") &&
            dataloggers.map((col: any) => (
              <div
                key={col.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{col.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">SN: {col.sn}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Collector Model</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{col.model}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Connection Status</span>
                    <p className="font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{col.status}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Communication Interface</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{col.communicationType}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Signal Strength</span>
                    <p className="font-semibold text-slate-800 mt-0.5 font-mono">{col.signalStrength}</p>
                  </div>
                </div>
              </div>
            ))}

          {/* Smart Meter Card */}
          {(filterType === "ALL" || filterType === "METER") &&
            meters.map((mtr: any) => (
              <div
                key={mtr.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-3"
              >
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{mtr.name}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">SN: {mtr.sn}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Meter Model</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{mtr.model}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Meter Status</span>
                    <p className="font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{mtr.status}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Grid Frequency</span>
                    <p className="font-semibold text-slate-800 mt-0.5 font-mono">{mtr.gridFrequencyHz} Hz</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Today Purchased from Grid</span>
                    <p className="font-semibold text-blue-700 mt-0.5 font-mono">{mtr.purchasedTodayKwh} kWh</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
