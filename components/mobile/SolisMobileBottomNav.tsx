"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  Wrench,
  BarChart3,
  Heart,
  ChevronUp,
  Check,
} from "lucide-react";

interface SolisMobileBottomNavProps {
  activeView: string;
  onNavigateTab: (tab: string) => void;
}

export default function SolisMobileBottomNav({
  activeView,
  onNavigateTab,
}: SolisMobileBottomNavProps) {
  const [openSubmenu, setOpenSubmenu] = useState<"Overview" | "OM" | "Report" | null>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent | TouchEvent) {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setOpenSubmenu(null);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const isOverviewActive =
    activeView === "plant_overview" ||
    activeView === "device_overview" ||
    activeView === "plant_detail";
  const isOMActive = activeView === "om_alarms" || activeView === "om_alerts";
  const isReportActive =
    activeView === "report_plant" ||
    activeView === "report_inverter" ||
    activeView === "report_battery";
  const isFavoritesActive = activeView === "favorites";

  return (
    <div
      ref={navContainerRef}
      className="fixed bottom-3 left-3 right-3 z-50 flex flex-col items-center pointer-events-none md:hidden"
    >
      {/* 1. Overview Submenu Popup */}
      {openSubmenu === "Overview" && (
        <div className="pointer-events-auto mb-2 w-full max-w-xs bg-white/98 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
            Overview
          </div>
          <button
            onClick={() => {
              onNavigateTab("plant_overview");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              activeView === "plant_overview"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Plant Overview</span>
            {activeView === "plant_overview" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button
            onClick={() => {
              onNavigateTab("device_overview");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all mt-1 ${
              activeView === "device_overview"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Device Overview</span>
            {activeView === "device_overview" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>
      )}

      {/* 2. O&M Submenu Popup */}
      {openSubmenu === "OM" && (
        <div className="pointer-events-auto mb-2 w-full max-w-xs bg-white/98 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
            O&M Operations
          </div>
          <button
            onClick={() => {
              onNavigateTab("om_alarms");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              activeView === "om_alarms"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>Alarm Information</span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            {activeView === "om_alarms" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button
            onClick={() => {
              onNavigateTab("om_alerts");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all mt-1 ${
              activeView === "om_alerts"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Alert Information</span>
            {activeView === "om_alerts" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>
      )}

      {/* 3. Report Submenu Popup */}
      {openSubmenu === "Report" && (
        <div className="pointer-events-auto mb-2 w-full max-w-xs bg-white/98 backdrop-blur-md rounded-2xl border border-gray-200 shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
            Analytical Reports
          </div>
          <button
            onClick={() => {
              onNavigateTab("report_plant");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
              activeView === "report_plant"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Plant Report</span>
            {activeView === "report_plant" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button
            onClick={() => {
              onNavigateTab("report_inverter");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all mt-1 ${
              activeView === "report_inverter"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Inverter Report</span>
            {activeView === "report_inverter" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
          <button
            onClick={() => {
              onNavigateTab("report_battery");
              setOpenSubmenu(null);
            }}
            className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all mt-1 ${
              activeView === "report_battery"
                ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span>Battery Report</span>
            {activeView === "report_battery" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>
        </div>
      )}

      {/* Main Floating Bottom Pill - EXACT LAPTOP NAMES: Overview, O&M, Report */}
      <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-full px-2.5 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between w-full max-w-[360px] pointer-events-auto">
        {/* 1. Overview */}
        <button
          onClick={() => {
            setOpenSubmenu(openSubmenu === "Overview" ? null : "Overview");
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 ${
            isOverviewActive
              ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/25 active:scale-95"
              : "text-slate-600 hover:text-slate-900 active:scale-95"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
          <span>Overview</span>
          <ChevronUp className={`w-3 h-3 shrink-0 transition-transform ${openSubmenu === "Overview" ? "rotate-180" : ""}`} />
        </button>

        {/* 2. O&M */}
        <button
          onClick={() => {
            setOpenSubmenu(openSubmenu === "OM" ? null : "OM");
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs transition-all relative shrink-0 ${
            isOMActive
              ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/25 active:scale-95"
              : "text-slate-600 hover:text-slate-900 active:scale-95"
          }`}
        >
          <div className="relative shrink-0">
            <Wrench className="w-3.5 h-3.5" />
            <span className={`absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full ${isOMActive ? "bg-white" : "bg-red-500"}`} />
          </div>
          <span>O&M</span>
          <ChevronUp className={`w-3 h-3 shrink-0 transition-transform ${openSubmenu === "OM" ? "rotate-180" : ""}`} />
        </button>

        {/* 3. Report */}
        <button
          onClick={() => {
            setOpenSubmenu(openSubmenu === "Report" ? null : "Report");
          }}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 ${
            isReportActive
              ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/25 active:scale-95"
              : "text-slate-600 hover:text-slate-900 active:scale-95"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0" />
          <span>Report</span>
          <ChevronUp className={`w-3 h-3 shrink-0 transition-transform ${openSubmenu === "Report" ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
