"use client";

import React from "react";
import { Sun, Battery, Home, Zap, ShieldCheck } from "lucide-react";

interface SolisLayoutTabProps {
  plantName: string;
  capacityKwp: number;
}

export default function SolisLayoutTab({ plantName, capacityKwp }: SolisLayoutTabProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">Electrical System & String Layout (SLD)</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Single Line Diagram (SLD) and DC/AC distribution architecture for {plantName}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold self-start sm:self-center">
          Topology Verified & Active
        </span>
      </div>

      {/* Interactive Topology Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
        {/* Stage 1: Solar Strings */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 flex flex-col items-center justify-between space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">Roof PV Strings</h4>
            <p className="text-[11px] text-amber-700 mt-0.5 font-mono">4 x MPPT Inputs</p>
          </div>
          <div className="w-full bg-white/80 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 font-mono text-left">
            <div className="flex justify-between"><span>PV1:</span> <strong>780V / 11.4A</strong></div>
            <div className="flex justify-between"><span>PV2:</span> <strong>790V / 5.6A</strong></div>
            <div className="flex justify-between"><span>PV3:</span> <strong>765V / 6.4A</strong></div>
            <div className="flex justify-between"><span>PV4:</span> <strong>766V / 5.9A</strong></div>
          </div>
        </div>

        {/* Stage 2: Hybrid Inverter */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col items-center justify-between space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Solis Hybrid Core</h4>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-mono">Model S6-EH3P50K-H</p>
          </div>
          <div className="w-full bg-white/80 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 font-mono text-left">
            <div className="flex justify-between"><span>DC Bus:</span> <strong>868.2 V</strong></div>
            <div className="flex justify-between"><span>Efficiency:</span> <strong>98.4%</strong></div>
            <div className="flex justify-between"><span>Temp:</span> <strong>39.4 ℃</strong></div>
            <div className="flex justify-between"><span>Output:</span> <strong>3-Phase 400V</strong></div>
          </div>
        </div>

        {/* Stage 3: Battery Energy Storage */}
        <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 flex flex-col items-center justify-between space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Battery className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">HV Battery Bank</h4>
            <p className="text-[11px] text-blue-700 mt-0.5 font-mono">100Ah LiFePO4</p>
          </div>
          <div className="w-full bg-white/80 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 font-mono text-left">
            <div className="flex justify-between"><span>Bus Voltage:</span> <strong>721.4 V</strong></div>
            <div className="flex justify-between"><span>Current:</span> <strong>20.9 A</strong></div>
            <div className="flex justify-between"><span>BMS Health:</span> <strong>100% SOH</strong></div>
            <div className="flex justify-between"><span>Cycles:</span> <strong>27 Total</strong></div>
          </div>
        </div>

        {/* Stage 4: AC Distribution & Smart Load */}
        <div className="bg-purple-50/50 border border-purple-200/80 rounded-2xl p-4 flex flex-col items-center justify-between space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-purple-900">AC Home & Grid</h4>
            <p className="text-[11px] text-purple-700 mt-0.5 font-mono">Smart Load & Bypass</p>
          </div>
          <div className="w-full bg-white/80 rounded-xl p-2.5 text-xs text-slate-600 space-y-1 font-mono text-left">
            <div className="flex justify-between"><span>Grid Freq:</span> <strong>49.92 Hz</strong></div>
            <div className="flex justify-between"><span>Power Factor:</span> <strong>1.00</strong></div>
            <div className="flex justify-between"><span>Meter:</span> <strong>Bi-Directional</strong></div>
            <div className="flex justify-between"><span>EPS Transfer:</span> <strong>&lt; 10 ms</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
