"use client";

import React from "react";

interface SolisMobileCommercialPowerFlowProps {
  solarKw?: number;
  loadKw?: number;
  batterySoc?: number;
  batteryKw?: number;
  batteryState?: string;
  gridKw?: number;
}

export default function SolisMobileCommercialPowerFlow({
  solarKw = 12.3,
  loadKw = 9.8,
  batterySoc = 60,
  batteryKw = 2.1,
  batteryState = "Charging",
  gridKw = 0.0,
}: SolisMobileCommercialPowerFlowProps) {
  return (
    <div className="relative w-full overflow-hidden select-none py-2">
      {/* 3D Commercial Building Isometric SVG with Callout Badges */}
      <div className="relative w-full max-w-[380px] mx-auto min-h-[260px] flex items-center justify-center">
        {/* Callout 1: PV (Top Left) */}
        <div className="absolute top-1 left-2 z-20 flex flex-col">
          <span className="text-[11px] font-normal text-slate-500">PV</span>
          <div className="flex items-baseline">
            <span className="text-base font-bold text-slate-900 tracking-tight font-mono">
              {solarKw.toFixed(1)}
            </span>
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">kW</span>
          </div>
          {/* Guide Line to Roof Solar */}
          <div className="w-16 h-8 border-b border-l border-dashed border-slate-300 mt-0.5 ml-2 pointer-events-none" />
        </div>

        {/* Callout 2: Load (Top Center/Right) */}
        <div className="absolute top-1 right-24 sm:right-28 z-20 flex flex-col">
          <span className="text-[11px] font-normal text-slate-500">Load</span>
          <div className="flex items-baseline">
            <span className="text-base font-bold text-slate-900 tracking-tight font-mono">
              {loadKw.toFixed(1)}
            </span>
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">kW</span>
          </div>
          {/* Guide Line to Building Core */}
          <div className="w-12 h-10 border-b border-r border-dashed border-slate-300 mt-0.5 pointer-events-none" />
        </div>

        {/* Callout 3: Battery (Bottom Left) */}
        <div className="absolute bottom-1 left-24 sm:left-28 z-20 flex flex-col items-start">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-normal text-slate-500">Battery</span>
            <span className="text-xs font-bold text-slate-900 font-mono">{batterySoc}%</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-base font-bold text-slate-900 tracking-tight font-mono">
              {batteryKw.toFixed(1)}
            </span>
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">kW</span>
          </div>
          {/* Green Status Pill */}
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-[10px] font-semibold text-emerald-600">
            {batteryState || "Charging"}
          </span>
        </div>

        {/* Callout 4: Grid (Bottom Right) */}
        <div className="absolute bottom-5 right-6 sm:right-10 z-20 flex flex-col items-start">
          <span className="text-[11px] font-normal text-slate-500">Grid</span>
          <div className="flex items-baseline">
            <span className="text-base font-bold text-slate-900 tracking-tight font-mono">
              {Math.abs(gridKw).toFixed(0)}
            </span>
            <span className="text-[10px] font-normal text-slate-500 ml-0.5">kW</span>
          </div>
          {/* Dotted Guide Line */}
          <div className="w-8 h-8 border-t border-l border-dashed border-slate-300 -mt-10 -ml-4 pointer-events-none" />
        </div>

        {/* 3D Commercial Building Isometric SVG */}
        <svg
          viewBox="0 0 360 250"
          className="w-full h-auto drop-shadow-md pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground Soft Shadow */}
          <ellipse cx="185" cy="225" rx="145" ry="24" fill="rgba(148, 163, 184, 0.22)" />

          {/* ======================================================== */}
          {/* Building Walls (Isometric Beige & Sand Tone)             */}
          {/* ======================================================== */}
          {/* Left Wall (Garage side) */}
          <path d="M40 85 L130 135 L130 215 L40 165 Z" fill="#ebe6dc" />
          {/* Front Wall (Inverter & main facade) */}
          <path d="M130 135 L330 80 L330 160 L130 215 Z" fill="#fcf9f2" />

          {/* Roof Edge Trim / Parapet */}
          <path d="M35 83 L130 137 L335 80 L240 27 Z" fill="#475569" />
          {/* Roof Slab Top */}
          <path d="M38 82 L130 134 L332 78 L240 29 Z" fill="#334155" />

          {/* Parapet inner depth */}
          <path d="M48 83 L130 128 L320 77 L238 34 Z" fill="#1e293b" />

          {/* ======================================================== */}
          {/* Solar Panel Arrays on Flat Roof (2 Rows of Tilt Tables)  */}
          {/* ======================================================== */}
          {/* Front Array */}
          <g>
            {/* Panel Tilt Frames */}
            <path d="M85 88 L195 58 L200 80 L90 110 Z" fill="#0369a1" stroke="#38bdf8" strokeWidth="0.8" />
            <path d="M90 110 L200 80 L200 83 L90 113 Z" fill="#075985" />
            {/* Solar Cell Grid Lines */}
            <line x1="112" y1="80" x2="117" y2="102" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="140" y1="73" x2="145" y2="95" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="168" y1="65" x2="173" y2="87" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="88" y1="99" x2="198" y2="69" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          </g>

          {/* Back Array */}
          <g>
            <path d="M135 60 L245 30 L250 52 L140 82 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />
            <path d="M140 82 L250 52 L250 55 L140 85 Z" fill="#0369a1" />
            {/* Solar Cell Grid Lines */}
            <line x1="162" y1="52" x2="167" y2="74" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="190" y1="45" x2="195" y2="67" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="218" y1="37" x2="223" y2="59" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
            <line x1="138" y1="71" x2="248" y2="41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
          </g>

          {/* Roof Chimney / Ventilation Stack on Right */}
          <g>
            <path d="M285 45 L297 42 L297 78 L285 81 Z" fill="#e2e8f0" />
            <path d="M297 42 L306 44 L306 80 L297 78 Z" fill="#cbd5e1" />
            {/* Top Cap */}
            <ellipse cx="295" cy="42" rx="10" ry="3.5" fill="#64748b" />
            {/* Stack Rings */}
            <line x1="285" y1="56" x2="306" y2="58" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="285" y1="68" x2="306" y2="70" stroke="#94a3b8" strokeWidth="1.2" />
          </g>

          {/* Sun Arrow indicator above solar panels */}
          <path d="M190 73 L194 67 L198 73 Z" fill="#f97316" />

          {/* ======================================================== */}
          {/* Wall Features: Doors, Windows, Inverter, Battery         */}
          {/* ======================================================== */}
          {/* Left Roll-Up Garage Door */}
          <path d="M55 125 L105 152 L105 208 L55 180 Z" fill="#475569" />
          {/* Roll-up slats */}
          <line x1="55" y1="138" x2="105" y2="165" stroke="#334155" strokeWidth="1" />
          <line x1="55" y1="150" x2="105" y2="177" stroke="#334155" strokeWidth="1" />
          <line x1="55" y1="162" x2="105" y2="189" stroke="#334155" strokeWidth="1" />
          <line x1="55" y1="174" x2="105" y2="201" stroke="#334155" strokeWidth="1" />

          {/* Front Roll-Up Service Door on Right */}
          <path d="M280 148 L320 137 L320 178 L280 188 Z" fill="#475569" />
          <line x1="280" y1="158" x2="320" y2="147" stroke="#334155" strokeWidth="1" />
          <line x1="280" y1="168" x2="320" y2="157" stroke="#334155" strokeWidth="1" />
          <line x1="280" y1="178" x2="320" y2="167" stroke="#334155" strokeWidth="1" />

          {/* Upper Clerestory Windows with Warm Light */}
          <path d="M150 128 L195 116 L195 136 L150 148 Z" fill="#fef3c7" stroke="#475569" strokeWidth="1.5" />
          <path d="M210 112 L262 98 L262 118 L210 132 Z" fill="#fef3c7" stroke="#475569" strokeWidth="1.5" />

          {/* Wall Inverter (Solis 50kW) */}
          <g>
            <path d="M178 152 L208 144 L208 178 L178 186 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            {/* Orange Solis Radiant Emblem on Inverter */}
            <circle cx="193" cy="162" r="3.5" fill="#f97316" />
            <circle cx="193" cy="162" r="2" fill="#ffffff" />
            {/* Status LED */}
            <circle cx="185" cy="172" r="1.5" fill="#10b981" />
            {/* Display screen */}
            <rect x="189" y="170" width="12" height="4" rx="0.5" fill="#0f172a" />
          </g>

          {/* Battery Cabinet (White / Silver Enclosure on Floor) */}
          <g>
            <path d="M140 182 L170 174 L170 216 L140 224 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            <path d="M140 182 L148 176 L178 168 L170 174 Z" fill="#e2e8f0" />
            {/* Battery Door Seam & Handle */}
            <line x1="155" y1="178" x2="155" y2="220" stroke="#94a3b8" strokeWidth="0.8" />
            <rect x="157" y="196" width="1.5" height="4" fill="#64748b" />
          </g>

          {/* Junction / Smart Meter Box on Floor (Right) */}
          <g>
            <path d="M228 178 L244 174 L244 196 L228 200 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
            <circle cx="236" cy="186" r="2" fill="#0284c7" />
          </g>

          {/* Conduit connection pipes */}
          <path d="M193 186 L193 194 L170 198" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
          <path d="M208 170 L236 162 L236 178" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
          <path d="M193 152 L193 90" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2,2" fill="none" />
        </svg>
      </div>
    </div>
  );
}
