"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  Wrench,
  BarChart3,
  Heart,
  Menu,
  ArrowRight,
  Sun,
  X,
} from "lucide-react";

interface SolisSidebarProps {
  activeView: "plant_overview" | "device_overview";
  onSelectView: (view: "plant_overview" | "device_overview") => void;
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
  // Flyout menu state for Overview
  const [isOverviewFlyoutOpen, setIsOverviewFlyoutOpen] = useState(false);
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close flyout on outside click
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOverviewFlyoutOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMouseEnterOverview = () => {
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current);
    setIsOverviewFlyoutOpen(true);
  };

  const handleMouseLeaveOverview = () => {
    flyoutTimeoutRef.current = setTimeout(() => {
      setIsOverviewFlyoutOpen(false);
    }, 250);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR: Slim Icon-Only Bar matching Solis Reference (approx 60px)*/}
      {/* ========================================================================= */}
      <aside
        ref={sidebarRef}
        className="hidden md:flex flex-col justify-between items-center w-[60px] bg-white border-r border-gray-200/80 py-3.5 z-30 select-none relative"
      >
        {/* Top: Logo & Nav Items */}
        <div className="flex flex-col items-center w-full space-y-4">
          {/* Solis / Power2Go Radiant Sun Flower Logo */}
          <div className="w-10 h-10 flex items-center justify-center cursor-pointer mb-2 transition-transform hover:scale-105">
            <svg
              viewBox="0 0 100 100"
              className="w-8 h-8 drop-shadow-xs"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer decorative sunburst petals in orange & gold */}
              <circle cx="50" cy="50" r="16" stroke="#f37021" strokeWidth="2.5" />
              {Array.from({ length: 16 }).map((_, i) => {
                const angle = (i * 360) / 16;
                return (
                  <path
                    key={i}
                    d="M50 24 L53 14 L50 11 L47 14 Z"
                    fill={i % 2 === 0 ? "#f37021" : "#f59e0b"}
                    transform={`rotate(${angle} 50 50)`}
                  />
                );
              })}
              <circle cx="50" cy="50" r="8" fill="#f59e0b" opacity="0.25" />
            </svg>
          </div>

          {/* Navigation Item 1: Overview (With Solis exact orange active card & flyout) */}
          <div
            className="relative w-full flex justify-center"
            onMouseEnter={handleMouseEnterOverview}
            onMouseLeave={handleMouseLeaveOverview}
          >
            <button
              onClick={() => setIsOverviewFlyoutOpen(!isOverviewFlyoutOpen)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                activeView === "plant_overview" || activeView === "device_overview"
                  ? "bg-gradient-to-b from-orange-50/90 to-amber-50/40 border border-orange-300 shadow-[0_2px_8px_rgba(249,115,22,0.18)] text-[#f37021]"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-50 border border-transparent"
              }`}
              title="Overview"
            >
              <LayoutGrid className="w-5 h-5 text-[#f37021]" />
            </button>

            {/* Floating Popover / Flyout Menu matching media_1795078713051_7676d6f6.png */}
            {isOverviewFlyoutOpen && (
              <div
                className="absolute left-[54px] top-0 w-44 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150"
                onMouseEnter={handleMouseEnterOverview}
                onMouseLeave={handleMouseLeaveOverview}
              >
                {/* Popover Title */}
                <div className="text-[11px] font-medium text-slate-400 px-2.5 pt-1 pb-1.5">
                  Overview
                </div>

                {/* Sub-item: Plant Overview */}
                <button
                  onClick={() => {
                    onSelectView("plant_overview");
                    setIsOverviewFlyoutOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium mb-1 ${
                    activeView === "plant_overview"
                      ? "border border-orange-400 bg-orange-50/70 text-[#f37021] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  Plant Overview
                </button>

                {/* Sub-item: Device Overview */}
                <button
                  onClick={() => {
                    onSelectView("device_overview");
                    setIsOverviewFlyoutOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all font-medium ${
                    activeView === "device_overview"
                      ? "border border-orange-400 bg-orange-50/70 text-[#f37021] shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  Device Overview
                </button>
              </div>
            )}
          </div>

          {/* Navigation Item 2: O&M */}
          <div className="w-full flex justify-center">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="O&M"
            >
              <Wrench className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Item 3: Report */}
          <div className="w-full flex justify-center">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="Report"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Item 4: Service */}
          <div className="w-full flex justify-center">
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              title="Service"
            >
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Toggle Control: SolisCloud Icon (3 horizontal bars + arrow) */}
        <div className="w-full flex justify-center pt-4">
          <button
            onClick={onToggleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            title="Sidebar Menu"
          >
            <div className="flex items-center">
              <div className="flex flex-col gap-1 w-3.5">
                <span className="h-0.5 w-full bg-slate-600 rounded-full" />
                <span className="h-0.5 w-2 bg-slate-600 rounded-full" />
                <span className="h-0.5 w-full bg-slate-600 rounded-full" />
              </div>
              <ArrowRight className="w-2.5 h-2.5 text-slate-600 -ml-0.5" />
            </div>
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
          <div className="relative w-64 max-w-[80vw] h-full bg-white shadow-2xl z-10 flex flex-col justify-between p-4">
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
              <div className="pt-4 space-y-1">
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
                      ? "bg-orange-50 text-[#f37021] border border-orange-200 font-semibold"
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
                      ? "bg-orange-50 text-[#f37021] border border-orange-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Device Overview
                </button>

                <div className="pt-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Modules
                </div>
                <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-400" />
                  <span>O&M (Standard)</span>
                </div>
                <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <span>Report (Standard)</span>
                </div>
                <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-slate-400" />
                  <span>Service (Standard)</span>
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
