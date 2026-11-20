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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading SolisCloud Alarm Records...</p>
      </div>
    );
  }

  const rawRecords = alarmsData.records || [];
  const filtered = rawRecords.filter((a: any) => {
    if (statusFilter !== "ALL" && a.status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const codeMatch = a.alarmCode?.toLowerCase().includes(q);
      const nameMatch = a.alarmName?.toLowerCase().includes(q);
      const snMatch = a.deviceSn?.toLowerCase().includes(q);
      if (!codeMatch && !nameMatch && !snMatch) return false;
    }
    return true;
  });

  const getSeverityBadge = (level: string) => {
    const l = (level || "").toLowerCase();
    if (l === "critical") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span>Critical</span>
        </span>
      );
    }
    if (l === "major") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          <span>Major</span>
        </span>
      );
    }
    if (l === "minor") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200 text-[10px] font-semibold">
          <AlertTriangle className="w-3 h-3 text-yellow-600" />
          <span>Minor</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold">
        <Info className="w-3 h-3 text-blue-500" />
        <span>Info</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Alarm Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Logged Alarms</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{alarmsData.total || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-slate-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Active Alarms</span>
            <p className="text-2xl font-black text-rose-600 font-mono mt-0.5">{alarmsData.active || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Cleared / Normal</span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-0.5">{alarmsData.cleared || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Controls & Search Filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {["ALL", "ACTIVE", "CLEARED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-gray-100/70"
              }`}
            >
              {st === "ALL" ? "All Alarms" : st === "ACTIVE" ? "Active (0)" : "Cleared"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search alarm code or SN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:bg-white focus:outline-emerald-500 transition-all font-mono"
          />
        </div>
      </div>

      {/* 3. Detailed Alarms Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No matching alarms found</p>
            <p className="mt-0.5">The solar plant and all inverter protective devices are operating normally.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
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
                {filtered.map((alarm: any) => {
                  const isExp = expandedAlarmId === alarm.id;
                  return (
                    <React.Fragment key={alarm.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">{getSeverityBadge(alarm.severity)}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {alarm.alarmCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">{alarm.alarmName}</td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">{alarm.deviceSn}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{alarm.beginTime}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{alarm.endTime || "-"}</td>
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{alarm.duration}</td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              alarm.status === "Active"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            {alarm.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setExpandedAlarmId(isExp ? null : alarm.id)}
                            className="p-1 hover:bg-gray-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="View Troubleshooting Guidance"
                          >
                            {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-emerald-50/30">
                          <td colSpan={9} className="p-4 border-t border-emerald-100/60">
                            <div className="flex items-start gap-2.5">
                              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="text-xs">
                                <span className="font-bold text-emerald-900 block mb-0.5">
                                  SolisCloud Official Troubleshooting Guidance:
                                </span>
                                <p className="text-slate-700 leading-relaxed">{alarm.advice}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
