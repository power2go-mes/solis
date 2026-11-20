"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface SolisAlarmsTabProps {
  alarmsData: any;
  isLoading?: boolean;
}

export default function SolisAlarmsTab({ alarmsData, isLoading }: SolisAlarmsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedAlarmId, setExpandedAlarmId] = useState<number | null>(null);

  if (isLoading || !alarmsData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Loading SolisCloud Alarm Records...</p>
      </div>
    );
  }

  const rawRecords = alarmsData.records || [];
  const filtered = rawRecords.filter((a: any) => {
    if (statusFilter !== "ALL") {
      const isCleared = a.status.toLowerCase().includes("cleared") || a.status.toLowerCase().includes("recovered") || a.status.toLowerCase().includes("resolved");
      if (statusFilter === "ACTIVE" && isCleared) return false;
      if (statusFilter === "CLEARED" && !isCleared) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = String(a.alarmCode || "").toLowerCase().includes(q);
      const nameMatch = String(a.alarmName || "").toLowerCase().includes(q);
      const snMatch = String(a.deviceSn || "").toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !snMatch) return false;
    }
    return true;
  });

  const getSeverityBadge = (level: string) => {
    const l = (level || "").toLowerCase();
    if (l.includes("warn") || l.includes("crit") || l.includes("major")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-50 text-[#f37021] border border-orange-200 text-[10px] font-bold">
          <AlertTriangle className="w-3 h-3 text-[#f37021]" />
          <span>Warning</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
        <Info className="w-3 h-3 text-emerald-600" />
        <span>Notice</span>
      </span>
    );
  };

  const activeCount = rawRecords.filter((a: any) => !a.status.toLowerCase().includes("cleared") && !a.status.toLowerCase().includes("recovered") && !a.status.toLowerCase().includes("resolved")).length;
  const clearedCount = rawRecords.length - activeCount;

  return (
    <div className="space-y-4">
      {/* 1. Top Alarm KPI Summary Cards (Strictly White, Orange, Green, Black) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Alarms */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Logged Alarms
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">
              {alarmsData.total || rawRecords.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-slate-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Active Alarms (Orange highlight) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Alarms
            </span>
            <p className="text-2xl font-black text-[#f37021] font-mono mt-1">
              {activeCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Cleared Alarms (Green highlight) */}
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

      {/* 2. Filter Bar & Search Input (Strictly White, Orange, Green, Black) */}
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
          <table className="w-full text-left border-collapse text-xs">
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
                <th className="py-3 px-3 text-right">Guidance</th>
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
                  const isExpanded = expandedAlarmId === alarm.id;
                  const isCleared = alarm.status.toLowerCase().includes("cleared") || alarm.status.toLowerCase().includes("recovered") || alarm.status.toLowerCase().includes("resolved");
                  return (
                    <React.Fragment key={alarm.id}>
                      <tr className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getSeverityBadge(alarm.severity)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {alarm.alarmCode}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {alarm.alarmName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-[#f37021] border border-orange-200 text-[10px] font-semibold animate-pulse">
                              <AlertCircle className="w-3 h-3 text-[#f37021]" />
                              <span>{alarm.status}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setExpandedAlarmId(isExpanded ? null : alarm.id)}
                            className="p-1 rounded hover:bg-gray-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title={isExpanded ? "Hide Guidance" : "Show SolisCloud Guidance"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Official SolisCloud Troubleshooting Guidance */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/20 border-b border-gray-100">
                          <td colSpan={9} className="py-3 px-4 text-xs">
                            <div className="flex items-start gap-2 text-slate-700">
                              <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-slate-900 block mb-0.5">
                                  Official SolisCloud Troubleshooting Guidance:
                                </span>
                                <p className="text-slate-600 leading-relaxed font-sans">
                                  {alarm.advice}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
