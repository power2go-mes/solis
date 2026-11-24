"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCw,
  LayoutGrid,
  Wrench,
  BarChart3,
  Heart,
  ArrowUp,
  Check,
} from "lucide-react";
import { SolisPlantOverviewItem } from "@/lib/types";

const PLANT_IMAGES: Record<string, string> = {
  "1298491919451014032": "/images/solis_plant_room.jpg", // Towfiq chinoy
  "1298491919450851319": "/solis/station_list6-VM077FAH.png", // P2G 20kw
  "1298491919450840394": "/solis/station_list7-B5Urfb3c.png", // P2G 1ST 6kw
  "1298491919450797504": "/solis/station_list1-DwRSyVIC.png", // Menu Karachi Office
  "1298491919450740581": "/solis/station_list5-kp_NUlc_.png", // P2G 50KW
  "1298491919450734544": "/solis/station_list6-VM077FAH.png", // P2G 15KW
  "1298491919450873747": "/solis/STATION_default_normal.png", // 36 Chenab
  "1298491919450958553": "/solis/STATION_default_normal.png", // OPL Residence
};

interface SolisMobilePlantListProps {
  plants: SolisPlantOverviewItem[];
  onSelectPlant: (plantId: string) => void;
  onCreatePlant?: () => void;
  onNavigateTab?: (tab: string) => void;
  activeView?: string;
}

type TabCategory = "All" | "Online" | "Alarm" | "Offline";

