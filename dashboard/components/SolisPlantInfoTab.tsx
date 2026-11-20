"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  RotateCw,
  Copy,
  Edit2,
  Info,
  Check,
} from "lucide-react";

interface SolisPlantInfoTabProps {
  info: any;
  isLoading?: boolean;
}

export default function SolisPlantInfoTab({ info, isLoading }: SolisPlantInfoTabProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  };

  if (isLoading || !info) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-12 text-center">
        <div className="w-8 h-8 border-2 border-[#f37021] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading SolisCloud Plant Information...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-5 sm:p-7">
      {/* 1. Header Bar: Info Badge, SNO / ID, Timestamp, Modify Information Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
              Info
            </span>
            <span className="text-xs text-slate-400">--</span>
            <button
              onClick={() => window.location.reload()}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title="Refresh"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>ID: {info.sno || info.id}</span>
            <span>|</span>
            <span>🕒 {info.plantCreationTime || "20/11/2026 12:49:51 (UTC+05:00)"} 1Min Ago</span>
          </div>
        </div>

        <div>
          <button
            onClick={() => alert("Modify Information is managed via SolisCloud Organization Portal.")}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-normal text-slate-700 hover:bg-gray-50 transition-all shadow-2xs active:scale-95"
          >
            Modify Information
          </button>
        </div>
      </div>

      {/* 2. Main 2-Column Content: Left Details & Right Photo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column (65% width / 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Basic Information */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">Basic Information</h3>
            <div className="space-y-3 text-xs">
              {/* Plant Name */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Plant Name</span>
                <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5 font-medium text-slate-900">
                  <span>{info.name}</span>
                  <button
                    onClick={() => handleCopy(info.name, "name")}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    title="Copy Name"
                  >
                    {copiedKey === "name" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Plant Type */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Plant Type</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.plantType || "Residential Plant"}
                </span>
              </div>

              {/* PV Capacity */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">PV Capacity</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.capacityKwp}kWp
                </span>
              </div>

              {/* Number of Modules */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Number of Modules</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.modulesCount || 46}
                </span>
              </div>

              {/* Capacity per Modules */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Capacity per Modules</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.modulePowerW || 645}W
                </span>
              </div>

              {/* Battery Capacity */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Battery Capacity</span>
                <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5 font-medium text-slate-900 font-mono">
                  <span>{info.batteryCapacityKwh || 52}kWh</span>
                  <button
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    title="Edit Battery Capacity"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Time Zone */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Time Zone</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.timeZone || "(UTC +05:00) Asia/Karachi"}
                </span>
              </div>

              {/* Platform Connection Date */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <span>Platform Connection Date</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.platformConnectDate || "18/11/2026"}
                </span>
              </div>

              {/* Grid Connection Date */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <span>Grid Connection Date</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.gridConnectDate || "19/11/2026"}
                </span>
              </div>

              {/* Plant creation time */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <span>Plant creation time</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.plantCreationTime || "18/11/2026 16:01:24 (UTC +05:00)"}
                </span>
              </div>

              {/* Plant Address */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Plant Address</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.address || "--"}
                </span>
              </div>

              {/* Assigned Organization */}
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Assigned Organization</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.assignedOrg || "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section 2: Tariff Management */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Tariff Management</h3>
              <button className="text-xs text-[#f37021] hover:underline font-normal">
                View More &gt;
              </button>
            </div>

            <div className="space-y-3">
              {/* Purchase Tariff Box */}
              <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[10px]">
                    ↺
                  </span>
                  <span>Purchase Tariff</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 text-xs">
                  <span className="text-slate-500">Tariff Source</span>
                  <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                    {info.tariff?.purchaseTariffSource || "--"}
                  </span>
                </div>
              </div>

              {/* Feed-in Tariff Box */}
              <div className="bg-[#f8fafc] rounded-xl p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center text-[10px]">
                    ↻
                  </span>
                  <span>Feed-in Tariff</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="grid grid-cols-3 sm:grid-cols-4">
                    <span className="text-slate-500">Tariff Source</span>
                    <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                      {info.tariff?.feedInTariffSource || "Fixed Tariff"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4">
                    <span className="text-slate-500">Feed-in Tariff</span>
                    <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                      {info.tariff?.feedInTariffPrice || "0PKR/kWh"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section 3: O&M Info */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">O&amp;M Info</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500 flex items-center gap-1">
                  <span>Organization Code</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.orgCode || "AE7229"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Installer&apos;s Email</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.installerEmail || "--"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Installer&apos;s Phone</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.installerPhone || "--"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Grid Connection Type</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.gridConnectionType || "Maximum Export"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Plant Contact</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.plantContact || "--"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Module Number</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900">
                  {info.moduleNumber || "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Section 4: More Info */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4">More Info</h3>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Azimuth</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.azimuth || "0°"}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 items-center">
                <span className="text-slate-500">Tilt</span>
                <span className="col-span-2 sm:col-span-3 font-medium text-slate-900 font-mono">
                  {info.tilt || "30°"}
                </span>
              </div>

              {["Remark 1", "Remark 2", "Remark 3"].map((rem, idx) => (
                <div key={rem} className="grid grid-cols-3 sm:grid-cols-4 items-center">
                  <span className="text-slate-500">{rem}</span>
                  <div className="col-span-2 sm:col-span-3 flex items-center gap-1.5 font-medium text-slate-900">
                    <span>--</span>
                    <button
                      onClick={() => handleCopy("--", `rem-${idx}`)}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title="Copy"
                    >
                      {copiedKey === `rem-${idx}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (35% width / 4 cols): Real Physical Installation Photo */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-3">
            <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 aspect-[16/10] relative">
              <Image
                src="/images/solis_plant_room.jpg"
                alt="Physical Plant Installation"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="text-[11px] text-slate-400 text-center">
              Physical Site Installation Room (Inverter &amp; Battery Bank)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
