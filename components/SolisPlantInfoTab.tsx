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
  CloudSun,
  CheckCircle2,
} from "lucide-react";

interface SolisPlantInfoTabProps {
  info: any;
  isLoading?: boolean;
}

export default function SolisPlantInfoTab({ info, isLoading }: SolisPlantInfoTabProps) {
  if (isLoading || !info) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-8 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading SolisCloud Plant Information...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Overview Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-[#1e3a5f] rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-[11px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                <span>{info.status || "Online"}</span>
              </span>
              <span className="text-xs text-emerald-100/70 font-mono">ID: {info.id}</span>
              <span className="text-xs text-emerald-100/70">|</span>
              <span className="text-xs text-emerald-100/70 font-mono">SNO: {info.sno}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{info.name}</h2>
            <p className="text-xs text-emerald-100/80 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{info.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[120px] text-center">
              <span className="text-[10px] text-emerald-200 uppercase font-semibold tracking-wider">Installed Capacity</span>
              <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">{info.capacityKwp} <span className="text-xs font-normal">kWp</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 min-w-[120px] text-center">
              <span className="text-[10px] text-emerald-200 uppercase font-semibold tracking-wider">Active Days</span>
              <p className="text-xl sm:text-2xl font-black font-mono mt-0.5">{info.generateDays} <span className="text-xs font-normal">Days</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Four Main Detailed Grids */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: General & System Specifications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Specifications</h3>
              <p className="text-[11px] text-slate-400">Technical topology and operational configuration</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">System Type</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.systemType}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Installed Capacity</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.capacityKwp} kWp</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Roof Mounting</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.roofType}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Commissioning Date</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.connectTimeStr}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Inverter Quantity</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">2 Units (Hybrid)</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Energy Storage</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">HV LiFePO4 Connected</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Grid Connection</span>
              <p className="font-semibold text-emerald-600 mt-0.5">3-Phase 400V Synchronized</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Accounting Currency</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.currency} (PKR)</p>
            </div>
          </div>
        </div>

        {/* Card 2: Geographical & Location Coordinates */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Geographical Location</h3>
              <p className="text-[11px] text-slate-400">Solar azimuth, inclination angles & GPS coordinates</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <span className="text-slate-400 font-medium">Full Installation Address</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.address}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">City / Province</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.city}, {info.region}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Country / Region</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.country}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">GPS Coordinates</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.latitude}° N, {info.longitude}° E</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Timezone</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.timeZone}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Azimuth Angle</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.azimuthStr}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Tilt Angle (Dip)</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">{info.dipStr}</p>
            </div>
          </div>
        </div>

        {/* Card 3: Ownership & Maintenance Service */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Stakeholder & Organization</h3>
              <p className="text-[11px] text-slate-400">Ownership, EPC installer, and grid agency</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Plant Owner</span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{info.owner}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Registered Contact</span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1 font-mono truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{info.email}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">EPC Installer / Service</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.installer}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Grid Distributor / Agent</span>
              <p className="font-semibold text-slate-800 mt-0.5">{info.gridAgent}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Cloud Data Platform</span>
              <p className="font-semibold text-slate-800 mt-0.5">SolisCloud Global (API v5)</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Telemetry Protocol</span>
              <p className="font-semibold text-slate-800 mt-0.5 font-mono">Modbus TCP / MQTT</p>
            </div>
          </div>
        </div>

        {/* Card 4: Environmental & Cumulative Energy */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Leaf className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Environmental Savings</h3>
              <p className="text-[11px] text-slate-400">Carbon offset and clean energy generation totals</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-1">
                <Leaf className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">CO2 Avoided</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{info.avoidedCo2Ton} <span className="text-[10px] font-normal text-slate-500">t</span></span>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-1">
                <Sun className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">Coal Saved</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{info.avoidedCoalTon} <span className="text-[10px] font-normal text-slate-500">t</span></span>
            </div>

            <div className="bg-green-50/70 border border-green-100 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-1">
                <TreePine className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block">Trees Equivalent</span>
              <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{info.treesPlanted}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-gray-100">
            <div>
              <span className="text-slate-400 font-medium">Cumulative Lifetime Yield</span>
              <p className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{info.allEnergyMwh} MWh</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Year-to-Date Generation</span>
              <p className="font-bold text-slate-900 mt-0.5 font-mono text-sm">{info.yearEnergyMwh} MWh</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
