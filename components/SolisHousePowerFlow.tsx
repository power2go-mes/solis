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
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#879bbd] via-[#a8bdd6] to-[#ccd9e7] border border-blue-200/80 shadow-[0_8px_32px_rgba(20,40,80,0.12)] overflow-hidden transition-all select-none p-3 sm:p-5">
      {/* Soft atmospheric sunbeam glow from top-left */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] pointer-events-none rounded-tl-3xl opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at 15% 10%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0) 70%)",
        }}
      />

      {/* Top Right Card Controls */}
      <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 flex items-center gap-2 z-30">
        <button
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-sm border border-white/90 backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer"
          title="History playback"
        >
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
        </button>
        <button
          onClick={() => setView3D(!view3D)}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-sm border backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer ${
            view3D
              ? "bg-white text-slate-800 border-white"
              : "bg-white/60 text-slate-500 border-white/60 hover:bg-white"
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
          {/* Base Container maintaining aspect ratio 1024 x 576 */}
          <div className="relative w-full max-w-[820px] aspect-[1024/576] rounded-xl overflow-hidden shadow-[0_12px_36px_rgba(0,0,0,0.18)]">
            {/* High-Resolution 3D Modern Villa Image */}
            <img
              src="/solis_villa_hd.jpg"
              alt="Solis 3D Villa High Res"
              className="w-full h-full object-cover pointer-events-none select-none"
            />

            {/* SVG OVERLAY: Energy Flow Lines, Animated Pulses & Dotted Guidelines */}
            <svg
              viewBox="0 0 1024 576"
              className="absolute inset-0 w-full h-full pointer-events-none select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Amber Glow Filter for active energy dots and pulses */}
                <filter id="solisAmberGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* ---------------------------------------------------- */}
              {/* 1. DOTTED CALLOUT GUIDELINES (Grey dotted lines)      */}
              {/* ---------------------------------------------------- */}
              {/* PV Guideline: from PV callout down, across & drops onto roof panels */}
              <path
                d="M 140 105 L 140 155 L 470 155 L 470 205"
                stroke="#cbd5e1"
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.9"
              />

              {/* Load Guideline: from Load callout down, across & drops to living room window */}
              <path
                d="M 260 105 L 260 155 L 580 155 L 580 295"
                stroke="#cbd5e1"
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.9"
              />

              {/* Battery Guideline: from battery unit down to Battery callout */}
              <path
                d="M 480 445 L 480 475 L 340 475 L 340 500"
                stroke="#cbd5e1"
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.9"
              />

              {/* Grid Guideline: from grid tower power line down to Grid callout */}
              <path
                d="M 320 445 L 320 485 L 370 485 L 370 500"
                stroke="#cbd5e1"
                strokeWidth="1.4"
                strokeDasharray="3 3"
                opacity="0.9"
              />

              {/* ---------------------------------------------------- */}
              {/* 2. BASE PHYSICAL CONDUIT WIRES (Underlying paths)    */}
              {/* ---------------------------------------------------- */}
              {/* PV Roof Panels -> Inverter Top (x=516, y: 260 -> 316) */}
              <path
                id="wire-pv"
                d="M 516 260 L 516 316"
                stroke="#ffedd5"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />

              {/* Inverter Right -> Load Window (x: 526 -> 578, y=318) */}
              <path
                id="wire-load"
                d="M 526 318 L 578 318"
                stroke="#ffedd5"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />

              {/* Inverter Bottom -> Battery Pack (x: 516 -> 516 y: 358 -> 392, then L 492 392) */}
              <path
                id="wire-battery"
                d="M 516 358 L 516 392 L 492 392"
                stroke="#ffedd5"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.75"
              />

              {/* Power Grid Tower -> House Inverter (x: 272 y: 380 -> x: 375 y: 440 -> x: 470 y: 435 -> x: 508 y: 345) */}
              <path
                id="wire-grid"
                d="M 272 380 C 310 405, 350 430, 420 435 C 460 438, 485 410, 508 345"
                stroke="#ffedd5"
                strokeWidth="2.5"
                strokeDasharray="3 3"
                opacity="0.7"
              />

              {/* ---------------------------------------------------- */}
              {/* 3. ACTIVE GLOWING DASHED OVERLAYS                    */}
              {/* ---------------------------------------------------- */}
              {isPvActive && (
                <path
                  d="M 516 260 L 516 316"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className="flow-dash-forward"
                  filter="url(#solisAmberGlow)"
                />
              )}

              {isLoadActive && (
                <path
                  d="M 526 318 L 578 318"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className="flow-dash-forward"
                  filter="url(#solisAmberGlow)"
                />
              )}

              {isBatteryActive && (
                <path
                  d="M 516 358 L 516 392 L 492 392"
                  stroke="#f97316"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className={isBatteryCharging ? "flow-dash-forward" : "flow-dash-backward"}
                  filter="url(#solisAmberGlow)"
                />
              )}

              {isGridActive && (
                <path
                  d="M 272 380 C 310 405, 350 430, 420 435 C 460 438, 485 410, 508 345"
                  stroke="#f97316"
                  strokeWidth="3"
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
                  {[0, 0.5, 1.0].map((delay, idx) => (
                    <circle key={`pv-dot-${idx}`} r="4" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.4s"
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

              {/* Inverter -> Load Moving Energy Dots */}
              {isLoadActive && (
                <>
                  {[0, 0.5, 1.0].map((delay, idx) => (
                    <circle key={`load-dot-${idx}`} r="4" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="1.4s"
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
                  {[0, 0.6, 1.2].map((delay, idx) => (
                    <circle key={`bat-dot-${idx}`} r="4" fill="#f59e0b" filter="url(#solisAmberGlow)">
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
                  {[0, 0.7, 1.4].map((delay, idx) => (
                    <circle key={`grid-dot-${idx}`} r="4" fill="#f59e0b" filter="url(#solisAmberGlow)">
                      <animateMotion
                        dur="2.0s"
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
              <circle cx="516" cy="336" r="6" fill="none" stroke="#f97316" strokeWidth="2" opacity="0.95">
                <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.95;0.3;0.95" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="516" cy="336" r="3" fill="#f97316" filter="url(#solisAmberGlow)" />

              {/* Living Room Window Ambient Warm Lighting Animation */}
              <rect x="560" y="295" width="40" height="45" rx="4" fill="#fef08a" opacity="0.22">
                <animate attributeName="opacity" values="0.22;0.42;0.22" dur="3.5s" repeatCount="indefinite" />
              </rect>
            </svg>

            {/* ---------------------------------------------------- */}
            {/* 5. LIVE CALLOUT BADGES (Positioned exactly as in UI)  */}
            {/* ---------------------------------------------------- */}
            {/* Callout 1: PV (Top Left) */}
            <div
              className="absolute z-20 flex flex-col pointer-events-none"
              style={{ left: "10%", top: "10%" }}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-tight">
                | PV
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono drop-shadow-xs">
                  {solarKw.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 ml-1">kW</span>
              </div>
            </div>

            {/* Callout 2: Load (Top Middle-Left) */}
            <div
              className="absolute z-20 flex flex-col pointer-events-none"
              style={{ left: "24%", top: "10%" }}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-tight">
                | Load
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono drop-shadow-xs">
                  {loadKw.toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 ml-1">kW</span>
              </div>
            </div>

            {/* Callout 3: Battery (Bottom Left-Center) */}
            <div
              className="absolute z-20 flex flex-col items-start pointer-events-none"
              style={{ left: "22%", top: "76%" }}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-tight">
                | Battery <strong className="text-emerald-600 font-bold ml-0.5">{batterySoc}%</strong>
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono drop-shadow-xs">
                  {Math.abs(batteryKw).toFixed(1)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 ml-1">kW</span>
              </div>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border shadow-2xs ${
                  isBatteryCharging
                    ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                    : isBatteryActive
                    ? "border-amber-400 bg-amber-50 text-amber-600"
                    : "border-slate-300 bg-white/90 text-slate-600"
                }`}
              >
                {batteryState || (isBatteryCharging ? "Charging" : "Idle")}
              </span>
            </div>

            {/* Callout 4: Grid (Bottom Right-Center) */}
            <div
              className="absolute z-20 flex flex-col items-start pointer-events-none"
              style={{ left: "38%", top: "76%" }}
            >
              <span className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-tight">
                | Grid
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-mono drop-shadow-xs">
                  {Math.abs(gridKw).toFixed(0)}
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 ml-1">kW</span>
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
