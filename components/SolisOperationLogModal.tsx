"use client";

import React, { useState } from "react";
import { X, Search, Clock, CheckCircle2, RefreshCw, Sliders, Shield, Terminal, ArrowDownCircle } from "lucide-react";

interface SolisOperationLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantName?: string;
}

export default function SolisOperationLogModal({
  isOpen,
  onClose,
  plantName = "Towfiq chinoy",
}: SolisOperationLogModalProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!isOpen) return null;

  const logs = [
    {
      id: "LOG-1092",
      timestamp: "20/11/2026 13:31:36 (UTC+05:00)",
      category: "SYNC",
      operator: "Solis Telemetry Service",
      action: "10-Minute High-Precision Inverter & Meter Telemetry Sync",
      detail: "Synced 699 curve points, BMS status 100% SOC, inverter active power verified.",
      result: "Success",
    },
    {
      id: "LOG-1091",
      timestamp: "20/11/2026 12:49:51 (UTC+05:00)",
      category: "CONTROL",
      operator: "Qasim Moosvi (Engineer)",
      action: "Export Power Limitation Setting Verified",
      detail: "Feed-in grid mode confirmed as Maximum Export (100% rated capacity enabled).",
      result: "Success",
    },
    {
      id: "LOG-1090",
      timestamp: "20/11/2026 11:06:20 (UTC+05:00)",
      category: "METER",
      operator: "Solis Modbus Poller",
      action: "Eastron SDM630 Smart Meter Query",
      detail: "Import energy counters updated: 28.72 kWh daily, active power 0 kW, voltage nominal.",
      result: "Success",
    },
    {
      id: "LOG-1089",
      timestamp: "20/11/2026 09:15:00 (UTC+05:00)",
      category: "ALARM",
      operator: "Automated Safety Monitor",
      action: "Alarm Self-Recovery Verified: F01A",
      detail: "AC grid frequency synchronized within 49.92 Hz IEC limits; safety timer cleared.",
      result: "Success",
    },
    {
      id: "LOG-1088",
      timestamp: "19/11/2026 20:12:52 (UTC+05:00)",
      category: "SYSTEM",
      operator: "Solis Background Daemon",
      action: "Comprehensive Day-1 to Today Energy Audit",
      detail: "Backfilled 8 plants historical energy yield; zero gap validation passed.",
      result: "Success",
    },
    {
      id: "LOG-1087",
      timestamp: "18/11/2026 16:01:24 (UTC+05:00)",
      category: "COMMISSION",
      operator: "Installer (Sunhancee)",
      action: "Plant Commissioning & DataLogger Bind",
      detail: "Bound Inverter 1053050258180112 to Collector 7A12580709004122. Grid connected.",
      result: "Success",
    },
  ];

  const filtered = logs.filter((log) => {
    if (filterType !== "ALL" && log.category !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-[#fafbfc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Operation Log</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-[#f37021] font-semibold border border-orange-200">
                  {plantName}
                </span>
              </div>
              <p className="text-xs text-slate-500">Chronological telemetry sync, device commands, and event history</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {["ALL", "SYNC", "CONTROL", "METER", "ALARM", "COMMISSION"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterType(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === cat
                    ? "bg-orange-50 text-[#f37021] border border-orange-300 font-bold"
                    : "text-slate-600 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search operation logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>
        </div>

        {/* Logs Timeline */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 divide-y divide-gray-100">
          {filtered.map((log) => (
            <div key={log.id} className="pt-3 first:pt-0 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{log.id}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-slate-700">
                    {log.category}
                  </span>
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{log.result}</span>
                  </span>
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-[11px] font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{log.timestamp}</span>
                </div>
              </div>

              <div className="font-semibold text-slate-800">{log.action}</div>
              <div className="text-slate-500 leading-relaxed text-[11px]">{log.detail}</div>
              <div className="text-[11px] text-slate-400">
                Operator: <span className="text-slate-700 font-medium">{log.operator}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#fafbfc] border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">Showing {filtered.length} audited operations</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-black font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
