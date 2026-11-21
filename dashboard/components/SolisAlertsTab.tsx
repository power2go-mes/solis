"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Info,
  AlertTriangle,
  Zap,
  BatteryCharging,
  Radio,
  Clock,
  ShieldCheck,
  X,
  AlertCircle,
} from "lucide-react";
import SolisAlarmDetailModal, { AlarmItem } from "./SolisAlarmDetailModal";

interface SolisAlertsTabProps {
  alertsData: any;
  isLoading?: boolean;
  onViewDevice?: (deviceSn: string) => void;
  onViewAlarmDetail?: (alarm: any) => void;
}

export default function SolisAlertsTab({
  alertsData,
  isLoading,
  onViewDevice,
  onViewAlarmDetail,
}: SolisAlertsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
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

  if (isLoading || !alertsData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Loading SolisCloud Alerts...</p>
      </div>
    );
  }

  const rawRecords = (alertsData.records || []).filter(
    (item: any) => !deletedIds.has(item.id)
  );

  const filtered = rawRecords.filter((alert: any) => {
    if (
      selectedCategory !== "ALL" &&
      alert.category?.toUpperCase() !== selectedCategory.toUpperCase()
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = alert.title?.toLowerCase().includes(q);
      const matchMessage = alert.message?.toLowerCase().includes(q);
      const matchSn = alert.deviceSn?.toLowerCase().includes(q);
      if (!matchTitle && !matchMessage && !matchSn) return false;
    }
    return true;
  });

  const handleRowClick = (item: any) => {
    const detail = {
      id: item.id,
      alarmCode: item.category === "Storage" ? "107D" : "1055",
      alarmContent: item.title,
      deviceType: "Inverter",
      deviceSn: item.deviceSn,
      plantName: item.plantName || "Towfiq chinoy",
      plantId: item.plantId || "",
      alarmLevel: "Info" as const,
      alarmStatus: "Active" as const,
      alarmDuration: "<1h",
      startTime: item.timestamp || "",
      recoveryTime: "--",
      handlingMethod:
        item.message ||
        "1. Confirm battery/device parameter settings. 2. Verify communication cable.",
    };

    if (onViewAlarmDetail) {
      onViewAlarmDetail(detail);
    } else {
      setSelectedAlarmForModal({
        id: item.id,
        alarmCode: detail.alarmCode,
        alarmName: item.title,
        severity: "Notice",
        deviceSn: item.deviceSn,
        plantName: detail.plantName,
        beginTime: item.timestamp || "",
        endTime: undefined,
        duration: "<1h",
        status: "Active",
        advice: detail.handlingMethod,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Pills & Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {["ALL", "GENERATION", "STORAGE", "FIRMWARE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                selectedCategory === cat
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-gray-100/70"
              }`}
            >
              {cat === "ALL" ? `All Alerts (${rawRecords.length})` : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Bell className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time Operational Broadcasts Active</span>
        </div>
      </div>

      {/* 2. Alerts Table with Operation (Ignore / Delete) and Row Click */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-3">Level</th>
                <th className="py-3 px-4">Alert Title</th>
                <th className="py-3 px-3">Device SN</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-4 text-center">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No active operational notices matching this filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item)}
                    className="hover:bg-emerald-50/20 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-slate-700 font-mono text-[10px] font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        <Info className="w-3 h-3 text-emerald-600" />
                        <span>Info</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                      <span className="flex items-center gap-1.5">
                        <span>{item.title}</span>
                        {ignoredIds.has(item.id) && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-500 border border-gray-200">
                            Ignored
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-600 font-medium whitespace-nowrap">
                      {item.deviceSn}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs line-clamp-1 max-w-[280px]">
                      {item.message}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap text-[11px]">
                      {item.timestamp}
                    </td>

                    {/* Operation Button with Ignore & Delete Popover */}
                    <td
                      className="py-3 px-4 text-center whitespace-nowrap relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-block relative">
                        <button
                          onClick={() =>
                            setActiveMenuId(activeMenuId === item.id ? null : item.id)
                          }
                          className={`px-3 py-1 rounded-lg border text-xs font-semibold active:scale-95 transition-all shadow-2xs ${
                            activeMenuId === item.id
                              ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                              : "border-gray-200 bg-white text-slate-700 hover:border-gray-300"
                          }`}
                        >
                          Operation
                        </button>

                        {/* Floating Popup Menu: Ignore and Delete */}
                        {activeMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-28 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={() => toggleIgnore(item.id)}
                              className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between transition-colors"
                            >
                              <span>{ignoredIds.has(item.id) ? "Unignore" : "Ignore"}</span>
                              {ignoredIds.has(item.id) && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteRecord(item.id)}
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
                ))
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
