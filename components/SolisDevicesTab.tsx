"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  RotateCcw,
  Search,
  Settings,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  ExternalLink,
} from "lucide-react";
import SolisInverterDetailsView from "./SolisInverterDetailsView";
import SolisMeterDetailsView from "./SolisMeterDetailsView";
import SolisAlarmDetailModal, { AlarmItem } from "./SolisAlarmDetailModal";
import SolisOperationLogModal from "./SolisOperationLogModal";

interface SolisDevicesTabProps {
  devices: any;
  isLoading?: boolean;
  onSelectPlantByName?: (plantName: string) => void;
}

type DeviceSubTab =
  | "Inverter"
  | "Battery"
  | "Datalogger"
  | "EPM"
  | "Grid Cabinet"
  | "Weather Station"
  | "Meter";

export default function SolisDevicesTab({
  devices,
  isLoading,
  onSelectPlantByName,
}: SolisDevicesTabProps) {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const snParam = searchParams.get("sn");
  const subtabParam = searchParams.get("subtab");

  // View mode: "table" | "inverter-details" | "meter-details"
  const [viewMode, setViewMode] = useState<"table" | "inverter-details" | "meter-details">(
    viewParam === "inverter"
      ? "inverter-details"
      : viewParam === "meter" || subtabParam === "Meter"
      ? "meter-details"
      : "table"
  );
  const [selectedInverterSn, setSelectedInverterSn] = useState<string>(
    snParam || "1053050258180112"
  );
  const [selectedAlarmForModal, setSelectedAlarmForModal] = useState<AlarmItem | null>(null);
  const [isOperationLogOpen, setIsOperationLogOpen] = useState(false);

  useEffect(() => {
    if (viewParam === "inverter") setViewMode("inverter-details");
    else if (viewParam === "meter" || subtabParam === "Meter") setViewMode("meter-details");
    if (snParam) setSelectedInverterSn(snParam);
  }, [viewParam, snParam, subtabParam]);

  const [activeSubTab, setActiveSubTab] = useState<DeviceSubTab>("Inverter");
  const [statusFilter, setStatusFilter] = useState<"Total" | "Online" | "Alarm" | "Offline">("Total");

  // Filters
  const [searchSn, setSearchSn] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [warrantyFilter, setWarrantyFilter] = useState("all");
  const [minPower, setMinPower] = useState("");
  const [maxPower, setMaxPower] = useState("");

  // Sorting
  const [sortField, setSortField] = useState<string>("power");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [goToPage, setGoToPage] = useState("1");

  if (isLoading || !devices) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#f37021] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Fetching device details from SolisCloud...</p>
      </div>
    );
  }

  const inverters = devices.inverters || [];
  const batteries = devices.batteries || [];
  const dataloggers = devices.dataloggers || [];
  const meters = devices.meters || [];

  // If in Inverter Details view mode
  if (viewMode === "inverter-details") {
    return (
      <>
        <SolisInverterDetailsView
          initialSn={selectedInverterSn}
          onBackToDevices={() => setViewMode("table")}
          onOpenAlarmDetail={(al) => setSelectedAlarmForModal(al)}
          onOpenOperationLog={() => setIsOperationLogOpen(true)}
          onSelectPlantByName={onSelectPlantByName}
        />
        <SolisAlarmDetailModal
          alarm={selectedAlarmForModal}
          isOpen={Boolean(selectedAlarmForModal)}
          onClose={() => setSelectedAlarmForModal(null)}
          onViewDevice={(sn) => setSelectedInverterSn(sn)}
        />
        <SolisOperationLogModal
          isOpen={isOperationLogOpen}
          onClose={() => setIsOperationLogOpen(false)}
          plantName={devices.plantName || "Towfiq chinoy"}
        />
      </>
    );
  }

  // If in Meter Details view mode
  if (viewMode === "meter-details") {
    return (
      <>
        <SolisMeterDetailsView
          meterSn={`${selectedInverterSn}MTR01`}
          plantName={devices.plantName || "Towfiq chinoy"}
          plantId={devices.plantId || "3649E0"}
          dataloggerSn={dataloggers[0]?.sn || "7A12580709004122"}
          onBackToDevices={() => setViewMode("table")}
          onOpenOperationLog={() => setIsOperationLogOpen(true)}
          onSelectPlantByName={onSelectPlantByName}
        />
        <SolisOperationLogModal
          isOpen={isOperationLogOpen}
          onClose={() => setIsOperationLogOpen(false)}
          plantName={devices.plantName || "Towfiq chinoy"}
        />
      </>
    );
  }

  // Filter & Sort Inverters
  const filteredInverters = inverters.filter((inv: any) => {
    if (searchSn && !inv.sn.toLowerCase().includes(searchSn.toLowerCase())) return false;
    if (modelFilter && !inv.model.toLowerCase().includes(modelFilter.toLowerCase())) return false;
    if (minPower && Number(inv.pacKw) < Number(minPower)) return false;
    if (maxPower && Number(inv.pacKw) > Number(maxPower)) return false;
    if (statusFilter === "Online" && inv.status !== "Normal" && inv.status !== "Online") return false;
    if (statusFilter === "Alarm" && inv.status !== "Alarm") return false;
    if (statusFilter === "Offline" && inv.status !== "Offline") return false;
    return true;
  });

  const handleReset = () => {
    setSearchSn("");
    setModelFilter("");
    setWarrantyFilter("all");
    setMinPower("");
    setMaxPower("");
    setStatusFilter("Total");
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const openInverterDetails = (sn: string) => {
    setSelectedInverterSn(sn);
    setViewMode("inverter-details");
  };

  const openMeterDetails = () => {
    setViewMode("meter-details");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-6 space-y-4">
      {/* 1. Sub-Tabs Bar: Inverter, Battery, Datalogger... + Add Device Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200/80 pb-2">
        <div className="flex items-center gap-6 overflow-x-auto text-xs font-medium">
          {(
            [
              "Inverter",
              "Battery",
              "Datalogger",
              "EPM",
              "Grid Cabinet",
              "Weather Station",
              "Meter",
            ] as DeviceSubTab[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Meter") {
                  openMeterDetails();
                  return;
                }
                setActiveSubTab(tab);
                setCurrentPage(1);
              }}
              className={`pb-2 relative whitespace-nowrap transition-colors ${
                activeSubTab === tab
                  ? "text-[#f37021] font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{tab}</span>
              {activeSubTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f37021] rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div>
          <button
            onClick={() => alert("Add Device wizard is authorized for Installer accounts.")}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-normal text-slate-700 hover:bg-gray-50 transition-all shadow-2xs flex items-center gap-1 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Device</span>
          </button>
        </div>
      </div>

      {/* 2. Count Pills: Total, Online, Alarm, Offline */}
      <div className="flex items-center gap-2 pt-1 text-xs">
        <button
          onClick={() => setStatusFilter("Total")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            statusFilter === "Total"
              ? "bg-orange-50 border border-orange-300 text-[#f37021]"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          }`}
        >
          Total({activeSubTab === "Inverter" ? inverters.length : activeSubTab === "Battery" ? batteries.length : activeSubTab === "Datalogger" ? dataloggers.length : meters.length})
        </button>

        <button
          onClick={() => setStatusFilter("Online")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            statusFilter === "Online"
              ? "bg-orange-50 border border-orange-300 text-[#f37021]"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          }`}
        >
          Online({activeSubTab === "Inverter" ? inverters.length : activeSubTab === "Battery" ? batteries.length : activeSubTab === "Datalogger" ? dataloggers.length : meters.length})
        </button>

        <button
          onClick={() => setStatusFilter("Alarm")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            statusFilter === "Alarm"
              ? "bg-orange-50 border border-orange-300 text-[#f37021]"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          }`}
        >
          Alarm(0)
        </button>

        <button
          onClick={() => setStatusFilter("Offline")}
          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
            statusFilter === "Offline"
              ? "bg-orange-50 border border-orange-300 text-[#f37021]"
              : "border border-gray-200 text-slate-600 hover:bg-gray-50"
          }`}
        >
          Offline(0)
        </button>
      </div>

      {/* 3. Filter Bar (Exact Solis Layout) */}
      <div className="bg-[#fafbfc] rounded-xl p-3.5 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end text-xs">
        {/* Search SN */}
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search SN"
              value={searchSn}
              onChange={(e) => setSearchSn(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Model Number */}
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Model Number</label>
          <input
            type="text"
            placeholder="Input Model"
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
        </div>

        {/* Warranty Status */}
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Warranty Status</label>
          <div className="relative">
            <select
              value={warrantyFilter}
              onChange={(e) => setWarrantyFilter(e.target.value)}
              className="w-full appearance-none px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
            >
              <option value="all">Please Select</option>
              <option value="valid">Under Warranty</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Rated Power (Min - Max) */}
        <div className="lg:col-span-2">
          <label className="block text-[11px] text-slate-500 mb-1">Rated Power</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Min"
              value={minPower}
              onChange={(e) => setMinPower(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <span className="text-slate-400 text-xs">kW -</span>
            <input
              type="text"
              placeholder="Max"
              value={maxPower}
              onChange={(e) => setMaxPower(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <span className="text-slate-400 text-xs">kW</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setCurrentPage(1)}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border border-orange-300 bg-white text-[#f37021] hover:bg-orange-50 transition-all shadow-2xs active:scale-95"
          >
            Search
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 rounded-lg text-xs font-normal border border-gray-200 bg-white text-slate-600 hover:bg-gray-50 transition-all active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>

      {/* 4. Comprehensive Device Data Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        {activeSubTab === "Inverter" ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5 cursor-pointer hover:text-slate-800" onClick={() => handleSort("name")}>
                  <div className="flex items-center gap-1">
                    <span>Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Inverter SN</th>
                <th className="py-3 px-3.5 cursor-pointer hover:text-slate-800" onClick={() => handleSort("ratedPower")}>
                  <div className="flex items-center gap-1">
                    <span>Rated Power</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 cursor-pointer hover:text-slate-800" onClick={() => handleSort("power")}>
                  <div className="flex items-center gap-1">
                    <span>Power</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 cursor-pointer hover:text-slate-800" onClick={() => handleSort("dailyYield")}>
                  <div className="flex items-center gap-1">
                    <span>Daily Yield</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 cursor-pointer hover:text-slate-800" onClick={() => handleSort("totalYield")}>
                  <div className="flex items-center gap-1">
                    <span>Total Yield</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5">Plant</th>
                <th className="py-3 px-3.5">Warranty Expiry Date</th>
                <th className="py-3 px-3.5">Update Time</th>
                <th className="py-3 px-3.5">Commissioning Date</th>
                <th className="py-3 px-3.5 text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {filteredInverters.map((inv: any, idx: number) => (
                <tr
                  key={inv.sn || idx}
                  onClick={() => openInverterDetails(inv.sn)}
                  className="hover:bg-orange-50/20 transition-colors cursor-pointer"
                >
                  {/* Status */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" />
                      <span className="text-emerald-700 font-medium">Online</span>
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-900">
                    {idx === 0 ? "Inverter (Primary)" : "Inverter"}
                  </td>

                  {/* Inverter SN */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        openInverterDetails(inv.sn);
                      }}
                      className="text-[#f37021] font-medium hover:underline cursor-pointer"
                    >
                      {inv.sn}
                    </span>
                  </td>

                  {/* Rated Power */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">
                    {inv.ratedPowerKw || 50}kW
                  </td>

                  {/* Power */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-semibold text-slate-900">
                    {inv.pacKw}kW
                  </td>

                  {/* Daily Yield */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">
                    {inv.dailyYieldKwh || 188}kWh
                  </td>

                  {/* Total Yield */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">
                    {inv.totalYieldMwh || 26.48}MWh
                  </td>

                  {/* Plant */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectPlantByName) onSelectPlantByName(devices.plantName || "Menu Karachi Office");
                      }}
                      className="text-[#f37021] font-medium hover:underline cursor-pointer"
                    >
                      {devices.plantName || "Menu Karachi Office"}
                    </span>
                  </td>

                  {/* Warranty Expiry */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500 font-mono">
                    16/08/2030
                  </td>

                  {/* Update Time */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    20/11/2026 12:51:24 (UTC+05:00)
                  </td>

                  {/* Commissioning Date */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    16/08/2025 12:44:02 (UTC+05:00)
                  </td>

                  {/* Operation */}
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInverterDetails(inv.sn);
                      }}
                      className="px-2.5 py-1 rounded border border-gray-200 bg-white text-xs font-normal text-slate-700 hover:bg-orange-50 hover:border-orange-300 hover:text-[#f37021] transition-all shadow-2xs"
                    >
                      Operation
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeSubTab === "Battery" ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Battery Name</th>
                <th className="py-3 px-3.5">Battery SN</th>
                <th className="py-3 px-3.5">Capacity</th>
                <th className="py-3 px-3.5">Voltage</th>
                <th className="py-3 px-3.5">Current</th>
                <th className="py-3 px-3.5">SOC</th>
                <th className="py-3 px-3.5">SOH</th>
                <th className="py-3 px-3.5">Delta mV</th>
                <th className="py-3 px-3.5">Cycles</th>
                <th className="py-3 px-3.5">Connected Inverter</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {batteries.map((bat: any, idx: number) => (
                <tr key={bat.sn || idx} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" />
                      <span className="text-emerald-700 font-medium">Online</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-900">
                    {bat.name || "HV LiFePO4 Storage Unit"}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-[#f37021] font-medium">
                    {bat.sn}
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{bat.nominalCapacityAh || 100}Ah</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{bat.voltageV}V</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{bat.currentA}A</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono font-bold text-emerald-700">
                    {bat.socPercent}%
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{bat.sohPercent}%</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-emerald-600">{bat.cellDeltaMv}mV</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{bat.cycles}</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-slate-500">{bat.connectedInverterSn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : activeSubTab === "Datalogger" ? (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#f8fafc] text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-3.5">Status</th>
                <th className="py-3 px-3.5">Collector Name</th>
                <th className="py-3 px-3.5">Datalogger SN</th>
                <th className="py-3 px-3.5">Model</th>
                <th className="py-3 px-3.5">Signal Strength</th>
                <th className="py-3 px-3.5">Connected Inverter SN</th>
                <th className="py-3 px-3.5">Update Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-slate-700">
              {dataloggers.map((col: any, idx: number) => (
                <tr key={col.sn || idx} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-3.5 px-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/40" />
                      <span className="text-emerald-700 font-medium">Online</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-medium text-slate-900">{col.name}</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-[#f37021] font-medium">{col.sn}</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono">{col.model || "WL-WiFi"}</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap text-emerald-600 font-medium">Excellent (100%)</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-slate-500">{col.connectedInverterSn}</td>
                  <td className="py-3.5 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">20/11/2026 12:51:24 (UTC+05:00)</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">
            No active {activeSubTab} peripheral alerts or offline units detected for this plant configuration.
          </div>
        )}
      </div>

      {/* 5. Pagination Bar matching Solis UI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-slate-500 border-t border-gray-100">
        <div>Total {filteredInverters.length}</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span>10/page</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <div className="flex items-center gap-1">
            <button className="px-2 py-0.5 border border-gray-200 rounded text-slate-400 hover:text-slate-800 disabled:opacity-40" disabled>
              &lt;
            </button>
            <span className="w-6 h-6 rounded border border-orange-300 bg-orange-50 text-[#f37021] font-semibold flex items-center justify-center">
              1
            </span>
            <button className="px-2 py-0.5 border border-gray-200 rounded text-slate-400 hover:text-slate-800 disabled:opacity-40" disabled>
              &gt;
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span>Go to</span>
            <input
              type="text"
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              className="w-9 py-0.5 text-center bg-white border border-gray-200 rounded text-xs text-slate-800"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
