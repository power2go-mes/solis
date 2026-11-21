"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
} from "lucide-react";
import SolisAlarmDetailModal, { AlarmItem } from "./SolisAlarmDetailModal";

interface SolisAlarmsTabProps {
  alarmsData: any;
  isLoading?: boolean;
  onViewDevice?: (deviceSn: string) => void;
  onViewAlarmDetail?: (alarm: any) => void;
}

export default function SolisAlarmsTab({
  alarmsData,
  isLoading,
  onViewDevice,
  onViewAlarmDetail,
}: SolisAlarmsTabProps) {
  const searchParams = useSearchParams();
  const alarmIdParam = searchParams.get("alarmId");

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedAlarmForModal, setSelectedAlarmForModal] = useState<AlarmItem | null>(null);

  // Operation dropdown state and actions
  const [activeMenuId, setActiveMenuId] = useState<string | number | null>(null);
  const [ignoredIds, setIgnoredIds] = useState<Set<string | number>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string | number>>(new Set());

  // Close Operation dropdown on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuId(null);
    }
    if (activeMenuId !== null) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activeMenuId]);

  const toggleIgnore = (id: string | number) => {
    setIgnoredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setActiveMenuId(null);
  };

  const deleteRecord = (id: string | number) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setActiveMenuId(null);
  };

  useEffect(() => {
    if (alarmIdParam && alarmsData?.records) {
      const match = alarmsData.records.find(
        (r: any) => String(r.id) === alarmIdParam || r.alarmCode === alarmIdParam
      );
      if (match) {
        setSelectedAlarmForModal({
          id: match.id,
          alarmCode: match.alarmCode,
          alarmName: match.alarmName,
          severity: match.severity || "Warning",
          deviceSn: match.deviceSn,
          plantName: match.plantName || "Solis Station",
          beginTime: match.beginTime,
          endTime: match.endTime,
          duration: match.duration,
          status: match.status,
          advice: match.advice,
        });
      }
    }
  }, [alarmIdParam, alarmsData]);

  if (isLoading || !alarmsData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Loading SolisCloud Alarm Records...</p>
      </div>
    );
  }

  const rawRecords = (alarmsData.records || []).filter(
    (a: any) => !deletedIds.has(a.id)
  );

  const filtered = rawRecords.filter((alarm: any) => {
    const isCleared =
      alarm.status.toLowerCase().includes("cleared") ||
      alarm.status.toLowerCase().includes("recovered") ||
      alarm.status.toLowerCase().includes("resolved");

    if (statusFilter === "ACTIVE" && isCleared) return false;
    if (statusFilter === "CLEARED" && !isCleared) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = alarm.alarmCode?.toLowerCase().includes(q);
      const matchName = alarm.alarmName?.toLowerCase().includes(q);
      const matchSn = alarm.deviceSn?.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchSn) return false;
    }
    return true;
  });

  const getSeverityBadge = (severity: string) => {
    const s = (severity || "").toLowerCase();
    if (s.includes("critical") || s.includes("danger")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
          <AlertCircle className="w-3 h-3 text-rose-600" />
          <span>Critical</span>
        </span>
      );
    }
    if (s.includes("warn")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>Warning</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
        <Info className="w-3 h-3 text-emerald-600" />
        <span>Notice</span>
      </span>
    );
  };

  const activeCount = rawRecords.filter(
    (a: any) =>
      !a.status.toLowerCase().includes("cleared") &&
      !a.status.toLowerCase().includes("recovered") &&
      !a.status.toLowerCase().includes("resolved")
  ).length;
  const clearedCount = rawRecords.length - activeCount;

  const handleRowClick = (alarm: any) => {
    const item = {
      id: alarm.id,
      alarmCode: alarm.alarmCode,
      alarmContent: alarm.alarmName,
      deviceType: "Inverter",
      deviceSn: alarm.deviceSn,
      plantName: alarm.plantName || "Solis Station",
      plantId: alarm.plantId || "",
      alarmLevel: (alarm.severity || "Warning") as "Info" | "Warning" | "Critical",
      alarmStatus: (alarm.status.toLowerCase().includes("active") ? "Active" : "Recovered") as "Active" | "Recovered",
      alarmDuration: alarm.duration || "1h",
      startTime: alarm.beginTime || "",
      recoveryTime: alarm.endTime || "--",
      handlingMethod: alarm.advice || "1. Check generator/inverter function switch. 2. Verify DC breaker and communication cables.",
    };

    if (onViewAlarmDetail) {
      onViewAlarmDetail(item);
    } else {
      setSelectedAlarmForModal({
        id: alarm.id,
        alarmCode: alarm.alarmCode,
        alarmName: alarm.alarmName,
        severity: alarm.severity || "Warning",
        deviceSn: alarm.deviceSn,
        plantName: alarm.plantName || "Solis Station",
        beginTime: alarm.beginTime,
        endTime: alarm.endTime,
        duration: alarm.duration,
        status: alarm.status,
        advice: alarm.advice,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Top Alarm KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Alarms */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Logged Alarms
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {rawRecords.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-slate-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Active Alarms */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Alarms
            </span>
            <p className="text-2xl font-black text-[#10b981] font-mono mt-1">
              {activeCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10b981]">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Cleared Alarms */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Cleared / Resolved
            </span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {clearedCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Filter Pills and Real-time Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          {[
            { id: "ALL", label: "All Alarms" },
            { id: "ACTIVE", label: `Active (${activeCount})` },
            { id: "CLEARED", label: `Cleared (${clearedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === tab.id
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-gray-100/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search alarm code or SN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* 3. Comprehensive Alarms Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-3">Alarm Code</th>
                <th className="py-3 px-4">Alarm Description</th>
                <th className="py-3 px-3">Device SN</th>
                <th className="py-3 px-3">Trigger Time</th>
                <th className="py-3 px-3">Recovery Time</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                    No alarms logged matching the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((alarm: any) => {
                  const isCleared =
                    alarm.status.toLowerCase().includes("cleared") ||
                    alarm.status.toLowerCase().includes("recovered") ||
                    alarm.status.toLowerCase().includes("resolved");
                  return (
                    <tr
                      key={alarm.id}
                      onClick={() => handleRowClick(alarm)}
                      className="hover:bg-emerald-50/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSeverityBadge(alarm.severity)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {alarm.alarmCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        <span className="flex items-center gap-1.5">
                          <span>{alarm.alarmName}</span>
                          {ignoredIds.has(alarm.id) && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200">
                              Ignored
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-600 font-medium whitespace-nowrap">
                        {alarm.deviceSn}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {alarm.beginTime}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                        {alarm.endTime || "--"}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {alarm.duration}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isCleared ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{alarm.status}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold animate-pulse">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>{alarm.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Operation Button with Ignore & Delete Popover matching reference */}
                      <td
                        className="py-3 px-4 text-center whitespace-nowrap relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-block relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === alarm.id ? null : alarm.id)
                            }
                            className={`px-3 py-1 rounded-lg border text-xs font-semibold active:scale-95 transition-all shadow-2xs ${
                              activeMenuId === alarm.id
                                ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                                : "border-gray-200 bg-white text-slate-700 hover:border-gray-300"
                            }`}
                          >
                            Operation
                          </button>

                          {/* Floating Popup Menu: Ignore and Delete */}
                          {activeMenuId === alarm.id && (
                            <div className="absolute right-0 top-full mt-1.5 w-28 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                              <button
                                onClick={() => toggleIgnore(alarm.id)}
                                className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition-colors"
                              >
                                <span>{ignoredIds.has(alarm.id) ? "Unignore" : "Ignore"}</span>
                                {ignoredIds.has(alarm.id) && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                              </button>
                              <button
                                onClick={() => deleteRecord(alarm.id)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alarm Detail Modal (fallback if onViewAlarmDetail not provided) */}
      <SolisAlarmDetailModal
        alarm={selectedAlarmForModal}
        isOpen={Boolean(selectedAlarmForModal)}
        onClose={() => setSelectedAlarmForModal(null)}
        onViewDevice={onViewDevice}
      />
    </div>
  );
}
