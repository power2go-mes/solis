"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  ChevronDown,
  Filter,
  RotateCw,
  Home,
  Activity,
  LayoutGrid,
  Wrench,
  User,
  ArrowUp,
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
}

type TabCategory = "All" | "Online" | "Alarm" | "Offline";

export default function SolisMobilePlantList({
  plants,
  onSelectPlant,
  onCreatePlant,
  onNavigateTab,
}: SolisMobilePlantListProps) {
  // Top category tabs: Plant | Inverter | Battery | Data
  const [activeTopTab, setActiveTopTab] = useState<string>("Plant");

  // Filter summary tab: All | Online | Alarm | Offline
  const [activeFilterTab, setActiveFilterTab] = useState<TabCategory>("All");

  // Search input state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Bottom navigation tab
  const [activeBottomNav, setActiveBottomNav] = useState<string>("Plant");

  const effectivePlants = plants || [];

  // Summary counts
  const totalCount = effectivePlants.length;
  const onlineCount = effectivePlants.filter((p) => p.status === "Online").length;
  const alarmCount = effectivePlants.filter((p) => p.status === "Alarm").length;
  const offlineCount = effectivePlants.filter((p) => p.status === "Offline").length;

  // Filter plants based on tab and search
  const filteredPlants = effectivePlants.filter((p) => {
    if (activeFilterTab === "Online" && p.status !== "Online") return false;
    if (activeFilterTab === "Alarm" && p.status !== "Alarm") return false;
    if (activeFilterTab === "Offline" && p.status !== "Offline") return false;
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

  const MOBILE_DISPLAY_ORDER = [
    "1298491919450851319", // P2G 20KW
    "1298491919450840394", // P2G 1ST 6kw
    "1298491919450797504", // Menu Karachi Office
    "1298491919450740581", // P2G 50KW
    "1298491919450734544", // P2G 15KW
    "1298491919450873747", // 36 Chenab
    "1298491919450958553", // OPL Residence
  ];

  const sortedPlants = [...filteredPlants].sort((a, b) => {
    const idxA = MOBILE_DISPLAY_ORDER.indexOf(a.id);
    const idxB = MOBILE_DISPLAY_ORDER.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

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
      {/* 1. TOP BAR: Category Tabs & Search / Add Icons            */}
      {/* ======================================================== */}
      <div className="bg-white px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
        {/* Category Tabs: Plant, Inverter, Battery, Data */}
        <div className="flex items-center gap-4 text-sm font-semibold">
          {["Plant", "Inverter", "Battery", "Data"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTopTab(tab)}
              className={`transition-colors ${
                activeTopTab === tab
                  ? "text-xl font-bold text-emerald-600"
                  : "text-slate-500 font-medium hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Action Icons: Search & Add */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-600 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
            title="Search Plants"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={onCreatePlant}
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-600 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
            title="Add Plant"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Search Input */}
      {isSearchOpen && (
        <div className="bg-white px-4 py-2 border-b border-gray-100 animate-in fade-in duration-150">
          <input
            type="text"
            placeholder="Search for Plant / Address / ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#10b981] bg-gray-50/50"
            autoFocus
          />
        </div>
      )}

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
        {/* 3. FILTER PILLS ROW: Default, Parameter Selection...      */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-0.5">
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-emerald-200/90 bg-emerald-50/50 text-[#10b981] font-semibold whitespace-nowrap">
            <span>Default</span>
            <ChevronDown className="w-3 h-3 text-[#10b981]" />
          </button>

          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 font-medium whitespace-nowrap">
            <span>Parameter Selection</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 font-medium whitespace-nowrap">
            <span>Distance</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-slate-600 hover:bg-gray-50 flex-shrink-0 shadow-2xs">
            <Filter className="w-3.5 h-3.5" />
          </button>
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
                onClick={() => onSelectPlant(plant.id)}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 cursor-pointer active:scale-[0.99] transition-all hover:border-emerald-200"
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
                        {plant.dailyYieldKwh}
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
                        {plant.powerKw}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">
                          kW
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Power</span>
                    </div>

                    {/* Stat 3: Capacity */}
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {plant.capacityKwp}
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

      {/* ======================================================== */}
      {/* 5. FLOATING BOTTOM NAVIGATION: Plant, Events, Overview...  */}
      {/* ======================================================== */}
      <div className="fixed bottom-3 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-full px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between w-full max-w-sm pointer-events-auto">
          {/* Plant (Active Green Gradient Pill) */}
          <button
            onClick={() => {
              setActiveBottomNav("Plant");
              if (onNavigateTab) onNavigateTab("plant_overview");
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs shadow-md shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <Home className="w-3.5 h-3.5 fill-white" />
            <span>Plant</span>
          </button>

          {/* Events -> Navigates to O&M Alarms */}
          <button
            onClick={() => {
              setActiveBottomNav("Events");
              if (onNavigateTab) onNavigateTab("om_alarms");
            }}
            className="flex flex-col items-center px-2 py-1 text-slate-500 hover:text-slate-900 text-[10px] font-medium"
          >
            <Activity className="w-4 h-4 mb-0.5" />
            <span>Events</span>
          </button>

          {/* Overview -> Navigates to Device Overview */}
          <button
            onClick={() => {
              setActiveBottomNav("Overview");
              if (onNavigateTab) onNavigateTab("device_overview");
            }}
            className="flex flex-col items-center px-2 py-1 text-slate-500 hover:text-slate-900 text-[10px] font-medium"
          >
            <LayoutGrid className="w-4 h-4 mb-0.5" />
            <span>Overview</span>
          </button>

          {/* Service */}
          <button
            onClick={() => {
              setActiveBottomNav("Service");
              alert("Solis Customer Support Hotline: +92 21 111-POWER2GO");
            }}
            className="flex flex-col items-center px-2 py-1 text-slate-500 hover:text-slate-900 text-[10px] font-medium"
          >
            <Wrench className="w-4 h-4 mb-0.5" />
            <span>Service</span>
          </button>

          {/* Me */}
          <button
            onClick={() => {
              setActiveBottomNav("Me");
              alert("Logged in as Qasim Moosvi (Owner)");
            }}
            className="flex flex-col items-center px-2 py-1 text-slate-500 hover:text-slate-900 text-[10px] font-medium"
          >
            <User className="w-4 h-4 mb-0.5" />
            <span>Me</span>
          </button>
        </div>
      </div>
    </div>
  );
}
