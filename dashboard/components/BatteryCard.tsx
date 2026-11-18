"use client";

import React from "react";
import { Battery, BatteryCharging, Zap, ShieldAlert, Cpu } from "lucide-react";
import { TelemetryLatest } from "@/lib/types";

interface BatteryCardProps {
  telemetry: TelemetryLatest | null;
}

export default function BatteryCard({ telemetry }: BatteryCardProps) {
  if (!telemetry) return null;

  const b = telemetry.summary?.battery || {};
  const soc = Number(telemetry.battery_soc ?? b.socPercent ?? 0);
  const soh = Number(telemetry.battery_soh ?? b.sohPercent ?? 100);
  const powerKw = Number(telemetry.battery_power_kw ?? b.powerKw ?? 0);
  const voltageV = Number(b.voltageV ?? 0);
  const currentA = Number(b.currentA ?? 0);
  const chargeToday = Number(b.chargeEnergyTodayKwh ?? 0);
  const dischargeToday = Number(b.dischargeEnergyTodayKwh ?? 0);
  const lifetimeCharge = Number(b.chargeEnergyTotalMwh ?? 0);
  const lifetimeDischarge = Number(b.dischargeEnergyTotalMwh ?? 0);
  const batteryType = b.batteryType || (voltageV > 0 && voltageV < 100 ? "Lithium Battery LV" : "Lithium Battery HV");
  const batterySn = b.batterySn || (telemetry.inverter_sn ? `${telemetry.inverter_sn}BAT` : "Standard Battery Rack");

  // Color calculation based on SOC
  const socColor =
    soc > 50
      ? "bg-emerald-500"
      : soc > 20
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Battery className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Battery System</h3>
            <p className="text-[11px] text-slate-500 font-mono">{batteryType} • {batterySn}</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
          {telemetry.battery_direction || "Idle"}
        </span>
      </div>

      {/* Visual Battery Level Bar */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs font-medium text-slate-500">State of Charge (SOC)</span>
          <span className="text-2xl font-black text-slate-900 font-mono">{soc}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className={`h-full rounded-full transition-all duration-500 ${socColor}`}
            style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
          <span>0%</span>
          <span>SOH: {soh}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Key Electrical Parameters */}
      <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-center">
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Voltage</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{voltageV.toFixed(1)} V</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Current</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{currentA.toFixed(1)} A</span>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block">Power</span>
          <span className="text-sm font-bold text-slate-800 font-mono">{powerKw.toFixed(2)} kW</span>
        </div>
      </div>

      {/* Today's Cycling Energy */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Today&apos;s Charge
          </span>
          <span className="font-bold text-slate-800 font-mono">{chargeToday.toFixed(1)} kWh</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            Today&apos;s Discharge
          </span>
          <span className="font-bold text-slate-800 font-mono">{dischargeToday.toFixed(1)} kWh</span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-500">Lifetime Cycling</span>
          <span className="font-mono text-[11px] text-slate-600">
            {lifetimeCharge.toFixed(2)} / {lifetimeDischarge.toFixed(2)} MWh
          </span>
        </div>
      </div>
    </div>
  );
}
