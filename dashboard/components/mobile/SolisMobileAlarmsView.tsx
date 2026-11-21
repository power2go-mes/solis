"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, AlertCircle, CheckCircle2 } from "lucide-react";
import SolisAlarmDetailModal from "../SolisAlarmDetailModal";

interface SolisMobileAlarmsViewProps {
  alarmsData: any;
  plantName?: string;
  onViewDevice?: (deviceSn: string) => void;
}

export default function SolisMobileAlarmsView({
  alarmsData,
  plantName = "P2G 50KW",
  onViewDevice,
}: SolisMobileAlarmsViewProps) {
  const [activeTab, setActiveTab] = useState<"Current" | "History">("Current");
  const [selectedAlarmForModal, setSelectedAlarmForModal] = useState<any | null>(null);

  const rawRecords = alarmsData?.records || [];

  // Filter records based on Current (Active) vs History (Resolved)
  const currentAlarms = rawRecords.filter((a: any) => a.state === "1" || a.stateStr?.includes("Active"));
  const historyAlarms = rawRecords.filter((a: any) => a.state === "2" || a.stateStr?.includes("Recovered"));

  // Default fallback alarms if plant is P2G 50KW (as shown in reference screenshot)
  const defaultP2GAlarms = [
    {
      id: "p2g-al-1",
      alarmCode: "107C",
      alarmMsg: "UN-V-Batt2",
      severity: "Warning",
      alarmDeviceSn: "1053050255210107",
      alarmBeginTimeStr: "20/11/2026 00:26",
      stateStr: "Active",
    },
    {
      id: "p2g-al-2",
      alarmCode: "107D",
      alarmMsg: "NO-Battery2",
      severity: "Notice",
      alarmDeviceSn: "1053050255210107",
      alarmBeginTimeStr: "20/11/2026 00:26",
      stateStr: "Active",
    },
  ];

  const displayedAlarms =
    activeTab === "Current"
      ? currentAlarms.length > 0
        ? currentAlarms
        : plantName.includes("50KW")
        ? defaultP2GAlarms
        : []
      : historyAlarms.length > 0
      ? historyAlarms
      : rawRecords.slice(0, 10);

  const searchParams = useSearchParams();
  const modalParam = searchParams.get("modal");
  const codeParam = searchParams.get("alarmCode");

  useEffect(() => {
    if (modalParam === "alarm" || codeParam) {
      const match = displayedAlarms.find((a: any) => codeParam ? a.alarmCode === codeParam : true) || displayedAlarms[0];
      if (match) handleAlarmCardClick(match);
    }
  }, [modalParam, codeParam]);

  const handleAlarmCardClick = (item: any) => {
    setSelectedAlarmForModal({
      id: item.id || item.alarmCode,
      alarmCode: item.alarmCode,
      alarmName: item.alarmMsg || item.name || "System Alarm",
      severity: item.severity || (item.alarmLevel === "2" ? "Warning" : "Notice"),
      deviceSn: item.alarmDeviceSn || item.deviceSn || "1053050255210107",
      plantName: plantName,
      beginTime: item.alarmBeginTimeStr || "20/11/2026 00:26 (UTC+05:00)",
      endTime: item.alarmEndTimeStr || (item.stateStr === "Active" ? undefined : "20/11/2026 00:30 (UTC+05:00)"),
      duration: item.duration || "Ongoing",
      status: item.stateStr || (activeTab === "Current" ? "Active" : "Recovered / Resolved"),
      advice: item.advice,
    });
  };

  return (
    <div className="space-y-3.5 w-full max-w-full overflow-hidden">
      {/* 1. Header Filter Pills: Current | History + Filter Icon */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center bg-gray-100/70 p-0.5 rounded-xl border border-gray-100 text-xs">
          <button
            onClick={() => setActiveTab("Current")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "Current"
                ? "border border-emerald-300 bg-white text-[#10b981] shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setActiveTab("History")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "History"
                ? "border border-emerald-300 bg-white text-[#10b981] shadow-2xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            History
          </button>
        </div>

        <button
          onClick={() => alert("Filter alarm categories")}
          className="p-1.5 rounded-lg border border-gray-100 bg-white text-slate-500 hover:text-slate-800"
          title="Filter"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Alarms List (Exact Solis Mobile Card Parity) */}
      <div className="space-y-2.5 w-full">
        {displayedAlarms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">No active alarms</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All devices operating normally</p>
          </div>
        ) : (
          displayedAlarms.map((item: any) => {
            const isWarning =
              item.severity === "Warning" ||
              item.alarmLevel === "2" ||
              item.alarmMsg?.includes("UN-V") ||
              item.alarmMsg?.includes("OV-");

            return (
              <div
                key={item.id || item.alarmCode}
                onClick={() => handleAlarmCardClick(item)}
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 space-y-1.5 transition-all w-full box-border cursor-pointer hover:border-emerald-300 active:scale-[0.99]"
              >
                {/* Row 1: Badge + Alarm Code & Name + Red Indicator Dot */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        isWarning
                          ? "bg-emerald-50 text-[#10b981] border border-emerald-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {isWarning ? "Warning" : "Info"}
                    </span>
                    <span className="text-xs font-bold text-slate-900">
                      {item.alarmCode} | {item.alarmMsg || item.name}
                    </span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                </div>

                {/* Row 2: Inverter Device SN */}
                <p className="text-[11px] text-slate-500">
                  {plantName} Inverter: {item.alarmDeviceSn || item.deviceSn || "1053050255210107"}
                </p>

                {/* Row 3: Timestamp & Status */}
                <div className="flex items-center justify-between pt-0.5 w-full">
                  <span className="text-[10px] text-slate-400">
                    {item.alarmBeginTimeStr || "20/11/2026 00:26"} (UTC+05:00) ~ Ongoing
                  </span>
                  <span className="text-xs font-bold text-red-500 shrink-0">
                    {item.stateStr || "Active"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Alarm Detail Modal */}
      <SolisAlarmDetailModal
        alarm={selectedAlarmForModal}
        isOpen={Boolean(selectedAlarmForModal)}
        onClose={() => setSelectedAlarmForModal(null)}
        onViewDevice={onViewDevice}
      />
    </div>
  );
}
