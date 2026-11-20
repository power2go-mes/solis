"use client";

import React from "react";
import {
  MapPin,
  Calendar,
  Zap,
  ShieldCheck,
  User,
  Mail,
  Building,
  Compass,
  Sun,
  Leaf,
  TreePine,
  CheckCircle2,
  Flame,
} from "lucide-react";

interface SolisPlantInfoTabProps {
  info: any;
  isLoading?: boolean;
}

export default function SolisPlantInfoTab({ info, isLoading }: SolisPlantInfoTabProps) {
  if (isLoading || !info) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-600 font-medium">Loading SolisCloud Plant Information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Overview Banner (Strictly White / Black / Green / Orange) */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-2xs p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{info.status || "Online"}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">ID: {info.id}</span>
            <span className="text-xs text-slate-300">|</span>
            <span className="text-xs text-slate-500 font-mono font-medium">SNO: {info.sno}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {info.name}
          </h2>

          <p className="text-xs text-slate-600 flex items-center gap-1.5 pt-0.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{info.address}</span>
          </p>
        </div>

        {/* Highlight KPI Pills: Capacity & Active Days */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 min-w-[130px] text-center">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
              Installed Capacity
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
              {info.capacityKwp} <span className="text-xs font-semibold text-slate-500">kWp</span>
            </p>
          </div>

          <div className="bg-orange-50/50 border border-orange-200/80 rounded-xl p-3 min-w-[130px] text-center">
            <span className="text-[10px] text-[#f37021] font-bold uppercase tracking-wider block">
              Active Operating Days
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono mt-0.5">
              {info.generateDays} <span className="text-xs font-semibold text-slate-500">Days</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Four Main Detailed Grids (Strictly White, Orange, Green, Black) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: General & System Specifications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Specifications</h3>
              <p className="text-[11px] text-slate-500">Topology and operational configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">System Type</span>
              <p className="font-semibold text-slate-900 mt-0.5">{info.systemType}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Installed Capacity</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.capacityKwp} kWp</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Roof Mounting</span>
              <p className="font-semibold text-slate-900 mt-0.5">{info.roofType}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Commissioning Date</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.connectTimeStr}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Inverter Quantity</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">2 Units (Hybrid Storage)</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Energy Storage</span>
              <p className="font-semibold text-emerald-700 mt-0.5 font-mono">HV LiFePO4 Connected</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Grid Connection</span>
              <p className="font-semibold text-emerald-700 mt-0.5">3-Phase 400V Synchronized</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Accounting Currency</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">PKR ({info.currency})</p>
            </div>
          </div>
        </div>

        {/* Card 2: Geographical Location */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Geographical Location</h3>
              <p className="text-[11px] text-slate-500">Solar azimuth, inclination angles & GPS coordinates</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Full Installation Address</span>
              <p className="font-semibold text-slate-900 mt-0.5">{info.address}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100/70">
              <div>
                <span className="text-slate-500 font-medium">City / Province</span>
                <p className="font-semibold text-slate-900 mt-0.5">{info.city}, {info.region}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Country / Region</span>
                <p className="font-semibold text-slate-900 mt-0.5">{info.country}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">GPS Coordinates</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.latitude}° N, {info.longitude}° E</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Timezone</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.timeZone}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Azimuth Angle</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.azimuthStr}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Tilt Angle (Dip)</span>
                <p className="font-semibold text-slate-900 mt-0.5 font-mono">{info.dipStr}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Stakeholders & Organization */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#f37021] border border-orange-200/60 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stakeholder & Organization</h3>
              <p className="text-[11px] text-slate-500">Ownership, EPC installer, and grid agency</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Plant Owner</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{info.owner}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Registered Contact</span>
              <p className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1 truncate font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{info.email}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">EPC Installer / Service</span>
              <p className="font-semibold text-slate-900 mt-0.5">{info.installer}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Grid Distributor / Agent</span>
              <p className="font-semibold text-slate-900 mt-0.5">{info.gridAgent}</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Cloud Data Platform</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">SolisCloud Global (API v5)</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Telemetry Protocol</span>
              <p className="font-semibold text-slate-900 mt-0.5 font-mono">Modbus TCP / MQTT</p>
            </div>
          </div>
        </div>

        {/* Card 4: Environmental Savings & Lifetime Generation */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Environmental Savings</h3>
              <p className="text-[11px] text-slate-500">Carbon offset and clean energy generation totals</p>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
              <div className="text-xs text-emerald-800 font-semibold mb-1 flex items-center justify-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                <span>CO2 Avoided</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {info.avoidedCo2Ton} <span className="text-xs font-normal text-slate-500">t</span>
              </p>
            </div>

            <div className="p-3 rounded-lg bg-orange-50/50 border border-orange-200/80">
              <div className="text-xs text-orange-800 font-semibold mb-1 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#f37021]" />
                <span>Coal Saved</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {info.avoidedCoalTon} <span className="text-xs font-normal text-slate-500">t</span>
              </p>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
              <div className="text-xs text-emerald-800 font-semibold mb-1 flex items-center justify-center gap-1">
                <TreePine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Trees Equivalent</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                {info.treesPlanted}
              </p>
            </div>
          </div>

          {/* Cumulative Energy Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-gray-100 font-mono">
            <div>
              <span className="text-slate-500 font-medium">Cumulative Lifetime Yield</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{info.allEnergyMwh} MWh</p>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Year-to-Date Generation</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{info.yearEnergyMwh} MWh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