// Removed duplicate local bottom nav - now centrally managed by SolisMobileBottomNav in app/page.tsx
export default function SolisMobilePlantList({
  plants,
  onSelectPlant,
  onCreatePlant,
  onNavigateTab,
  activeView = "plant_overview",
}: SolisMobilePlantListProps) {
  // Top category tabs: Plant | Inverter | Battery | Data
  const [activeTopTab, setActiveTopTab] = useState<string>("Plant");

  // Filter summary tab: All | Online | Alarm | Offline
  const [activeFilterTab, setActiveFilterTab] = useState<TabCategory>("All");

  // Search input state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Sort & Filter dropdowns state
  const [sortBy, setSortBy] = useState<
    "Default" | "Capacity" | "Power" | "Yield" | "LowestPV" | "LowestConsumption" | "HighestPV" | "HighestConsumption"
  >("Default");
  const [selectedParam, setSelectedParam] = useState<"All" | "WithBattery" | "GridTied">("All");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isParamDropdownOpen, setIsParamDropdownOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const effectivePlants = plants || [];

  // Summary counts
  const totalCount = effectivePlants.length;
  const onlineCount = useMemo(() => effectivePlants.filter((p) => p.status === "Online").length, [effectivePlants]);
  const alarmCount = useMemo(() => effectivePlants.filter((p) => p.status === "Alarm").length, [effectivePlants]);
  const offlineCount = useMemo(() => effectivePlants.filter((p) => p.status === "Offline").length, [effectivePlants]);

  // Filter plants based on tab, search, and category parameters
  const filteredPlants = useMemo(() => {
    return effectivePlants.filter((p) => {
      // 1. Filter by status
      if (activeFilterTab === "Online" && p.status !== "Online") return false;
      if (activeFilterTab === "Alarm" && p.status !== "Alarm") return false;
      if (activeFilterTab === "Offline" && p.status !== "Offline") return false;

      // 2. Filter by Top Tab (Plant vs Inverter vs Battery vs Data)
      if (activeTopTab === "Inverter") {
        if ((p.inverterTotal || 0) <= 0) return false;
      } else if (activeTopTab === "Battery") {
        const hasBattery = (p.batterySoc !== undefined && p.batterySoc > 0) || (p.dailyChargeKwh || 0) > 0;
        if (!hasBattery) return false;
      }

      // 3. Filter by Parameter Selection
      if (selectedParam === "WithBattery") {
        const hasBattery = (p.batterySoc !== undefined && p.batterySoc > 0) || (p.dailyChargeKwh || 0) > 0;
        if (!hasBattery) return false;
      } else if (selectedParam === "GridTied") {
        const isGridOnly = (p.batterySoc === undefined || p.batterySoc === 0) && (p.dailyChargeKwh || 0) === 0;
        if (!isGridOnly) return false;
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [effectivePlants, activeFilterTab, activeTopTab, selectedParam, searchQuery]);

  const MOBILE_DISPLAY_ORDER = [
    "1298491919450851319", // P2G 20KW
    "1298491919450840394", // P2G 1ST 6kw
    "1298491919450797504", // Menu Karachi Office
    "1298491919450740581", // P2G 50KW
    "1298491919450734544", // P2G 15KW
    "1298491919450873747", // 36 Chenab
    "1298491919450958553", // OPL Residence
  ];

  const sortedPlants = useMemo(() => {
    return [...filteredPlants].sort((a, b) => {
      if (sortBy === "Capacity") {
        return (b.capacityKwp || 0) - (a.capacityKwp || 0);
      }
      if (sortBy === "Power") {
        return (b.powerKw || 0) - (a.powerKw || 0);
      }
      if (sortBy === "Yield" || sortBy === "HighestPV") {
        return (b.dailyYieldKwh || 0) - (a.dailyYieldKwh || 0);
      }
      if (sortBy === "LowestPV") {
        return (a.dailyYieldKwh || 0) - (b.dailyYieldKwh || 0);
      }
      if (sortBy === "LowestConsumption") {
        const consA = (a as any).dailyConsumptionKwh || a.dailyYieldKwh || 0;
        const consB = (b as any).dailyConsumptionKwh || b.dailyYieldKwh || 0;
        return consA - consB;
      }
      if (sortBy === "HighestConsumption") {
        const consA = (a as any).dailyConsumptionKwh || a.dailyYieldKwh || 0;
        const consB = (b as any).dailyConsumptionKwh || b.dailyYieldKwh || 0;
        return consB - consA;
      }
      const idxA = MOBILE_DISPLAY_ORDER.indexOf(a.id);
      const idxB = MOBILE_DISPLAY_ORDER.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [filteredPlants, sortBy]);

  return (
    <div className="min-h-screen bg-[#f7f9fa] pb-24 text-slate-800 flex flex-col antialiased relative">
      {/* Power2Go Mobile Brand Header - Centered */}
      <div className="w-full bg-white py-2.5 flex items-center justify-center border-b border-gray-100">
        <img
          src="/power2go-logo.png"
          alt="Power2Go"
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* ======================================================== */}
      {/* 1. TOP BAR: Clean Prominent Search Bar                     */}
      {/* ======================================================== */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-100">
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search plant, address or station ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/70 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 p-0.5"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="px-3 space-y-3 mt-3">
        {/* ======================================================== */}
        {/* 2. SUMMARY COUNTER CARDS: 7 All, 5 Online, 0 Alarm...     */}
        {/* ======================================================== */}
        <div className="grid grid-cols-4 gap-2">
          {/* Card 1: All */}
          <button
            onClick={() => setActiveFilterTab("All")}
            className={`rounded-xl p-2.5 flex flex-col items-center justify-center transition-all ${
              activeFilterTab === "All"
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-md shadow-emerald-500/25"
                : "bg-white border border-gray-200 text-slate-700"
            }`}
          >
            <span className="text-base font-bold font-mono">{totalCount}</span>
            <span className="text-[11px] font-medium mt-0.5">All</span>
          </button>

          {/* Card 2: Online */}
          <button
            onClick={() => setActiveFilterTab("Online")}
            className={`rounded-xl p-2.5 flex flex-col items-center justify-center transition-all ${
              activeFilterTab === "Online"
                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-md shadow-emerald-500/25"
                : "bg-white border border-gray-200 text-slate-700"
            }`}
          >
            <span className="text-base font-bold font-mono">{onlineCount}</span>
            <span className="text-[11px] font-medium mt-0.5">Online</span>
          </button>

          {/* Card 3: Alarm */}
          <button
            onClick={() => setActiveFilterTab("Alarm")}
            className={`rounded-xl p-2.5 flex flex-col items-center justify-center transition-all ${
              activeFilterTab === "Alarm"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-md shadow-orange-500/25"
                : "bg-white border border-gray-200 text-slate-700"
            }`}
          >
            <span className="text-base font-bold font-mono">{alarmCount}</span>
            <span className="text-[11px] font-medium mt-0.5">Alarm</span>
          </button>

          {/* Card 4: Offline */}
          <button
            onClick={() => setActiveFilterTab("Offline")}
            className={`rounded-xl p-2.5 flex flex-col items-center justify-center transition-all ${
              activeFilterTab === "Offline"
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold shadow-md shadow-orange-500/25"
                : "bg-white border border-gray-200 text-slate-700"
            }`}
          >
            <span className="text-base font-bold font-mono">{offlineCount}</span>
            <span className="text-[11px] font-medium mt-0.5">Offline</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 3. SORT FILTER ROW: Default with Lowest PV, Consumption    */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between text-xs pb-0.5 relative">
          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200/90 bg-emerald-50/50 text-[#10b981] font-semibold whitespace-nowrap cursor-pointer active:scale-95 transition-all"
            >
              <span>
                {sortBy === "Default"
                  ? "Default"
                  : sortBy === "LowestPV"
                  ? "Lowest PV Yield"
                  : sortBy === "LowestConsumption"
                  ? "Lowest Consumption"
                  : sortBy === "HighestPV"
                  ? "Highest PV Yield"
                  : sortBy === "HighestConsumption"
                  ? "Highest Consumption"
                  : `Sort: ${sortBy}`}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#10b981]" />
            </button>
            {isSortDropdownOpen && (
              <div className="absolute left-0 mt-1 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95">
                {[
                  { id: "Default", label: "Default Order" },
                  { id: "LowestPV", label: "Lowest PV Yield (Underperforming)" },
                  { id: "HighestPV", label: "Highest PV Yield" },
                  { id: "LowestConsumption", label: "Lowest Consumption" },
                  { id: "HighestConsumption", label: "Highest Consumption" },
                  { id: "Capacity", label: "Highest Capacity" },
                  { id: "Power", label: "Highest Current Power" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSortBy(s.id as any);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-emerald-50/50 transition-colors ${
                      sortBy === s.id ? "text-emerald-600 font-bold bg-emerald-50/30" : "text-slate-700"
                    }`}
                  >
                    <span>{s.label}</span>
                    {sortBy === s.id && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset Sort Button */}
          {sortBy !== "Default" && (
            <button
              onClick={() => setSortBy("Default")}
              className="text-[11px] font-semibold text-slate-400 hover:text-emerald-600 px-2 py-1"
            >
              Reset Sort
            </button>
          )}
        </div>

        {/* ======================================================== */}
        {/* 4. PLANT CARDS FEED (VERTICAL FEED)                      */}
        {/* ======================================================== */}
        <div className="space-y-3">
          {sortedPlants.length === 0 && <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center text-sm text-slate-500">No plant data is available for this view.</div>}
          {sortedPlants.map((plant) => {
            const isOnline = plant.status === "Online";

            return (
              <div
                key={plant.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectPlant(plant.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectPlant(plant.id);
                  }
                }}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 cursor-pointer active:scale-[0.99] transition-all hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                aria-label={`Open details for plant ${plant.name}`}
              >
                {/* Row 1: Status Pill & Plant Name */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide ${
                      isOnline
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {plant.status}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    {plant.name}
                  </h4>
                </div>

                {/* Row 2: Address */}
                <p className="text-[11px] text-slate-400 truncate mb-3">
                  {plant.address}
                </p>

                {/* Row 3: 3 Stats on Left + Solar Photo Thumbnail on Right */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-gray-50">
                  {/* Left Stats Grid (3 Columns) */}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {/* Stat 1: Daily Yield */}
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {Math.round(Number(plant.dailyYieldKwh || 0))}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">
                          kWh
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Daily Yield
                      </span>
                    </div>

                    {/* Stat 2: Power */}
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {Math.round(Number(plant.powerKw || 0))}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">
                          kW
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Power</span>
                    </div>

                    {/* Stat 3: Capacity */}
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {Math.round(Number(plant.capacityKwp || 0))}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">
                          kWp
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Capacity
                      </span>
                    </div>
                  </div>

                  {/* Right Thumbnail: Solar Rooftop Photo */}
                  <div className="relative w-24 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60 flex-shrink-0">
                    <Image
                      src={PLANT_IMAGES[plant.id] || "/solis/STATION_default_normal.png"}
                      alt={plant.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Row 4: Timestamp / Offline detail + "More" Link */}
                <div className="flex items-center justify-between pt-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <RotateCw className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px]">
                      {isOnline
                        ? `Live Sync: ${plant.latestTime || "—"}`
                        : `Offline${plant.latestTime ? ` since ${plant.latestTime}` : " - no recent telemetry"}`}
                    </span>
                  </div>

                  <span className="text-[#10b981] font-semibold text-xs hover:underline">
                    More
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Floating Up-Arrow Button at Bottom Right */}
      <div className="fixed right-4 bottom-20 z-30 pointer-events-auto">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-xs border border-gray-200 text-slate-600 flex items-center justify-center shadow-md active:scale-95 transition-all"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
