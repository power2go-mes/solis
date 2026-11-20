"use client";

import React, { useState } from "react";
import { Clock, Box } from "lucide-react";

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
  isMobile?: boolean;
}

export default function SolisHousePowerFlow({
  solarKw = 61.2,
  loadKw = 8.6,
  batterySoc = 63,
  batteryKw = 51.3,
  batteryState = "Charging",
  gridKw = 0.0,
  dailyYieldKwh = 112.7,
  dailyChargeKwh = 80.4,
  dailyDischargeKwh = 53.0,
  isMobile = false,
}: SolisHousePowerFlowProps) {
  const [view3D, setView3D] = useState(true);

  const isPvActive = solarKw > 0.05;
  const isLoadActive = loadKw > 0.05;
  const isBatteryActive = Math.abs(batteryKw) > 0.05;
  const isBatteryCharging = batteryState.toLowerCase() === "charging" || batteryKw > 0.05;
  const isGridActive = Math.abs(gridKw) > 0.05;
  const isGridExporting = gridKw >= 0;

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#d9ebff] via-[#e8f3ff] to-[#f4f8fe] border border-blue-100/90 shadow-[0_4px_24px_rgba(37,99,235,0.04)] overflow-hidden transition-all select-none p-3 sm:p-5">
      {/* Soft atmospheric sunbeam glow from top-left */}
      <div
        className="absolute top-0 left-0 w-96 h-96 pointer-events-none rounded-tl-3xl opacity-80"
        style={{
          background:
            "radial-gradient(ellipse at 12% 8%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.4) 35%, rgba(255,255,255,0) 70%)",
        }}
      />

      {/* Top Right Card Controls */}
      <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2 z-30">
        <button
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/70 hover:bg-white text-slate-600 hover:text-slate-900 shadow-2xs border border-white/80 backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer"
          title="History playback"
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
        </button>
        <button
          onClick={() => setView3D(!view3D)}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-2xs border backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer ${
            view3D
              ? "bg-white text-slate-800 border-white"
              : "bg-white/60 text-slate-400 border-white/60 hover:bg-white"
          }`}
          title="Toggle 3D View"
        >
          <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Main Layout: Left 3D Villa House with SVG Overlay & Right Metrics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* ======================================================== */}
        {/* 3D VILLA HOUSE & SVG ANIMATIONS (approx 8-9 cols)        */}
        {/* ======================================================== */}
        <div className="lg:col-span-8 xl:col-span-9 relative w-full flex items-center justify-center min-h-[300px] sm:min-h-[380px] md:min-h-[420px]">
          {/* Base Container maintaining aspect ratio 645 x 445 */}
          <div className="relative w-full max-w-[645px] aspect-[645/445]">
            {/* Spotless Clean 3D Modern Villa Image */}
            <img
              src="/solis_villa_clean.png"
              alt="Solis 3D Villa"
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.06)]"
            />

            {/* SVG OVERLAY: Energy Flow Lines, Animated Pulses & Dotted Guidelines */}
            <svg
              viewBox="0 0 645 445"
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Amber Glow Filter for active energy dots */}
                <filter id="solisAmberGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ---------------------------------------------------- */}
              {/* 1. DOTTED CALLOUT GUIDELINES (Grey dotted lines)      */}
              {/* ---------------------------------------------------- */}
              {/* PV Guideline: from PV callout down, across & drops onto roof panel */}
              <path
                d="M 80 85 L 80 135 L 227 135 L 227 165"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2.5 2.5"
                opacity="0.85"
              />

              {/* Load Guideline: from Load callout down, across & drops onto living room flat roof */}
              <path
                d="M 245 85 L 245 135 L 360 135 L 360 185"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2.5 2.5"
                opacity="0.85"
              />

              {/* Battery Guideline: from battery unit down to Battery callout */}
              <path
                d="M 180 370 L 180 405"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2.5 2.5"
                opacity="0.85"
              />

              {/* Grid Guideline: from grid terrace wire down to Grid callout */}
              <path
                d="M 400 375 L 400 405"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="2.5 2.5"
                opacity="0.85"
              />

              {/* ---------------------------------------------------- */}
              {/* 2. BASE PHYSICAL CONDUIT WIRES (Underlying paths)    */}
              {/* ---------------------------------------------------- */}
              {/* PV Roof Panels -> Inverter Top */}
              <path
                id="wire-pv"
                d="M 305 240 L 305 300"
                stroke="#fed7aa"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* Inverter -> Meter Box */}
              <path
                id="wire-meter"
                d="M 314 360 C 318 395, 335 395, 355 395"
                stroke="#fed7aa"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* Meter Box -> Living Room Window (Load) */}
              <path
                id="wire-load"
                d="M 365 375 L 365 290"
                stroke="#fed7aa"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* Inverter -> Battery Pack */}
              <path
                id="wire-battery"
                d="M 298 360 C 298 395, 280 395, 250 395"
                stroke="#fed7aa"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* Meter Box -> Grid */}
              <path
                id="wire-grid"
                d="M 365 410 C 375 425, 385 432, 405 440"
                stroke="#fed7aa"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.65"
              />

              {/* ---------------------------------------------------- */}
              {/* 3. ACTIVE GLOWING DASHED OVERLAYS                    */}
              {/* ---------------------------------------------------- */}
              {isPvActive && (
                <path
                  d="M 305 240 L 305 300"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className="flow-dash-forward"
                  filter="url(#solisAmberGlow)"
                />
              )}

              {isLoadActive && (
                <>
                  <path
                    d="M 314 360 C 318 395, 335 395, 355 395"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="flow-dash-forward"
                    filter="url(#solisAmberGlow)"
                  />
                  <path
                    d="M 365 375 L 365 290"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeDasharray="6 4"
                    className="flow-dash-forward"
                    filter="url(#solisAmberGlow)"
                  />
                </>
              )}

              {isBatteryActive && (
                <path
                  d="M 298 360 C 298 395, 280 395, 250 395"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className={isBatteryCharging ? "flow-dash-forward" : "flow-dash-backward"}
                  filter="url(#solisAmberGlow)"
                />
              )}

              {isGridActive && (
                <path
                  d="M 365 410 C 375 425, 385 432, 405 440"
                  stroke="#f97316"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  className={isGridExporting ? "flow-dash-forward" : "flow-dash-backward"}
                  filter="url(#solisAmberGlow)"
                />
              )}

              {/* ---------------------------------------------------- */}
              {/* 4. ANIMATED GLOWING PULSE PARTICLES (Moving Dots)   */}
              {/* ---------------------------------------------------- */}
              {/* PV -> Inverter Moving Energy Dots */}
              {isPvActive && (
                <>
                  {[0, 0.6, 1.2].map((delay, idx) => (
                    <circle key={`pv-dot-${idx}`} r="3.5" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.6s"
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                      >
                        <mpath href="#wire-pv" />
                      </animateMotion>
                    </circle>
                  ))}
                </>
              )}

              {/* Load Moving Energy Dots (Meter to living room window) */}
              {isLoadActive && (
                <>
                  {[0, 0.6, 1.2].map((delay, idx) => (
                    <circle key={`load-dot-${idx}`} r="3.5" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.8s"
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                        keyPoints="0;1"
                        keyTimes="0;1"
                      >
                        <mpath href="#wire-load" />
                      </animateMotion>
                    </circle>
                  ))}
                </>
              )}

              {/* Battery Moving Energy Dots (Bi-directional) */}
              {isBatteryActive && (
                <>
                  {[0, 0.7].map((delay, idx) => (
                    <circle key={`bat-dot-${idx}`} r="3.5" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                        keyPoints={isBatteryCharging ? "0;1" : "1;0"}
                        keyTimes="0;1"
                      >
                        <mpath href="#wire-battery" />
                      </animateMotion>
                    </circle>
                  ))}
                </>
              )}

              {/* Grid Moving Energy Dots (Bi-directional) */}
              {isGridActive && (
                <>
                  {[0, 0.7].map((delay, idx) => (
                    <circle key={`grid-dot-${idx}`} r="3.5" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                        keyPoints={isGridExporting ? "0;1" : "1;0"}
                        keyTimes="0;1"
                      >
                        <mpath href="#wire-grid" />
                      </animateMotion>
                    </circle>
                  ))}
                </>
              )}

              {/* Solis Inverter Pulsing Center LED Ring Indicator */}
              <circle cx="305" cy="320" r="5" fill="none" stroke="#f97316" strokeWidth="1.8" opacity="0.9">
                <animate attributeName="r" values="4;7;4" dur="2.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="305" cy="320" r="2.5" fill="#f97316" />
            </svg>

            {/* ---------------------------------------------------- */}
            {/* 5. LIVE CALLOUT BADGES (Positioned exactly as in UI)  */}
            {/* ---------------------------------------------------- */}
            {/* Callout 1: PV (Top Left) */}
            <div
              className="absolute z-20 flex flex-col pointer-events-none"
              style={{ left: "12%", top: "7%" }}
            >
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-tight">
                | PV
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {solarKw.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 ml-1">kW</span>
              </div>
            </div>

            {/* Callout 2: Load (Top Middle) */}
            <div
              className="absolute z-20 flex flex-col pointer-events-none"
              style={{ left: "38%", top: "7%" }}
            >
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-tight">
                | Load
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {loadKw.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 ml-1">kW</span>
              </div>
            </div>

            {/* Callout 3: Battery (Bottom Left) */}
            <div
              className="absolute z-20 flex flex-col items-start pointer-events-none"
              style={{ left: "28%", top: "88%" }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-tight">
                  | Battery
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 font-mono">
                  {batterySoc}%
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {Math.abs(batteryKw).toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 ml-1">kW</span>
              </div>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  isBatteryCharging
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                    : isBatteryActive
                    ? "border-orange-400 bg-orange-50 text-[#f37021]"
                    : "border-slate-300 bg-slate-100 text-slate-500"
                }`}
              >
                {batteryState || (isBatteryCharging ? "Charging" : "Idle")}
              </span>
            </div>

            {/* Callout 4: Grid (Bottom Right) */}
            <div
              className="absolute z-20 flex flex-col items-start pointer-events-none"
              style={{ left: "62%", top: "88%" }}
            >
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 tracking-tight">
                | Grid
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {Math.abs(gridKw).toFixed(0)}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 ml-1">kW</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* FLOATING WHITE ENERGY METRICS CARD (Right side)          */}
        {/* ======================================================== */}
        <div className="lg:col-span-4 xl:col-span-3 flex justify-center lg:justify-end">
          <div className="w-full max-w-[260px] bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 sm:p-6 flex flex-col justify-between space-y-5">
            {/* 1. Daily Yield */}
            <div>
              <div className="flex items-baseline">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {dailyYieldKwh.toFixed(1)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 ml-1">kWh</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Daily Yield</p>
            </div>

            {/* 2. Daily Charge */}
            <div>
              <div className="flex items-baseline">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {dailyChargeKwh.toFixed(1)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 ml-1">kWh</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Daily Charge</p>
            </div>

            {/* 3. Daily Discharge */}
            <div>
              <div className="flex items-baseline">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                  {dailyDischargeKwh.toFixed(0)}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700 ml-1">kWh</span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">Daily Discharge</p>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for smooth SVG dashed line flow animations */}
      <style jsx>{`
        @keyframes flowForward {
          from {
            stroke-dashoffset: 20;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes flowBackward {
          from {
            stroke-dashoffset: 0;
          }
          to {
            stroke-dashoffset: 20;
          }
        }
        .flow-dash-forward {
          animation: flowForward 1.2s linear infinite;
        }
        .flow-dash-backward {
          animation: flowBackward 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
