"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  LayoutGrid,
  Wrench,
  BarChart3,
  Heart,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sun,
  X,
  Bell,
  AlertTriangle,
  FileText,
  Cpu,
  BatteryCharging,
  Layers,
} from "lucide-react";

export type SidebarViewType =
  | "plant_overview"
  | "device_overview"
  | "om_alarms"
  | "om_alerts"
  | "report_plant"
  | "report_inverter"
  | "report_battery";

interface SolisSidebarProps {
  activeView: string;
  onSelectView: (view: SidebarViewType) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SolisSidebar({
  activeView,
  onSelectView,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: SolisSidebarProps) {
  // Flyout menu states for slim/collapsed mode
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
    }, 250);
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
      {/* DESKTOP SIDEBAR: Supports Collapsed (60px) and Expanded (210px)           */}
      {/* Exactly replicates SolisCloud reference UI (media_1795173161971_1c931bd5) */}
      {/* ========================================================================= */}
      <aside
        ref={sidebarRef}
        className={`hidden md:flex flex-col justify-between bg-white border-r border-gray-200/80 py-3.5 z-30 select-none relative transition-all duration-300 ${isCollapsed ? "w-[60px] items-center" : "w-[210px] px-3"
          }`}
      >
        {/* Top Header Logo in Expanded Mode */}
        {!isCollapsed && (
          <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-gray-100">
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image
                src="/images/power2go_logo.png"
                alt="Power2Go"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 leading-tight truncate">
                Power<span className="text-[#f37021]">2</span>Go
              </span>
              <span className="text-[10px] text-slate-400 font-medium">SolisCloud</span>
            </div>
          </div>
        )}

