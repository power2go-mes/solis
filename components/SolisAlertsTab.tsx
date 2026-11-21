"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface SolisAlertsTabProps {
  alertsData: any;
  isLoading?: boolean;
}

export default function SolisAlertsTab({ alertsData, isLoading }: SolisAlertsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  if (isLoading || !alertsData) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Loading SolisCloud Alerts...</p>
      </div>
    );
  }

  const records = alertsData.records || [];
  const filtered = records.filter((alert: any) => {
    if (selectedCategory !== "ALL" && alert.category.toUpperCase() !== selectedCategory.toUpperCase()) {
      return false;
    }
    return true;
  });

  const getCategoryIcon = (cat: string) => {
    const c = (cat || "").toLowerCase();
    if (c === "generation") return <Zap className="w-4 h-4 text-[#10b981]" />;
    if (c === "storage") return <BatteryCharging className="w-4 h-4 text-emerald-600" />;
    return <ShieldCheck className="w-4 h-4 text-slate-700" />;
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Filter Pills (Strictly White, Orange, Green, Black) */}
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
              {cat === "ALL" ? `All Alerts (${records.length})` : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Bell className="w-3.5 h-3.5 text-emerald-600" />
          <span>Real-time Operational Broadcasts Active</span>
        </div>
      </div>

      {/* 2. Alerts Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center text-xs text-slate-400">
            No active operational notices matching this filter.
          </div>
        ) : (
          filtered.map((item: any) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-gray-200"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  {getCategoryIcon(item.category)}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                    {item.severity === "Notice" ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[#10b981] border border-emerald-200 text-[10px] font-semibold">
                        Notice
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                        Normal
                      </span>
                    )}
                    <span className="px-2 py-0.2 rounded bg-gray-100 text-slate-600 text-[10px] font-mono">
                      {item.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                    <span>Device: {item.deviceSn}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono shrink-0 self-end sm:self-center">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.timestamp}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
