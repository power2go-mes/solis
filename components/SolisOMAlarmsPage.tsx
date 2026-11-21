"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Volume2,
  Search,
  RotateCw,
  ChevronDown,
  ChevronUp,
  Download,
  Bell,
  HelpCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import SolisAlarmDetailModal, { AlarmItem } from "./SolisAlarmDetailModal";

interface SolisOMAlarmsPageProps {
  initialCategory?: "All" | "Alarm" | "Alert";
  onSelectPlant?: (plantId: string) => void;
  onSelectDevice?: (sn: string, deviceType: string) => void;
  onViewAlarmDetail?: (alarm: any) => void;
}

export default function SolisOMAlarmsPage({
  initialCategory = "All",
  onSelectPlant,
  onSelectDevice,
  onViewAlarmDetail,
}: SolisOMAlarmsPageProps) {
  // Category view filter: All | Alarm | Alert (sync with initialCategory when prop changes)
  const [selectedCategory, setSelectedCategory] = useState<"All" | "Alarm" | "Alert">(initialCategory);

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // Filter form states
  const [searchSn, setSearchSn] = useState("");
  const [deviceType, setDeviceType] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All"); // "Active" | "Recovered" | "All"
  const [alarmLevel, setAlarmLevel] = useState("All"); // "All" | "Critical" | "Warning" | "Info"
  const [isExpanded, setIsExpanded] = useState(false);
  const [plantFilter, setPlantFilter] = useState("All");

  // Data states
  const [records, setRecords] = useState<any[]>([]);
  const [counts, setCounts] = useState({ all: 0, alarms: 0, alerts: 0, active: 0, recovered: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPageInput, setGoToPageInput] = useState("1");

  // Ignored / hidden alarms state
  const [ignoredIds, setIgnoredIds] = useState<Set<string | number>>(() => new Set());
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);

  const toggleIgnore = (id: string | number) => {
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setActiveMenuId(null);
  };

  const deleteRecord = (id: string | number) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setActiveMenuId(null);
  };
  const [selectedAlarmForModal, setSelectedAlarmForModal] = useState<AlarmItem | null>(null);
  const [isAlarmPushOpen, setIsAlarmPushOpen] = useState(false);
  const [pushEmail, setPushEmail] = useState("");
  const [pushPhone, setPushPhone] = useState("");

  // Fetch alarms from API
  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (alarmLevel !== "All") params.set("level", alarmLevel);
      if (deviceType !== "All") params.set("deviceType", deviceType);
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (searchSn.trim()) params.set("search", searchSn.trim());
      if (plantFilter !== "All") params.set("plant", plantFilter);

      const res = await fetch(`/api/alarms/all?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoadError("");
        setRecords(Array.isArray(data.records) ? data.records : []);
        if (data.counts) setCounts(data.counts);
      } else {
        setRecords([]);
        setLoadError(data.error || "Alarm data could not be loaded.");
      }
    } catch (err) {
      console.error("Error fetching alarms:", err);
      setRecords([]);
      setLoadError("Alarm data could not be loaded. Check the database connection and retry.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, alarmLevel, deviceType, selectedCategory, searchSn, plantFilter]);

  useEffect(() => {
    fetchAlarms();
  }, [fetchAlarms]);

  // Handle Search button
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchAlarms();
  };

  // Handle Reset button
  const handleReset = () => {
    setSearchSn("");
    setDeviceType("All");
    setStatusFilter("All");
    setAlarmLevel("All");
    setPlantFilter("All");
    setCurrentPage(1);
    setSelectedCategory("All");
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      "Device Type",
      "Level",
      "Status",
      "Plant Name",
      "SN",
      "Alarm Content",
      "Alarm Code",
      "Suggested Treatment",
      "Alarm Duration",
      "Begin Time",
    ];
    const rows = records.map((r) => [
      r.deviceType,
      r.level,
      r.status,
      r.plantName,
      r.sn,
      r.alarmContent,
      r.alarmCode,
      `"${(r.suggestedTreatment || "").replace(/"/g, '""')}"`,
      r.alarmDuration,
      r.beginTimeStr || "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_alarms_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Pagination calculation
  const totalRecords = records.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const pagedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleGoToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(goToPageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setCurrentPage(p);
    }
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* ======================================================== */}
      {/* 1. TOP HEADER: Alarm Information + Alarm Push + Export    */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-transparent">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Alarm Information</span>
            <span className="p-1 rounded-md bg-orange-50 text-[#f37021] border border-orange-200">
              <Volume2 className="w-4 h-4" />
            </span>
          </h1>

          {/* Category Pills: All | Alarm | Alert */}
          <div className="flex items-center gap-1 ml-3 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/80 text-xs font-semibold">
            <button
              onClick={() => setSelectedCategory("All")}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedCategory === "All"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({counts.all})
            </button>
            <button
              onClick={() => setSelectedCategory("Alarm")}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                selectedCategory === "Alarm"
                  ? "bg-white text-[#10b981] shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>Alarms ({counts.alarms})</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
            <button
              onClick={() => setSelectedCategory("Alert")}
              className={`px-3 py-1 rounded-md transition-all ${
                selectedCategory === "Alert"
                  ? "bg-white text-emerald-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Alerts ({counts.alerts})
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAlarmPushOpen(true)}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 active:scale-95 transition-all text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span>Alarm Push</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 active:scale-95 transition-all text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER CONTROLS CARD                                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3.5">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Search SN */}
          <div className="lg:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="SN"
                value={searchSn}
                onChange={(e) => setSearchSn(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10b981] focus:bg-white transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Device Type */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Device Type</label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-slate-700 focus:outline-none focus:border-[#10b981] focus:bg-white transition-all"
            >
              <option value="All">Please Select</option>
              <option value="Inverter">Inverter</option>
              <option value="Battery">Battery</option>
              <option value="Meter">Meter</option>
              <option value="Datalogger">Datalogger</option>
            </select>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-slate-700 focus:outline-none focus:border-[#10b981] focus:bg-white transition-all font-medium"
            >
              <option value="Active">Active</option>
              <option value="Recovered">Recovered</option>
              <option value="All">All</option>
            </select>
          </div>

          {/* Alarm Level */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Alarm Level</label>
            <select
              value={alarmLevel}
              onChange={(e) => setAlarmLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-slate-700 focus:outline-none focus:border-[#10b981] focus:bg-white transition-all"
            >
              <option value="All">Please Select</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Info">Info</option>
            </select>
          </div>

          {/* Action Buttons: Search, Reset, Expand */}
          <div className="lg:col-span-3 flex items-center justify-end gap-2 pt-1 sm:pt-0">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#10b981] text-white text-xs font-semibold hover:bg-emerald-600 active:scale-95 transition-all shadow-xs"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-slate-600 text-xs font-semibold hover:bg-gray-50 active:scale-95 transition-all"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-0.5 ml-1"
            >
              <span>Expand</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expanded extra filters */}
          {isExpanded && (
            <div className="lg:col-span-12 pt-2 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Plant Filter</label>
                <select
                  value={plantFilter}
                  onChange={(e) => setPlantFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50 text-xs text-slate-700 focus:outline-none focus:border-[#10b981]"
                >
                  <option value="All">All Plants</option>
                  <option value="Towfiq chinoy">Towfiq chinoy</option>
                  <option value="P2G 50KW">P2G 50KW</option>
                  <option value="P2G 15KW">P2G 15KW</option>
                  <option value="OPL Residence">OPL Residence</option>
                  <option value="36 Chenab">36 Chenab</option>
                  <option value="Menu Karachi Office">Menu Karachi Office</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ======================================================== */}
      {/* 3. ALARM INFORMATION DATA TABLE (EXACT SOLIS REPLICA)    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading SolisCloud Alarm Records...</p>
          </div>
        ) : loadError ? (
          <div className="p-16 text-center text-sm text-rose-600">{loadError}</div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">No Alarms Found</p>
            <p className="text-xs text-slate-400 mt-1">All monitored systems are functioning normally.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60 text-slate-500 font-semibold">
                  <th className="py-3 px-4 whitespace-nowrap">Device Type</th>
                  <th className="py-3 px-3 whitespace-nowrap">Level</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <span>Plant Name</span>
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    </span>
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">SN</th>
                  <th className="py-3 px-4 whitespace-nowrap">Alarm Content</th>
                  <th className="py-3 px-3 whitespace-nowrap">Alarm Code</th>
                  <th className="py-3 px-4 min-w-[240px]">Suggested Treatment</th>
                  <th className="py-3 px-3 whitespace-nowrap">Alarm Duration</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRecords.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      const item = {
                        id: row.id,
                        alarmCode: row.alarmCode,
                        alarmContent: row.alarmContent,
                        deviceType: row.deviceType || "Inverter",
                        deviceSn: row.sn,
                        plantName: row.plantName,
                        plantId: row.plantId,
                        alarmLevel: row.level,
                        alarmStatus: row.status,
                        alarmDuration: row.alarmDuration,
                        startTime: row.beginTimeStr || "",
                        recoveryTime: row.status === "Recovered" ? "Recovered" : "--",
                        handlingMethod: row.suggestedTreatment,
                      };
                      if (onViewAlarmDetail) {
                        onViewAlarmDetail(item);
                      }
                    }}
                    className="hover:bg-orange-50/30 transition-colors group cursor-pointer"
                  >
                    {/* Device Type */}
                    <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                      {row.deviceType}
                    </td>

                    {/* Level Badge with Solis red dot (hidden if ignored) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="relative inline-flex items-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            row.level === "Warning"
                              ? "bg-orange-50 text-[#f37021] border border-orange-200"
                              : row.level === "Critical"
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          }`}
                        >
                          {row.level}
                        </span>
                        {!ignoredIds.has(row.id) && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#ef4444] border-2 border-white shadow-xs animate-pulse" />
                        )}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">
                      {row.status}
                    </td>

                    {/* Plant Name (Clickable link to Plant Overview) */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => onSelectPlant && onSelectPlant(row.plantId)}
                        className="text-[#10b981] hover:underline font-semibold text-left transition-colors"
                        title={`Go to ${row.plantName}`}
                      >
                        {row.plantName}
                      </button>
                    </td>

                    {/* SN (Clickable link to Inverter / Device Details) */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <button
                        onClick={() => onSelectDevice && onSelectDevice(row.sn, row.deviceType)}
                        className="text-[#10b981] hover:underline font-semibold transition-colors"
                        title={`View ${row.sn} details`}
                      >
                        {row.sn}
                      </button>
                    </td>

                    {/* Alarm Content - Clicking navigates to Alarm Details Page */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">
                      <button
                        onClick={() => {
                          const item = {
                            id: row.id,
                            alarmCode: row.alarmCode,
                            alarmContent: row.alarmContent,
                            deviceType: row.deviceType || "Inverter",
                            deviceSn: row.sn,
                            plantName: row.plantName,
                            plantId: row.plantId,
                            alarmLevel: row.level,
                            alarmStatus: row.status,
                            alarmDuration: row.alarmDuration,
                            startTime: row.beginTimeStr || "",
                            recoveryTime: row.status === "Recovered" ? "Recovered" : "--",
                            handlingMethod: row.suggestedTreatment,
                          };
                          if (onViewAlarmDetail) {
                            onViewAlarmDetail(item);
                          } else {
                            setSelectedAlarmForModal({
                              id: row.id,
                              alarmCode: row.alarmCode,
                              alarmName: row.alarmContent,
                              severity: row.level,
                              deviceSn: row.sn,
                              plantName: row.plantName,
                              beginTime: row.beginTimeStr || "",
                              endTime: undefined,
                              duration: row.alarmDuration,
                              status: row.status,
                              advice: row.suggestedTreatment,
                            });
                          }
                        }}
                        className="text-left font-semibold text-slate-900 hover:text-[#10b981] hover:underline cursor-pointer"
                        title="View Full Alarm Details"
                      >
                        {row.alarmContent}
                      </button>
                    </td>

                    {/* Alarm Code */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono font-semibold text-slate-700">
                      {row.alarmCode}
                    </td>

                    {/* Suggested Treatment */}
                    <td className="py-3.5 px-4 text-slate-600 line-clamp-2 max-w-[320px]" title={row.suggestedTreatment}>
                      {row.suggestedTreatment}
                    </td>

                    {/* Alarm Duration */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-600">
                      {row.alarmDuration}
                    </td>

                    {/* Operation Button with Ignore & Delete Popover matching reference */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap relative">
                      <div className="inline-block relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === row.id ? null : row.id);
                          }}
                          className={`px-3.5 py-1 rounded-lg border text-xs font-semibold active:scale-95 transition-all shadow-2xs ${
                            activeMenuId === row.id
                              ? "border-[#f37021] text-[#f37021] bg-orange-50/50"
                              : "border-gray-200 bg-white text-slate-700 hover:border-gray-300"
                          }`}
                        >
                          Operation
                        </button>

                        {/* Floating Popup Menu matching Screenshot: Ignore and Delete */}
                        {activeMenuId === row.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-full mt-1.5 w-28 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-150"
                          >
                            <button
                              onClick={() => toggleIgnore(row.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:text-[#f37021] flex items-center justify-between transition-colors"
                            >
                              <span>{ignoredIds.has(row.id) ? "Unignore" : "Ignore"}</span>
                              {ignoredIds.has(row.id) && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteRecord(row.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center justify-between transition-colors border-t border-gray-50"
                            >
                              <span>Delete</span>
                              <X className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. PAGINATION FOOTER                                     */}
        {/* ======================================================== */}
        <div className="bg-gray-50/50 border-t border-gray-100 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Total {totalRecords}</span>
            <div className="flex items-center gap-1">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-gray-200 bg-white text-slate-700 focus:outline-none"
              >
                <option value={10}>10/page</option>
                <option value={20}>20/page</option>
                <option value={50}>50/page</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Current Page Pill */}
            <span className="px-2.5 py-1 rounded bg-[#10b981] text-white font-bold text-xs shadow-2xs">
              {currentPage}
            </span>

            {/* Next Page */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* Go to Page */}
            <form onSubmit={handleGoToPage} className="flex items-center gap-1 ml-2">
              <span>Go to</span>
              <input
                type="text"
                value={goToPageInput}
                onChange={(e) => setGoToPageInput(e.target.value)}
                className="w-10 px-1.5 py-1 rounded border border-gray-200 bg-white text-center font-mono focus:outline-none focus:border-[#10b981]"
              />
            </form>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL: ALARM DETAIL TROUBLESHOOTING                   */}
      {/* ======================================================== */}
      <SolisAlarmDetailModal
        alarm={selectedAlarmForModal}
        isOpen={Boolean(selectedAlarmForModal)}
        onClose={() => setSelectedAlarmForModal(null)}
        onViewDevice={(sn) => onSelectDevice && onSelectDevice(sn, "Inverter")}
      />

      {/* ======================================================== */}
      {/* 6. MODAL: ALARM PUSH NOTIFICATIONS CONFIGURATION         */}
      {/* ======================================================== */}
      {isAlarmPushOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-50 text-[#f37021]">
                  <Bell className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Alarm Push Notification Service</h3>
              </div>
              <button
                onClick={() => setIsAlarmPushOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Configure real-time automated alerts for critical inverter faults, grid outages, and battery anomalies.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Recipient</label>
                <input
                  type="email"
                  value={pushEmail}
                  onChange={(e) => setPushEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-[#10b981] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SMS / WhatsApp Mobile</label>
                <input
                  type="text"
                  value={pushPhone}
                  onChange={(e) => setPushPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs focus:border-[#10b981] focus:outline-none"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="block font-semibold text-slate-700">Notification Channels</label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#10b981]" />
                  <span>Critical Faults (Inverter trip, Grid blackout, Battery failure)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-[#10b981]" />
                  <span>Warning Thresholds (High ambient temp, Cell delta imbalance)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input type="checkbox" className="accent-[#10b981]" />
                  <span>Daily Health & Generation Digest at 20:00 PKT</span>
                </label>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
                Notification preferences are not connected to a notification service yet. Changes cannot be saved.
              </div>
            </div>

            <div className="p-3.5 bg-gray-50/60 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setIsAlarmPushOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-600 text-xs font-semibold hover:bg-gray-50"
              >
                Close
              </button>
              <button disabled className="px-4 py-1.5 rounded-lg bg-slate-300 text-white text-xs font-semibold cursor-not-allowed">Save unavailable</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