        {/* Navigation Items List */}
        <div className={`flex flex-col w-full space-y-3 ${isCollapsed ? "items-center pt-1" : "space-y-1"}`}>
          {/* =================================================================== */}
          {/* 1. OVERVIEW MENU                                                    */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div
              className="relative w-full flex justify-center"
              onMouseEnter={() => handleMouseEnter("overview")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setActiveFlyout(activeFlyout === "overview" ? null : "overview")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isOverviewActive
                    ? "bg-gradient-to-b from-orange-50 to-orange-100/40 border border-orange-300 text-[#f37021] shadow-2xs"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                title="Overview"
              >
                <LayoutGrid className="w-5 h-5 text-[#f37021]" />
              </button>

              {/* Flyout Popover */}
              {activeFlyout === "overview" && (
                <div
                  className="absolute left-[54px] top-0 w-44 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => handleMouseEnter("overview")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[11px] font-semibold text-slate-400 px-2.5 pt-1 pb-1.5">
                    Overview
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("plant_overview");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium mb-1 ${activeView === "plant_overview"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    Plant Overview
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("device_overview");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "device_overview"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${isOverviewActive
                    ? "text-slate-900 font-bold bg-gray-50/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-[#f37021]" />
                  <span>Overview</span>
                </div>
                {isOverviewExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isOverviewExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={() => onSelectView("plant_overview")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "plant_overview"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    Plant Overview
                  </button>
                  <button
                    onClick={() => onSelectView("device_overview")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "device_overview"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
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
          {/* 2. O&M MENU (With Red Notification Dot)                             */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div
              className="relative w-full flex justify-center"
              onMouseEnter={() => handleMouseEnter("om")}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setActiveFlyout(activeFlyout === "om" ? null : "om")}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${isOMActive
                    ? "bg-gradient-to-b from-orange-50 to-orange-100/40 border border-orange-300 text-[#f37021] shadow-2xs"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                title="O&M"
              >
                <Wrench className="w-4 h-4" />
                {/* Solis Red Notification Dot */}
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              </button>

              {/* Flyout Popover */}
              {activeFlyout === "om" && (
                <div
                  className="absolute left-[54px] top-0 w-44 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => handleMouseEnter("om")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[11px] font-semibold text-slate-400 px-2.5 pt-1 pb-1.5 flex items-center justify-between">
                    <span>O&M</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                  {/* Alarm */}
                  <button
                    onClick={() => {
                      onSelectView("om_alarms");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium mb-1 flex items-center justify-between ${activeView === "om_alarms"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    <span>Alarm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </button>
                  {/* Alert */}
                  <button
                    onClick={() => {
                      onSelectView("om_alerts");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "om_alerts"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${isOMActive
                    ? "text-slate-900 font-bold bg-gray-50/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-600" />
                  <span className="flex items-center gap-1">
                    <span>O&M</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </span>
                </div>
                {isOMExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isOMExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  {/* Alarm (Active orange pill matching media_1795173161971_1c931bd5.jpg) */}
                  <button
                    onClick={() => onSelectView("om_alarms")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium flex items-center justify-between ${activeView === "om_alarms"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    <span>Alarm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </button>

                  {/* Alert */}
                  <button
                    onClick={() => onSelectView("om_alerts")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "om_alerts"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    Alert
                  </button>

                  <div className="text-[11px] text-slate-400 px-2.5 py-1 truncate">
                    Warning Message...
                  </div>
                  <div className="text-[11px] text-slate-400 px-2.5 py-1 truncate">
                    Dispersion Rate A...
                  </div>
                  <div className="text-[11px] text-slate-400 px-2.5 py-1 truncate">
                    Fleet Analysis
                  </div>
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
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isReportActive
                    ? "bg-gradient-to-b from-orange-50 to-orange-100/40 border border-orange-300 text-[#f37021] shadow-2xs"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
                  }`}
                title="Report"
              >
                <BarChart3 className="w-4 h-4" />
              </button>

              {/* Flyout Popover */}
              {activeFlyout === "report" && (
                <div
                  className="absolute left-[54px] top-0 w-48 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                  onMouseEnter={() => handleMouseEnter("report")}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="text-[11px] font-semibold text-slate-400 px-2.5 pt-1 pb-1.5">
                    Reports
                  </div>
                  {/* Plant Report */}
                  <button
                    onClick={() => {
                      onSelectView("report_plant");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium mb-1 ${activeView === "report_plant"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    Plant Report
                  </button>
                  {/* Inverter Report */}
                  <button
                    onClick={() => {
                      onSelectView("report_inverter");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium mb-1 ${activeView === "report_inverter"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                  >
                    Inverter Report
                  </button>
                  {/* Battery Report */}
                  <button
                    onClick={() => {
                      onSelectView("report_battery");
                      setActiveFlyout(null);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "report_battery"
                        ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
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
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ${isReportActive
                    ? "text-slate-900 font-bold bg-gray-50/80"
                    : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                  }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-600" />
                  <span>Report</span>
                </div>
                {isReportExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {isReportExpanded && (
                <div className="pl-6 pr-1 space-y-1 py-0.5 animate-in fade-in duration-150">
                  <button
                    onClick={() => onSelectView("report_plant")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "report_plant"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    Plant Report
                  </button>
                  <button
                    onClick={() => onSelectView("report_inverter")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "report_inverter"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    Inverter Report
                  </button>
                  <button
                    onClick={() => onSelectView("report_battery")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all font-medium ${activeView === "report_battery"
                        ? "border border-orange-200 bg-orange-50 text-[#f37021] font-bold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-gray-50"
                      }`}
                  >
                    Battery Report
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. SERVICE MENU                                                     */}
          {/* =================================================================== */}
          {isCollapsed ? (
            <div className="w-full flex justify-center">
              <button
                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                title="Service"
                onClick={() => alert("Solis Customer Support Hotline: +92 21 111-POWER2GO")}
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => alert("Solis Customer Support Hotline: +92 21 111-POWER2GO")}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-slate-500" />
                <span>Service</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Bottom Toggle Control: SolisCloud Icon (3 horizontal bars + arrow) */}
        <div className={`w-full flex ${isCollapsed ? "justify-center" : "justify-start px-2"} pt-4`}>
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg flex items-center gap-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <div className="flex items-center">
              <div className="flex flex-col gap-1 w-3.5">
                <span className="h-0.5 w-full bg-slate-600 rounded-full" />
                <span className="h-0.5 w-2 bg-slate-600 rounded-full" />
                <span className="h-0.5 w-full bg-slate-600 rounded-full" />
              </div>
              <ArrowRight
                className={`w-2.5 h-2.5 text-slate-600 -ml-0.5 transition-transform ${!isCollapsed ? "rotate-180" : ""
                  }`}
              />
            </div>
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
                  <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
                    <Sun className="w-4 h-4 text-[#f37021]" />
                  </div>
                  <span className="text-sm font-bold text-slate-800">
                    Power<span className="text-[#f37021]">2</span>Go
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "plant_overview"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "device_overview"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Device Overview
                  </button>
                </div>

                {/* 2. O&M */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1 flex items-center gap-1.5">
                    <span>O&M</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                  <button
                    onClick={() => {
                      onSelectView("om_alarms");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${activeView === "om_alarms"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <span>Alarm</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </button>
                  <button
                    onClick={() => {
                      onSelectView("om_alerts");
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "om_alerts"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "report_plant"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "report_inverter"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
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
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeView === "report_battery"
                        ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    Battery Report
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 text-center text-[11px] text-slate-400">
              SolisCloud • Power2Go Edition
            </div>
          </div>
        </div>
      )}
    </>
  );
}
