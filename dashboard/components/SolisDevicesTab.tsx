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
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Fetching device details from SolisCloud...</p>
      </div>
    );
  }

  const inverters = devices.inverters || [];
  const batteries = devices.batteries || [];
  const dataloggers = devices.dataloggers || [];
  const meters = devices.meters || [];

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Pills & Device Status (Strictly White, Orange, Green, Black) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Devices Synchronized & Normal</span>
        </div>
      </div>

      {/* ========================================================== */}
      {/* 2. INVERTERS SECTION                                       */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "INVERTER") && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Solar Storage Inverters
          </h3>

          {inverters.map((inv: any) => {
            const isExpanded = !!expandedInverters[inv.id];
            return (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden transition-all"
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#f37021]">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-slate-900">{inv.name}</h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{inv.status}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Model: <strong className="text-slate-700">{inv.model}</strong> · SN: <span className="text-slate-700">{inv.sn}</span> · FW: {inv.firmware}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active Power</span>
                      <p className="text-lg sm:text-xl font-extrabold text-[#f37021] font-mono">
                        {inv.pacKw} <span className="text-xs font-medium text-slate-500">kW</span>
                      </p>
                    </div>

                    <button
                      onClick={() => toggleInverter(inv.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-slate-400 hover:text-slate-600 transition-colors"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Details Body */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-4 bg-gray-50/30">
                    {/* Top 4 Key Operational Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-slate-500 block">Internal Temperature</span>
                        <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{inv.temperatureC} ℃</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-slate-500 block">DC Bus Voltage</span>
                        <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{inv.dcBusVoltageV} V</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-slate-500 block">Grid Frequency</span>
                        <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{inv.gridFrequencyHz} Hz</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <span className="text-slate-500 block">Daily Inverter Yield</span>
                        <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">{inv.dailyYieldKwh} kWh</p>
                      </div>
                    </div>

                    {/* DC MPPT Strings Grid (PV1 to PV4) */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Zap className="w-3.5 h-3.5 text-[#f37021]" />
                        <span>DC MPPT Solar Strings (Real-Time Telemetry)</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {inv.strings.map((str: any) => (
                          <div
                            key={str.string}
                            className="bg-white p-3 rounded-xl border border-orange-200/60 bg-orange-50/20 text-xs space-y-1 font-mono"
                          >
                            <span className="font-bold text-[#f37021] block text-[11px]">
                              PV String {str.string}
                            </span>
                            <div className="flex justify-between text-slate-600">
                              <span>Voltage:</span>
                              <strong className="text-slate-900">{str.voltageV} V</strong>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Current:</span>
                              <strong className="text-slate-900">{str.currentA} A</strong>
                            </div>
                            <div className="flex justify-between text-slate-600 pt-0.5 border-t border-orange-100">
                              <span>Power:</span>
                              <strong className="text-[#f37021]">{str.powerW} W</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AC 3-Phase Grid Output Parameters */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <Activity className="w-3.5 h-3.5 text-emerald-600" />
                        <span>AC 3-Phase Grid Output Parameters</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {inv.phases.map((ph: any) => (
                          <div
                            key={ph.phase}
                            className="bg-white p-3 rounded-xl border border-emerald-200/60 bg-emerald-50/20 text-xs space-y-1 font-mono"
                          >
                            <span className="font-bold text-emerald-700 block text-[11px]">
                              {ph.phase}
                            </span>
                            <div className="flex justify-between text-slate-600">
                              <span>Voltage:</span>
                              <strong className="text-slate-900">{ph.voltageV} V</strong>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Current:</span>
                              <strong className="text-slate-900">{ph.currentA} A</strong>
                            </div>
                            <div className="flex justify-between text-slate-600 pt-0.5 border-t border-emerald-100">
                              <span>Active Power:</span>
                              <strong className="text-emerald-700">{ph.powerKw} kW</strong>
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
      {/* 3. BATTERY STORAGE SECTION                                */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "BATTERY") && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Energy Storage Battery Units
          </h3>

          {batteries.map((bat: any) => (
            <div
              key={bat.id}
              className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                    <BatteryCharging className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">{bat.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        {bat.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Model: <strong className="text-slate-700">{bat.model}</strong> · SN: <span className="text-slate-700">{bat.sn}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-start sm:self-center">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">State of Charge</span>
                    <p className="text-lg sm:text-xl font-extrabold text-emerald-600 font-mono">
                      {bat.socPercent}%
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Health (SOH)</span>
                    <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono">
                      {bat.sohPercent}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Segmented Green Battery Level Bar (Exact Match to Screenshot) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700">Battery Level</span>
                  <span className="text-emerald-700 font-mono font-bold">{bat.socPercent}%</span>
                </div>
                <div className="grid grid-cols-10 gap-1.5 h-3">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const isFilled = i < Math.round(bat.socPercent / 10);
                    return (
                      <div
                        key={i}
                        className={`rounded-sm transition-all ${
                          isFilled ? "bg-[#10b981]" : "bg-gray-200"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Detailed Battery Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-slate-500 font-sans block">Bus Voltage</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">{bat.voltageV} V</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-slate-500 font-sans block">Current</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">{bat.currentA} A</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50/50 border border-orange-200/60">
                  <span className="text-orange-800 font-sans block">Power Output</span>
                  <strong className="text-[#f37021] text-sm mt-0.5 block">{bat.powerKw} kW</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
                  <span className="text-emerald-800 font-sans block">Cell Delta</span>
                  <strong className="text-emerald-700 text-sm mt-0.5 block">{bat.cellDeltaMv} mV</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-slate-500 font-sans block">Total Cycles</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">{bat.cycles} Cycles</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-slate-500 font-sans block">Temperature</span>
                  <strong className="text-slate-900 text-sm mt-0.5 block">{bat.temperatureC} ℃</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60">
                  <span className="text-emerald-800 font-sans block">Today Charge</span>
                  <strong className="text-emerald-700 text-sm mt-0.5 block">{bat.todayChargeKwh} kWh</strong>
                </div>
                <div className="p-2.5 rounded-lg bg-orange-50/50 border border-orange-200/60">
                  <span className="text-orange-800 font-sans block">Today Discharge</span>
                  <strong className="text-[#f37021] text-sm mt-0.5 block">{bat.todayDischargeKwh} kWh</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================== */}
      {/* 4. DATALOGGERS & SMART METERS                             */}
      {/* ========================================================== */}
      {(filterType === "ALL" || filterType === "COLLECTOR" || filterType === "METER") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Datalogger */}
          {(filterType === "ALL" || filterType === "COLLECTOR") &&
            dataloggers.map((col: any) => (
              <div
                key={col.id}
                className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-slate-700">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{col.name}</h4>
                    <span className="text-xs text-slate-500 font-mono">SN: {col.sn}</span>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    {col.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 font-sans block">Communication</span>
                    <strong className="text-slate-900">{col.communicationType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Signal Strength</span>
                    <strong className="text-emerald-700">{col.signalStrength}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Local IP</span>
                    <strong className="text-slate-900">{col.ipAddress}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Protocol</span>
                    <strong className="text-slate-900">MQTT v5 TLS</strong>
                  </div>
                </div>
              </div>
            ))}

          {/* Smart Meter */}
          {(filterType === "ALL" || filterType === "METER") &&
            meters.map((mtr: any) => (
              <div
                key={mtr.id}
                className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-slate-700">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{mtr.name}</h4>
                    <span className="text-xs text-slate-500 font-mono">SN: {mtr.sn}</span>
                  </div>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    {mtr.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 font-sans block">Grid Frequency</span>
                    <strong className="text-slate-900">{mtr.gridFrequencyHz} Hz</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Live Grid Power</span>
                    <strong className="text-[#f37021]">{mtr.liveGridPowerKw} kW</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Purchased Today</span>
                    <strong className="text-[#f37021]">{mtr.purchasedTodayKwh} kWh</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-sans block">Sold to Grid</span>
                    <strong className="text-emerald-700">{mtr.soldTodayKwh} kWh</strong>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
