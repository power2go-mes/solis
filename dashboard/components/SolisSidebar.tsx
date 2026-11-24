"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Wrench,
  BarChart3,
  Heart,
  ChevronDown,
  ChevronRight,
  Sun,
  X,
  Settings,
} from "lucide-react";

export type SidebarViewType =
  | "plant_overview"
  | "device_overview"
  | "om_alarms"
  | "om_alerts"
  | "report_plant"
  | "report_inverter"
  | "report_battery"
  | "settings";

interface SolisSidebarProps {
  activeView: string;
  onSelectView: (view: SidebarViewType) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * SolisCloud 4-Square Overview Icon with Bottom-Left Checkmark
 * Exactly matching SolisCloud reference UI (media_1795175182642_da25cbfa.png)
 */
function SolisOverviewIcon({ className = "w-5 h-5 text-[#10b981]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <path
        d="M5.5 17.2L7 18.7L9.5 15.5"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * SolisCloud Sidebar Expand/Collapse Icon (3 horizontal bars + arrow: ≡→)
 */
function SolisSidebarToggleIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-700 transition-transform duration-200 ${
        !isCollapsed ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="5" x2="11" y2="5" />
      <line x1="3" y1="10" x2="8" y2="10" />
      <line x1="3" y1="15" x2="11" y2="15" />
      <path d="M12 7.5L16.5 10L12 12.5" />
    </svg>
  );
}

export default function SolisSidebar({
  activeView,
  onSelectView,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: SolisSidebarProps) {
  // Flyout menu states for slim/collapsed mode - default to null (only shown on hover or click)
  const [activeFlyout, setActiveFlyout] = useState<"overview" | "om" | "report" | null>(null);
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accordion open states for expanded mode
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(true);
  const [isOMExpanded, setIsOMExpanded] = useState(true);
  const [isReportExpanded, setIsReportExpanded] = useState(true);

  // Close flyouts on outside click
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setActiveFlyout(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnter = (menu: "overview" | "om" | "report") => {
    if (!isCollapsed) return;
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setActiveFlyout(menu);
  };

  const handleMouseLeave = () => {
    if (!isCollapsed) return;
    flyoutTimeoutRef.current = setTimeout(() => {
      setActiveFlyout(null);
    }, 300);
  };

  const isOMActive = activeView === "om_alarms" || activeView === "om_alerts";
  const isReportActive =
    activeView === "report_plant" ||
    activeView === "report_inverter" ||
    activeView === "report_battery";
  const isOverviewActive =
    activeView === "plant_overview" || activeView === "device_overview";

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR: Slim Collapsed (58px) by default with Flyout Popovers     */}
      {/* Exactly replicates SolisCloud reference UI (media_1795175182642_da25cbfa)  */}
      {/* ========================================================================= */}
      <aside
        ref={sidebarRef}
        className={`hidden md:flex flex-col justify-between bg-white/95 backdrop-blur-md border-r border-slate-200/80 py-4 z-40 select-none relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[1px_0_12px_rgba(0,0,0,0.03)] ${
          isCollapsed ? "w-[62px] items-center" : "w-[220px] px-3.5"
        }`}
      >
        {/* Navigation Items List - Aligned at top whether collapsed or expanded */}
        <div className={`flex flex-col w-full ${isCollapsed ? "items-center space-y-4 pt-1" : "space-y-2 pt-1"}`}>
          {/* =================================================================== */}
          {/* 1. OVERVIEW MENU (4-Square Grid Icon with Checkmark)                 */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div
              className="relative w-full flex justify-center"
              onMouseEnter={() => handleMouseEnter("overview")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setActiveFlyout(activeFlyout === "overview" ? null : "overview")}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  isOverviewActive
                    ? "bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] border border-emerald-300 text-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100"
                }`}
                title="Overview"
              >
                <SolisOverviewIcon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isOverviewActive ? "text-emerald-600" : "text-slate-400"}`}
                />
              </button>

              {/* Flyout Popover matching media_1795175182642_da25cbfa.png */}
              {activeFlyout === "overview" && (
                <div
                  className="absolute left-[58px] top-0 w-52 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-slate-100 p-2.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => {
                    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
                    setActiveFlyout("overview");
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[13px] font-medium text-slate-400 px-3 pt-1 pb-2">
                    Overview
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("plant_overview");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                      activeView === "plant_overview"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Plant Overview
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("device_overview");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                      activeView === "device_overview"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Device Overview
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Expanded Accordion: Overview
            <div className="space-y-1">
              <button
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isOverviewActive
                    ? "text-emerald-800 font-bold bg-emerald-50/80 border border-emerald-200/60 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <SolisOverviewIcon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isOverviewActive ? "text-emerald-600" : "text-slate-500"}`} />
                  <span>Overview</span>
                </div>
                {isOverviewExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                )}
              </button>

              {isOverviewExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={() => onSelectView("plant_overview")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "plant_overview"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Plant Overview
                  </button>
                  <button
                    onClick={() => onSelectView("device_overview")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "device_overview"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Device Overview
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 2. O&M MENU (Wrench with Red Notification Dot)                       */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div
              className="relative w-full flex justify-center"
              onMouseEnter={() => handleMouseEnter("om")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setActiveFlyout(activeFlyout === "om" ? null : "om")}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 relative ${
                  isOMActive
                    ? "bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] border border-emerald-300 text-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100"
                }`}
                title="O&M"
              >
                <div className="relative">
                  <Wrench className={`w-5 h-5 transition-transform duration-200 ${isOMActive ? "text-emerald-600" : "text-slate-400"}`} />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                </div>
              </button>

              {/* Flyout Popover */}
              {activeFlyout === "om" && (
                <div
                  className="absolute left-[58px] top-0 w-52 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-slate-100 p-2.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => {
                    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
                    setActiveFlyout("om");
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[13px] font-medium text-slate-400 px-3 pt-1 pb-2 flex items-center justify-between">
                    <span>O&M</span>
                  </div>
                  {/* Alarm */}
                  <button
                    onClick={() => {
                      onSelectView("om_alarms");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all mb-1 flex items-center justify-between ${
                      activeView === "om_alarms"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    <span>Alarm</span>
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  </button>
                  {/* Alert */}
                  <button
                    onClick={() => {
                      onSelectView("om_alerts");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                      activeView === "om_alerts"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Alert
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Expanded Accordion: O&M
            <div className="space-y-1">
              <button
                onClick={() => setIsOMExpanded(!isOMExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isOMActive
                    ? "text-emerald-800 font-bold bg-emerald-50/80 border border-emerald-200/60 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isOMActive ? "text-emerald-600" : "text-slate-500"}`} />
                  <span>O&M</span>
                </div>
                {isOMExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                )}
              </button>

              {isOMExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={() => onSelectView("om_alarms")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium flex items-center justify-between ${
                      activeView === "om_alarms"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    <span>Alarm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                  </button>

                  <button
                    onClick={() => onSelectView("om_alerts")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "om_alerts"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Alert
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 3. REPORT MENU (Plant Report, Inverter Report, Battery Report)      */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div
              className="relative w-full flex justify-center"
              onMouseEnter={() => handleMouseEnter("report")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setActiveFlyout(activeFlyout === "report" ? null : "report")}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  isReportActive
                    ? "bg-gradient-to-b from-[#ecfdf5] to-[#d1fae5] border border-emerald-300 text-emerald-600 shadow-[0_4px_16px_rgba(16,185,129,0.22)]"
                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/60 border border-transparent hover:border-emerald-100"
                }`}
                title="Report"
              >
                <BarChart3 className={`w-5 h-5 transition-transform duration-200 ${isReportActive ? "text-emerald-600" : "text-slate-400"}`} />
              </button>

              {/* Flyout Popover */}
              {activeFlyout === "report" && (
                <div
                  className="absolute left-[58px] top-0 w-52 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-slate-100 p-2.5 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => {
                    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
                    setActiveFlyout("report");
                  }}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[13px] font-medium text-slate-400 px-3 pt-1 pb-2">
                    Report
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("report_plant");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                      activeView === "report_plant"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Plant Report
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("report_inverter");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                      activeView === "report_inverter"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Inverter Report
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("report_battery");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                      activeView === "report_battery"
                        ? "border border-orange-300 bg-gradient-to-b from-white to-orange-50/40 text-[#10b981] font-semibold shadow-[0_2px_8px_rgba(243,112,33,0.12)]"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-normal"
                    }`}
                  >
                    Battery Report
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Expanded Accordion: Report
            <div className="space-y-1">
              <button
                onClick={() => setIsReportExpanded(!isReportExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                  isReportActive
                    ? "text-emerald-800 font-bold bg-emerald-50/80 border border-emerald-200/60 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:translate-x-0.5"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isReportActive ? "text-emerald-600" : "text-slate-500"}`} />
                  <span>Report</span>
                </div>
                {isReportExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200" />
                )}
              </button>

              {isReportExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={() => onSelectView("report_plant")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "report_plant"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Plant Report
                  </button>
                  <button
                    onClick={() => onSelectView("report_inverter")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "report_inverter"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Inverter Report
                  </button>
                  <button
                    onClick={() => onSelectView("report_battery")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${
                      activeView === "report_battery"
                        ? "border border-orange-200 bg-orange-50 text-[#10b981] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                    }`}
                  >
                    Battery Report
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 4. SETTINGS MENU (Direct Link to System Settings & Compulsory Day-One Report) */}
          {isCollapsed ? (
            <div className="relative group">
              <button
                onClick={() => onSelectView("settings")}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  activeView === "settings"
                    ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                }`}
                title="Settings"
              >
                <Settings className={`w-5 h-5 transition-transform duration-200 ${activeView === "settings" ? "text-emerald-600" : "text-slate-400"}`} />
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => onSelectView("settings")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  activeView === "settings"
                    ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <Settings className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-45 ${activeView === "settings" ? "text-emerald-600" : "text-slate-500"}`} />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Toggle Control: SolisCloud 3 horizontal bars + arrow (≡→) */}
        <div className={`w-full flex ${isCollapsed ? "justify-center" : "justify-start px-3"} pt-4 pb-2`}>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-xl flex items-center gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <SolisSidebarToggleIcon isCollapsed={isCollapsed} />
            {!isCollapsed && <span className="text-xs font-semibold text-slate-600">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER: Slides in from left when hamburger is tapped               */}
      {/* ========================================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Drawer content */}
          <div className="relative w-64 max-w-[80vw] h-full bg-white shadow-2xl z-10 flex flex-col justify-between p-4 overflow-y-auto">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Sun className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Power<span className="text-[#10b981]">2</span>Go
                  </span>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Nav links */}
              <div className="pt-4 space-y-3">
                {/* 1. Overview */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    Overview
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("plant_overview");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "plant_overview"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Plant Overview
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("device_overview");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "device_overview"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Device Overview
                  </button>
                </div>

                {/* 2. O&M */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    <span>O&M</span>
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("om_alarms");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                      activeView === "om_alarms"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>Alarm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("om_alerts");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "om_alerts"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Alert
                  </button>
                </div>

                {/* 3. Reports */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    Reports
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("report_plant");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "report_plant"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Plant Report
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("report_inverter");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "report_inverter"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Inverter Report
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("report_battery");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      activeView === "report_battery"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Battery Report
                  </button>
                </div>

                {/* 4. Settings (Mobile) */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                    Administration
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("settings");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 ${
                      activeView === "settings"
                        ? "bg-orange-50 text-[#10b981] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 text-center text-[11px] text-slate-400 font-medium">
              P2G-CLOUD • Intelligent Fleet Monitoring
            </div>
          </div>
        </div>
      )}
    </>
  );
}