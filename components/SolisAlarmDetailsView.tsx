"use client";

import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  Copy,
  ExternalLink,
  RotateCw,
} from "lucide-react";

export interface AlarmDetailRecord {
  id: string | number;
  alarmCode: string;
  alarmContent: string;
  deviceType: string;
  deviceSn: string;
  plantName: string;
  plantId: string;
  owner?: string;
  contactEmail?: string;
  plantContact?: string;
  plantAddress?: string;
  alarmLevel: "Info" | "Warning" | "Critical";
  alarmStatus: "Active" | "Recovered";
  alarmDuration: string;
  startTime: string;
  recoveryTime?: string;
  handlingMethod?: string;
}

interface SolisAlarmDetailsViewProps {
  alarm: AlarmDetailRecord | null;
  onBack: () => void;
  onSelectPlantByName?: (plantName: string) => void;
  onSelectDevice?: (sn: string) => void;
}

export default function SolisAlarmDetailsView({
  alarm,
  onBack,
  onSelectPlantByName,
  onSelectDevice,
}: SolisAlarmDetailsViewProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"Details" | "History">("Details");

  // Default fallback data matching exact screenshot: media_1795238980789_0251e3e7.jpg
  const record: AlarmDetailRecord = alarm || {
    id: "ALM_01",
    alarmCode: "107D",
    alarmContent: "NO-Battery2 (107D)",
    deviceType: "Inverter",
    deviceSn: "1053050255210107",
    plantName: "P2G 50KW",
    plantId: "3212F1",
    owner: "Qasim Moosvi",
    contactEmail: "qasim.moosvi@gmail.com",
    plantContact: "--",
    plantAddress: "Ahbab Street, Korangi Industrial Area, Karachi, Sindh, Pakistan",
    alarmLevel: "Info",
    alarmStatus: "Active",
    alarmDuration: "1d 10h",
    startTime: "20/11/2026 00:26 (UTC+05:00)",
    recoveryTime: "--",
    handlingMethod:
      "1. Confirm battery settings: a) If no battery is connected to the inverter, set the battery type to \"No battery\". 2. Check battery status: a) Check if the battery is working properly or is not powered on. 3. Check the connection lines between the inverter and battery: a) Check the battery wiring breaker, battery circuit breaker, battery fuse, or the cable between the battery and inverter for disconnection or damage. 4. If the issue persists, contact customer service.",
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Determine handling advice dynamically if missing
  const handlingText =
    record.handlingMethod ||
    (record.alarmCode.includes("107C") || record.alarmContent.includes("UN-V-Batt2")
      ? "1. Check the battery system: a) Check if the battery wiring breaker has tripped or the connecting cable is damaged; b) Check if the battery type setting matches the battery in use; c) Check if the battery undervoltage protection value setting matches the battery specifications; if set too high, lower it according to the specs; d) Check if the battery is working properly and whether the actual voltage is below the undervoltage protection value. 2. If the issue persists, contact customer service."
      : record.alarmCode.includes("107D") || record.alarmContent.includes("NO-Battery2")
      ? "1. Confirm battery settings: a) If no battery is connected to the inverter, set the battery type to \"No battery\". 2. Check battery status: a) Check if the battery is working properly or is not powered on. 3. Check the connection lines between the inverter and battery: a) Check the battery wiring breaker, battery circuit breaker, battery fuse, or the cable between the battery and inverter for disconnection or damage. 4. If the issue persists, contact customer service."
      : record.alarmCode.includes("1015") || record.alarmContent.includes("NO-Grid")
      ? "1. Check AC Grid voltage and breaker: verify phase-to-neutral voltages (L1, L2, L3) are nominal ~230V. 2. Ensure distribution isolator switch is ON. 3. If grid power has restored, wait 300 seconds for auto-reconnection."
      : "1. Inspect device wiring and breakers. 2. Verify voltage and current within nominal ratings. 3. Contact Solis customer service if error persists.");

  return (
    <div className="bg-[#f5f7fa] min-h-screen text-slate-800 antialiased p-4 lg:p-6 space-y-4">
      {/* Top Breadcrumb & Action Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs hover:bg-slate-50 transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-500" />
            <span>Back</span>
          </button>
          <span className="text-slate-300">|</span>
          <h1 className="text-base font-bold text-slate-900">Alarm Details</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Alarm Ignored for 24 hours.")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            Ignore
          </button>
          <button
            onClick={() => alert("Alarm cleared from active list.")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Main Container Card matching exact SolisCloud UI Layout */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 lg:p-7 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Metadata Form (Cols 1-7) */}
          <div className="lg:col-span-7 space-y-4 text-xs">
            {/* Plant & SN Row */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Plant</span>
                <span
                  onClick={() => onSelectPlantByName && onSelectPlantByName(record.plantName)}
                  className="font-semibold text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5 mt-0.5"
                >
                  <span>{record.plantName}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#f37021]" />
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">SN</span>
                <span
                  onClick={() => onSelectDevice && onSelectDevice(record.deviceSn)}
                  className="font-mono font-semibold text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5 mt-0.5"
                >
                  <span>{record.deviceSn}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#f37021]" />
                </span>
              </div>
            </div>

            {/* Plant Contact & Owner */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Plant Contact</span>
                <span className="text-slate-700 font-medium">{record.plantContact || "--"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Owner</span>
                <span className="text-slate-800 font-semibold">{record.owner || "Qasim Moosvi"}</span>
              </div>
            </div>

            {/* Contact Email & Plant Address */}
            <div className="space-y-3">
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Contact Us</span>
                <span className="font-mono text-slate-800 font-medium">
                  {record.contactEmail || "qasim.moosvi@gmail.com"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Plant Address</span>
                <span className="text-[#f37021] font-medium flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f37021] shrink-0" />
                  <span>{record.plantAddress || "Ahbab Street, Korangi Industrial Area, Karachi, Sindh, Pakistan"}</span>
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              {/* Device Type & Alarm Content */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Device Type</span>
                  <span className="text-slate-800 font-semibold">{record.deviceType || "Inverter"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Alarm Content</span>
                  <span className="font-mono font-bold text-slate-900">{record.alarmContent}</span>
                </div>
              </div>

              {/* Alarm Level & Alarm Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Alarm Level</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    {record.alarmLevel || "Info"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Alarm Status</span>
                  <span
                    className={`font-semibold ${
                      record.alarmStatus === "Active" ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {record.alarmStatus}
                  </span>
                </div>
              </div>

              {/* Alarm Duration */}
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Alarm Duration</span>
                <span className="font-mono font-bold text-slate-800">{record.alarmDuration || "1d 10h"}</span>
              </div>

              {/* Start Time & Recovery Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Start Time</span>
                  <span className="font-mono text-slate-800">{record.startTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Recovery Time</span>
                  <span className="font-mono text-slate-600">{record.recoveryTime || "--"}</span>
                </div>
              </div>

              {/* Historical Alarm Link */}
              <div>
                <span className="text-slate-400 text-[11px] block font-medium">Historical alarm</span>
                <button
                  onClick={() => onBack()}
                  className="font-medium text-[#f37021] hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>View Records</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Map Canvas (Cols 8-12) */}
          <div className="lg:col-span-5 h-[340px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-2xs relative bg-slate-100">
            {/* Solis-styled Mapbox / Leaflet Mock View matching exact Google Map in screenshot */}
            <iframe
              title="Plant Location Map"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src="https://maps.google.com/maps?q=24.8427,67.1197&hl=en&z=15&output=embed"
            />
            {/* Solis Custom Pin Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-lg flex items-center justify-center animate-bounce">
                <MapPin className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Handling Method Card */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <h3 className="text-xs font-bold text-slate-800">Handling Method</h3>
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/70 text-xs text-slate-700 leading-relaxed font-normal">
            {handlingText}
          </div>
        </div>
      </div>
    </div>
  );
}
