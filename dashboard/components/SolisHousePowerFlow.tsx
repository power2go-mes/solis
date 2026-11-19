"use client";

import React from "react";
import { Clock, Settings } from "lucide-react";

interface SolisHousePowerFlowProps {
  solarKw?: number;
  loadKw?: number;
  batterySoc?: number;
  batteryKw?: number;
  batteryState?: string;
  gridKw?: number;
  dailyYieldKwh?: number;
  dailyChargeKwh?: number;
  dailyDischargeKwh?: number;
}

export default function SolisHousePowerFlow({
  solarKw = 11.5,
  loadKw = 1.4,
  batterySoc = 100,
  batteryKw = 0.0,
  batteryState = "Idle",
  gridKw = 9.8,
  dailyYieldKwh = 85.6,
  dailyChargeKwh = 17.8,
  dailyDischargeKwh = 2.4,
}: SolisHousePowerFlowProps) {
  const isExporting = gridKw >= 0;

  return (
    <div className="bg-gradient-to-br from-[#eaf2ff] via-[#f2f7ff] to-[#f8fafd] rounded-2xl border border-blue-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-4 sm:p-5 relative overflow-hidden transition-all">
      {/* Top Right Card Controls */}
      <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
        <button
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          title="History playback"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
        <button
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
          title="Flow Settings"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: 3D Villa House & Power Flow Badges (approx 8 cols) */}
        <div className="lg:col-span-8 relative min-h-[220px] flex items-center justify-center">
          {/* Badge 1: PV Solar (Top Left) */}
          <div className="absolute top-1 left-2 sm:left-6 z-20 bg-white/90 backdrop-blur-xs border border-amber-200/90 rounded-lg px-2.5 py-1 shadow-xs flex flex-col">
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">PV</span>
            <span className="text-sm font-bold text-slate-800">{solarKw.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kW</span></span>
          </div>

          {/* Badge 2: House Load (Top Center/Right) */}
          <div className="absolute top-1 right-12 sm:right-20 z-20 bg-white/90 backdrop-blur-xs border border-purple-200/90 rounded-lg px-2.5 py-1 shadow-xs flex flex-col">
            <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Load</span>
            <span className="text-sm font-bold text-slate-800">{loadKw.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kW</span></span>
          </div>

          {/* Badge 3: Battery (Bottom Left) */}
          <div className="absolute bottom-1 left-2 sm:left-8 z-20 bg-white/90 backdrop-blur-xs border border-emerald-200/90 rounded-lg px-2.5 py-1 shadow-xs flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Battery</span>
              <span className="text-[10px] font-bold text-emerald-700">{batterySoc}%</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{batteryKw.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kW</span></span>
          </div>

          {/* Badge 4: Grid (Bottom Right) */}
          <div className="absolute bottom-1 right-2 sm:right-8 z-20 bg-white/90 backdrop-blur-xs border border-sky-200/90 rounded-lg px-2.5 py-1 shadow-xs flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Grid</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 border border-sky-200">
                {isExporting ? "Exporting" : "Importing"}
              </span>
            </div>
            <span className="text-sm font-bold text-slate-800">{Math.abs(gridKw).toFixed(1)} <span className="text-[10px] font-normal text-slate-500">kW</span></span>
          </div>

          {/* 3D Villa House Isometric SVG */}
          <svg
            viewBox="0 0 320 200"
            className="w-full max-w-[280px] sm:max-w-[320px] drop-shadow-md select-none pointer-events-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Ground shadow */}
            <ellipse cx="160" cy="175" rx="110" ry="20" fill="rgba(148, 163, 184, 0.25)" />

            {/* Garage section (right) */}
            <path d="M190 120 L240 95 L255 105 L205 130 Z" fill="#e2e8f0" />
            <path d="M205 130 L255 105 L255 155 L205 170 Z" fill="#cbd5e1" />
            <path d="M190 120 L205 130 L205 170 L190 158 Z" fill="#94a3b8" />
            {/* Garage door */}
            <path d="M215 138 L245 122 L245 158 L215 168 Z" fill="#475569" opacity="0.8" />

            {/* Main house body */}
            <path d="M100 95 L160 65 L190 80 L130 110 Z" fill="#f8fafc" />
            <path d="M100 95 L130 110 L130 165 L100 150 Z" fill="#e2e8f0" />
            <path d="M130 110 L190 80 L190 135 L130 165 Z" fill="#ffffff" />

            {/* Chimney */}
            <path d="M150 48 L160 43 L164 45 L154 50 Z" fill="#334155" />
            <path d="M150 48 L154 50 L154 65 L150 62 Z" fill="#1e293b" />
            <path d="M154 50 L164 45 L164 60 L154 65 Z" fill="#475569" />

            {/* Pitched Roof */}
            <path d="M90 95 L150 50 L180 65 L120 110 Z" fill="#1e293b" />
            <path d="M180 65 L150 50 L195 72 L225 87 Z" fill="#334155" />

            {/* Solar Panels on Roof (Blue cells with silver frames) */}
            <path d="M98 90 L145 55 L170 68 L123 103 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1" />
            {/* Solar panel grid lines */}
            <line x1="121" y1="72" x2="147" y2="85" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
            <line x1="108" y1="82" x2="159" y2="61" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
            <line x1="114" y1="88" x2="165" y2="67" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />

            {/* Inverter on the house wall */}
            <rect x="145" y="118" width="14" height="20" rx="2" fill="#ffffff" stroke="#f97316" strokeWidth="1.2" />
            <circle cx="152" cy="125" r="2" fill="#10b981" />
            <line x1="148" y1="131" x2="156" y2="131" stroke="#94a3b8" strokeWidth="1" />

            {/* Battery pack beside the house */}
            <rect x="122" y="142" width="10" height="18" rx="1.5" fill="#10b981" stroke="#059669" strokeWidth="1" />
            <rect x="124" y="144" width="6" height="3" rx="0.5" fill="#ecfdf5" />

            {/* House Windows & Door */}
            <rect x="105" y="112" width="8" height="14" rx="1" fill="#0284c7" opacity="0.75" />
            <rect x="165" y="98" width="12" height="14" rx="1" fill="#0284c7" opacity="0.75" />
            <rect x="168" y="130" width="10" height="22" rx="1" fill="#475569" />
          </svg>
        </div>

        {/* Right: Energy Metrics (approx 4 cols) */}
        <div className="lg:col-span-4 flex flex-col justify-center space-y-4 border-t lg:border-t-0 lg:border-l border-blue-200/60 lg:pl-5 pt-3 lg:pt-0">
          {/* PV Generation */}
          <div>
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {dailyYieldKwh.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-700 ml-1">kWh</span>
              <span className="text-[10px] text-slate-400 font-normal ml-1.5">0.7 kWh</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">PV</p>
          </div>

          {/* Daily Charge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {dailyChargeKwh.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-700 ml-1">kWh</span>
              <span className="text-[10px] text-slate-400 font-normal ml-1.5">0.9 kWh</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Daily Charge</p>
          </div>

          {/* Daily Discharge */}
          <div>
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {dailyDischargeKwh.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-700 ml-1">kWh</span>
            </div>
            <p className="text-[11px] text-slate-500 font-normal mt-0.5">Daily Discharge</p>
          </div>
        </div>
      </div>
    </div>
  );
}
