"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { PlantInfo, TelemetryLatest, AlarmRecord } from "@/lib/types";
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertOctagon,
  Calendar,
} from "lucide-react";

function AlarmsContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    if (stationIdParam && stationIdParam !== stationId) {
      setStationId(stationIdParam);
    }
  }, [stationIdParam]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plantsRes, telRes, alarmsRes] = await Promise.all([
          fetch("/api/plants"),
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(
            `/api/alarms?stationId=${stationId}&severity=${severityFilter}&state=${stateFilter}&search=${encodeURIComponent(
              searchQuery
            )}&page=${page}&limit=50`
          ),
        ]);

        const pData = await plantsRes.json();
        const tData = await telRes.json();
        const aData = await alarmsRes.json();

        if (pData.success) setPlants(pData.plants);
        if (tData.success && tData.hasData) setTelemetry(tData.telemetry);
        else setTelemetry(null);

        if (aData.success) {
          setAlarms(aData.records);
          setTotal(aData.total);
        } else {
          setAlarms([]);
          setTotal(0);
        }
      } catch (err) {
        console.error("Error loading alarms:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [stationId, severityFilter, stateFilter, searchQuery, page]);

  const currentPlant = plants.find((p) => p.id === stationId);

  // Calculate frequency counts by alarm code
  const codeFrequency = React.useMemo(() => {
    const map = new Map<string, { count: number; msg: string; desc: string; level: string }>();
    alarms.forEach((a) => {
      const existing = map.get(a.alarm_code);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(a.alarm_code, {
          count: 1,
          msg: a.alarm_msg,
          desc: a.protection_desc,
          level: a.alarm_level,
        });
      }
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [alarms]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentStationId={stationId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          plants={plants}
          currentPlant={currentPlant}
          telemetry={telemetry}
          onPlantChange={(newId) => setStationId(newId)}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Page Title */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alarms, Trips & Protection Event Logs
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical fault records, duration tracking, severity classification, and recurring fault diagnostics
            </p>
          </div>

          {/* Recurring Fault Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Total Alarms</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">{total}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Recorded in Supabase</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Active Faults</span>
              <span className="text-2xl font-black text-rose-600 font-mono mt-1 block">
                {alarms.filter((a) => a.state === "0" || !a.alarm_end_time).length}
              </span>
              <span className="text-[11px] text-rose-600 font-medium mt-1 block">Requires Clearance</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Most Frequent Fault</span>
              <span className="text-lg font-black text-amber-700 font-mono mt-1 block truncate">
                {codeFrequency[0] ? `${codeFrequency[0][0]} (${codeFrequency[0][1].msg})` : "None"}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Occurred {codeFrequency[0]?.[1]?.count || 0} times
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">Utility Grid Trips</span>
              <span className="text-2xl font-black text-blue-600 font-mono mt-1 block">
                {alarms.filter((a) => a.alarm_code === "1015" || a.alarm_code === "1011").length}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">1015 NO-Grid / 1011 Sag</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search code, message, or description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden"
              >
                <option value="">All Severities</option>
                <option value="1">Level 1 (Notice / Warning)</option>
                <option value="2">Level 2 (Alarm / Fault)</option>
                <option value="3">Level 3 (Critical Emergency)</option>
              </select>

              {/* Status Filter */}
              <select
                value={stateFilter}
                onChange={(e) => {
                  setStateFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="0">Active Only</option>
                <option value="1">Resolved / Recovered</option>
              </select>
            </div>
          </div>

          {/* Alarms Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code & Fault</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Device SN</th>
                    <th className="py-3 px-3">Start Time (PKT)</th>
                    <th className="py-3 px-3">End Time (PKT)</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alarms.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No alarm records matching filter criteria
                      </td>
                    </tr>
                  ) : (
                    alarms.map((al) => {
                      const isActive = al.state === "0" || !al.alarm_end_time;

                      return (
                        <tr key={al.id || al.alarm_pk} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                {al.alarm_code}
                              </span>
                              <div>
                                <span className="font-bold text-slate-800">{al.alarm_msg}</span>
                                {al.protection_desc && (
                                  <div className="text-[10px] text-slate-500">{al.protection_desc}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                al.alarm_level === "3"
                                  ? "bg-rose-100 text-rose-800"
                                  : al.alarm_level === "2"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              Level {al.alarm_level}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-medium">
                            {al.protection_category || "SYSTEM"}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                            {al.device_sn}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                            {al.alarm_begin_time_str || al.alarm_begin_time?.slice(0, 16).replace("T", " ") || "N/A"}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {al.alarm_end_time_str || (al.alarm_end_time ? al.alarm_end_time.slice(0, 16).replace("T", " ") : "—")}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-700 font-medium">
                            {al.alarm_duration_str || (isActive ? "Ongoing" : "<1h")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isActive ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Recovered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AlarmsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Alarm Logs...</div>}>
      <AlarmsContent />
    </Suspense>
  );
}
