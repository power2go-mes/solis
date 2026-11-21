"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  MapPin,
  Sun,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  ChevronLeft,
  ChevronRight,
  Star,
  Settings,
} from "lucide-react";
import { SolisPlantOverviewItem } from "@/lib/types";

interface SolisPlantTableProps {
  plants: SolisPlantOverviewItem[];
  loading?: boolean;
  onSelectPlant: (plantId: string) => void;
}

type TabType = "Total" | "Online" | "Alarm" | "Offline";
type SortField =
  | "name"
  | "dailyYieldKwh"
  | "dailyChargeKwh"
  | "dailyDischargeKwh"
  | "totalYieldKwh"
  | "totalChargeKwh";

export default function SolisPlantTable({
  plants,
  loading = false,
  onSelectPlant,
}: SolisPlantTableProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("Total");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesFilter, setFavoritesFilter] = useState("all");
  const [plantTypeFilter, setPlantTypeFilter] = useState("all");
  const [investmentTypeFilter, setInvestmentTypeFilter] = useState("all");
  const [isExpanded, setIsExpanded] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPageInput, setGoToPageInput] = useState("1");

  // Favorite toggle state per plant id
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Tab counts
  const counts = useMemo(() => {
    let online = 0;
    let alarm = 0;
    let offline = 0;
    plants.forEach((p) => {
      if (p.status === "Online") online++;
      else if (p.status === "Alarm") alarm++;
      else if (p.status === "Offline") offline++;
    });
    return {
      Total: plants.length,
      Online: online,
      Alarm: alarm,
      Offline: offline,
    };
  }, [plants]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Reset Filters
  const handleReset = () => {
    setSearchQuery("");
    setFavoritesFilter("all");
    setPlantTypeFilter("all");
    setInvestmentTypeFilter("all");
    setSortField(null);
    setCurrentPage(1);
    setGoToPageInput("1");
  };

  // Filtered & Sorted Plants
  const filteredPlants = useMemo(() => {
    let result = [...plants];

    // Status tab filter
    if (activeTab === "Online") {
      result = result.filter((p) => p.status === "Online");
    } else if (activeTab === "Alarm") {
      result = result.filter((p) => p.status === "Alarm");
    } else if (activeTab === "Offline") {
      result = result.filter((p) => p.status === "Offline");
    }

    // Search query (Plant name, Address, ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }

    // Favorites filter
    if (favoritesFilter === "favorite") {
      result = result.filter((p) => favorites[p.id]);
    } else if (favoritesFilter === "non_favorite") {
      result = result.filter((p) => !favorites[p.id]);
    }

    // Plant Type filter
    if (plantTypeFilter !== "all") {
      result = result.filter((p) => p.plantType === plantTypeFilter);
    }

    // Investment Type filter
    if (investmentTypeFilter !== "all") {
      result = result.filter((p) => p.investmentType === investmentTypeFilter);
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];
        if (typeof aVal === "string") {
          return sortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [
    plants,
    activeTab,
    searchQuery,
    favoritesFilter,
    plantTypeFilter,
    investmentTypeFilter,
    sortField,
    sortDirection,
    favorites,
  ]);

  // Pagination calculation
  const totalItems = filteredPlants.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedPlants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlants.slice(start, start + pageSize);
  }, [filteredPlants, currentPage, pageSize]);

  // Export CSV Functionality
  const exportCsv = () => {
    const headers = [
      "Plant Status",
      "Plant ID",
      "Plant Name",
      "Address",
      "Weather",
      "Owner",
      "Owner Contact",
      "Inverters Online",
      "Inverters Total",
      "Installer",
      "Installer Contact",
      "Capacity (kWp)",
      "Daily Yield (kWh)",
      "Daily Charge (kWh)",
      "Daily Discharge (kWh)",
      "Total Yield",
      "Total Charge",
    ];

    const rows = filteredPlants.map((p) => [
      p.status,
      `"${p.id}"`,
      `"${p.name}"`,
      `"${p.address}"`,
      p.weatherCondition || p.weather,
      `"${p.owner}"`,
      `"${p.ownerContact}"`,
      p.inverterOnline,
      p.inverterTotal,
      `"${p.installer}"`,
      `"${p.installerContact}"`,
      p.capacityKwp,
      p.dailyYieldKwh,
      p.dailyChargeKwh,
      p.dailyDischargeKwh,
      p.totalYieldStr,
      p.totalChargeStr,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `soliscloud_plant_overview_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(goToPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    } else {
      setGoToPageInput(String(currentPage));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden transition-all">
      {/* 1. Header with Orange Title, Underline, Exact Tabs matching media_1795078713051_7676d6f6.png */}
      <div className="px-5 pt-4 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Plant List Tab Bar */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
          {/* Active Title Indicator */}
          <div className="relative pb-3 shrink-0">
            <span className="text-sm font-semibold text-emerald-600 cursor-pointer">
              Plant List
            </span>
            {/* Green Underline Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
          </div>

          {/* Status Tabs: Solis exact rounded pill styling */}
          <div className="flex items-center gap-1.5 pb-3 shrink-0 text-xs">
            {(["Total", "Online", "Alarm", "Offline"] as TabType[]).map((tab) => {
              const isSelected = activeTab === tab;
              const count = counts[tab];
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg transition-all text-xs font-normal ${
                    isSelected
                      ? "bg-white border border-emerald-300 text-emerald-700 font-medium shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                      : "text-slate-500 hover:text-slate-900 border border-transparent"
                  }`}
                >
                  {tab}({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Export Button */}
        <div className="pb-3 flex items-center justify-end">
          <button
            onClick={exportCsv}
            className="p-1.5 rounded-lg text-slate-500 hover:text-[#10b981] hover:bg-emerald-50 border border-gray-200/70 hover:border-orange-200 transition-colors flex items-center gap-1.5 text-xs font-normal shadow-2xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Filter Area: Exact Solis styling with soft light-gray inputs */}
      <div className="px-5 py-4 border-t border-gray-100">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 items-end">
          {/* Filter 1: Search */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-normal text-slate-600 mb-1.5">
              Search
            </label>
            <input
              type="text"
              placeholder="Search for Plant/Address/ID"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all"
            />
          </div>

          {/* Filter 2: My Favorites */}
          <div>
            <label className="block text-[11px] font-normal text-slate-600 mb-1.5">
              My Favorites
            </label>
            <div className="relative">
              <select
                value={favoritesFilter}
                onChange={(e) => {
                  setFavoritesFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-7 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                <option value="all">Select Favorites</option>
                <option value="favorite">Favorites Only</option>
                <option value="non_favorite">Non-Favorites</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filter 3: Plant Type */}
          <div>
            <label className="block text-[11px] font-normal text-slate-600 mb-1.5">
              Plant Type
            </label>
            <div className="relative">
              <select
                value={plantTypeFilter}
                onChange={(e) => {
                  setPlantTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-7 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                <option value="all">Select plant type</option>
                <option value="Commercial & Industrial">Commercial & Industrial</option>
                <option value="Residential">Residential</option>
                <option value="Utility">Utility</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Filter 4: Investment Type (or responsive) */}
          <div>
            <label className="block text-[11px] font-normal text-slate-600 mb-1.5">
              Investment Type
            </label>
            <div className="relative">
              <select
                value={investmentTypeFilter}
                onChange={(e) => {
                  setInvestmentTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none pl-3 pr-7 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
              >
                <option value="all">Select investment type</option>
                <option value="Self-owned">Self-owned</option>
                <option value="Third-party">Third-party</option>
                <option value="Leased">Leased</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action Buttons: Exact Solis pill buttons */}
          <div className="sm:col-span-2 flex items-center gap-2 justify-end">
            <button
              onClick={() => setCurrentPage(1)}
              className="px-5 py-2 rounded-lg text-xs font-normal border border-emerald-300 bg-white text-[#10b981] hover:bg-emerald-50 transition-all shadow-2xs active:scale-95"
            >
              Search
            </button>
            <button
              onClick={handleReset}
              className="px-5 py-2 rounded-lg text-xs font-normal border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-all active:scale-95 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-gray-400" />
              <span>Reset</span>
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-2 text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
            >
              <span>Expand</span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {isExpanded && (
          <div className="mt-3.5 pt-3.5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
            <div>
              <span className="text-[11px] text-gray-500 block mb-1">Grid Type</span>
              <select className="w-full px-3 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700">
                <option value="all">All Grid Types</option>
                <option value="single">Single Phase</option>
                <option value="three">Three Phase</option>
              </select>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block mb-1">Battery Storage</span>
              <select className="w-full px-3 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700">
                <option value="all">All</option>
                <option value="yes">With Battery</option>
                <option value="no">Without Battery</option>
              </select>
            </div>
            <div>
              <span className="text-[11px] text-gray-500 block mb-1">Country / Region</span>
              <select className="w-full px-3 py-2 bg-[#f4f6f8] border-0 rounded-lg text-xs text-slate-700">
                <option value="all">Pakistan (Sindh & Punjab)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Table Container (Exact Solis Layout & Operation Column) */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1280px]">
          <thead>
            <tr className="bg-[#fcfdfd] border-t border-b border-gray-100 text-[11px] font-normal text-slate-500 select-none">
              <th className="py-3 px-3.5 whitespace-nowrap">Plant Status</th>
              <th
                onClick={() => handleSort("name")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Plant Name</span>
                  {sortField === "name" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>
              <th className="py-3 px-3.5 whitespace-nowrap">Weather</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Owner</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Owner's Contact</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Inverter Online/Total</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Installer</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Installer's Contact</th>
              <th
                onClick={() => handleSort("dailyYieldKwh")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Daily Yield</span>
                  <span title="Today's total generation in kWh">
                    <Info className="w-3 h-3 text-gray-400" />
                  </span>
                  {sortField === "dailyYieldKwh" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("dailyChargeKwh")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Daily Charge</span>
                  {sortField === "dailyChargeKwh" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("dailyDischargeKwh")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Daily Discharge</span>
                  {sortField === "dailyDischargeKwh" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("totalYieldKwh")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Total Yield</span>
                  {sortField === "totalYieldKwh" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort("totalChargeKwh")}
                className="py-3 px-3.5 whitespace-nowrap cursor-pointer hover:text-slate-800 group"
              >
                <div className="flex items-center gap-1">
                  <span>Total Charge</span>
                  {sortField === "totalChargeKwh" ? (
                    sortDirection === "asc" ? (
                      <ArrowUp className="w-3 h-3 text-[#10b981]" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-[#10b981]" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </th>

              {/* Exact Operation Column matching Solis screenshot */}
              <th className="py-3 px-3.5 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-1">
                  <span>Operation</span>
                  <Settings className="w-3 h-3 text-gray-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
                    <span>Loading SolisCloud plant registry...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedPlants.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-slate-400">
                  No plants match the selected criteria.
                </td>
              </tr>
            ) : (
              paginatedPlants.map((plant) => {
                const isFavorite = favorites[plant.id] || false;
                return (
                  <tr
                    key={plant.id}
                    onClick={() => onSelectPlant(plant.id)}
                    className="transition-colors cursor-pointer bg-white hover:bg-emerald-50/30 group"
                    title="Click to view detailed 4-graph power & battery analytics"
                  >
                    {/* Plant Status */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            plant.status === "Online"
                              ? "bg-emerald-500 shadow-xs shadow-emerald-500/40"
                              : plant.status === "Alarm"
                              ? "bg-rose-500 shadow-xs shadow-rose-500/40 animate-pulse"
                              : "bg-slate-400"
                          }`}
                        />
                        <span
                          className={`font-normal ${
                            plant.status === "Online"
                              ? "text-emerald-700"
                              : plant.status === "Alarm"
                              ? "text-rose-600"
                              : "text-slate-500"
                          }`}
                        >
                          {plant.status}
                        </span>
                      </div>
                    </td>

                    {/* Plant Name & Address with Star */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap max-w-[240px]">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => toggleFavorite(plant.id, e)}
                            className="text-gray-300 hover:text-amber-400 transition-colors"
                            title={isFavorite ? "Remove favorite" : "Mark favorite"}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFavorite ? "text-amber-400 fill-amber-400" : ""
                              }`}
                            />
                          </button>
                          <span className="font-medium text-slate-800 group-hover:text-[#10b981] transition-colors truncate">
                            {plant.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate pl-5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0 text-slate-400" />
                          <span className="truncate">{plant.address}</span>
                        </div>
                      </div>
                    </td>

                    {/* Weather */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div
                        className="flex items-center gap-1 text-amber-500"
                        title={plant.weatherCondition || "Clear"}
                      >
                        <Sun className="w-4 h-4" />
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600 font-normal">
                      {plant.owner || "--"}
                    </td>

                    {/* Owner's Contact */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500 text-[11px] max-w-[160px] truncate">
                      {plant.ownerContact || "--"}
                    </td>

                    {/* Inverter Online/Total (Distinctive Orange font) */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-semibold text-[#10b981]">
                        {plant.inverterOnline}/{plant.inverterTotal}
                      </span>
                    </td>

                    {/* Installer */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-600 font-normal">
                      {plant.installer || "--"}
                    </td>

                    {/* Installer's Contact */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500 text-[11px] max-w-[160px] truncate">
                      {plant.installerContact || "--"}
                    </td>

                    {/* Daily Yield */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-normal text-slate-800">
                      {Number(plant.dailyYieldKwh || 0).toFixed(2)}kWh
                    </td>

                    {/* Daily Charge */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-normal text-slate-800">
                      {Number(plant.dailyChargeKwh || 0).toFixed(2)}kWh
                    </td>

                    {/* Daily Discharge */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-normal text-slate-800">
                      {Number(plant.dailyDischargeKwh || 0).toFixed(2)}kWh
                    </td>

                    {/* Total Yield */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-normal text-slate-800">
                      {plant.totalYieldStr}
                    </td>

                    {/* Total Charge */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap font-normal text-slate-800">
                      {plant.totalChargeStr}
                    </td>

                    {/* Operation Column with rounded Operation button */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlant(plant.id);
                        }}
                        className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs font-normal text-slate-700 hover:border-emerald-300 hover:text-[#10b981] hover:bg-emerald-50/40 shadow-2xs transition-colors"
                      >
                        Operation
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Bottom Pagination Area */}
      <div className="px-5 py-3 border-t border-gray-100 bg-[#fcfdfd] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
        {/* Left: Total Items */}
        <div className="font-normal text-slate-500">
          Total {totalItems}
        </div>

        {/* Right: Page Size, Page Numbers, Go To */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Page Size Selector */}
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="appearance-none pl-2.5 pr-6 py-1 bg-white border border-gray-200 rounded-md text-xs text-slate-700 cursor-pointer focus:outline-none focus:border-[#10b981]"
            >
              <option value={10}>10/page</option>
              <option value={20}>20/page</option>
              <option value={50}>50/page</option>
            </select>
            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Navigation Arrows & Current Page */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => {
              const p = i + 1;
              const isCurrent = p === currentPage;
              return (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-all ${
                    isCurrent
                      ? "bg-white border border-[#10b981] text-[#10b981] font-medium shadow-2xs"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 font-normal"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Go To Page Input */}
          <form onSubmit={handleGoToPage} className="flex items-center gap-1.5 pl-2">
            <span>Go to</span>
            <input
              type="text"
              value={goToPageInput}
              onChange={(e) => setGoToPageInput(e.target.value)}
              className="w-9 py-0.5 text-center bg-white border border-gray-200 rounded text-xs text-slate-800 focus:outline-none focus:border-[#10b981]"
            />
          </form>
        </div>
      </div>
    </div>
  );
}
