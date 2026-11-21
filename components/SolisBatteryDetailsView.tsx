"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  RotateCw,
  Copy,
  Check,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings,
} from "lucide-react";

interface SolisBatteryDetailsViewProps {
  batterySn?: string;
  plantName?: string;
  plantId?: string;
  connectedInverterSn?: string;
  dataloggerSn?: string;
  onBackToDevices?: () => void;
  onOpenOperationLog?: () => void;
  onSelectInverter?: (sn: string) => void;
  onSelectPlantByName?: (plantName: string) => void;
}

// Battery Parameter definitions for the interactive chart
interface BatteryParamDef {
  key: string;
  name: string;
  unit: string;
  color: string;
  yAxisIndex: number; // 0: A/kWh (0-100), 1: V (0-600), 2: kW (0-10)
  defaultChecked: boolean;
  type?: "line" | "area";
}

const BATTERY_PARAMETERS: BatteryParamDef[] = [
  { key: "dailyCharge", name: "Daily Charge", unit: "kWh", color: "#f59e0b", yAxisIndex: 0, defaultChecked: true },
  { key: "totalCharge", name: "Total Charge", unit: "kWh", color: "#0d9488", yAxisIndex: 0, defaultChecked: true },
  { key: "dailyDischarge", name: "Daily Discharge", unit: "kWh", color: "#10b981", yAxisIndex: 0, defaultChecked: true },
  { key: "totalDischarge", name: "Total Discharge", unit: "kWh", color: "#06b6d4", yAxisIndex: 0, defaultChecked: true },
  { key: "bmsVoltage", name: "BMS Battery Voltage", unit: "V", color: "#ea580c", yAxisIndex: 1, defaultChecked: true },
  { key: "bmsCurrent", name: "BMS Battery Current", unit: "A", color: "#3b82f6", yAxisIndex: 0, defaultChecked: true },
  { key: "bmsPower", name: "BMS Battery Power", unit: "kW", color: "#16a34a", yAxisIndex: 2, defaultChecked: true, type: "area" },
  { key: "batterySoc", name: "Battery SOC", unit: "%", color: "#8b5cf6", yAxisIndex: 0, defaultChecked: false },
  { key: "batterySoh", name: "Battery SOH", unit: "%", color: "#ec4899", yAxisIndex: 0, defaultChecked: false },
  { key: "maxChargeCurrent", name: "Max Charge Current (BMS)", unit: "A", color: "#f97316", yAxisIndex: 0, defaultChecked: true },
  { key: "maxDischargeCurrent", name: "Max Discharge Current (BMS)", unit: "A", color: "#d97706", yAxisIndex: 0, defaultChecked: true },
];

export default function SolisBatteryDetailsView({
  batterySn = "1053050258180112BAT01",
  plantName = "Towfiq chinoy",
  plantId = "3649E0",
  connectedInverterSn = "1053050258180112",
  dataloggerSn = "7A12580709004122",
  onBackToDevices,
  onOpenOperationLog,
  onSelectInverter,
  onSelectPlantByName,
}: SolisBatteryDetailsViewProps) {
  const [selectedSn, setSelectedSn] = useState(batterySn);
  const [copied, setCopied] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year" | "Lifetime" | "User-defined">("Day");
  const [currentDateStr, setCurrentDateStr] = useState("21/11/2026");
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Enabled parameters set
  const [selectedParams, setSelectedParams] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    BATTERY_PARAMETERS.forEach((p) => {
      init[p.key] = p.defaultChecked;
    });
    return init;
  });

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleParam = (key: string) => {
    setSelectedParams((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeParamCount = useMemo(() => {
    return Object.values(selectedParams).filter(Boolean).length;
  }, [selectedParams]);

  // Generate 24-hour Day curves for all parameters matching exact screenshot 1
  const chartData = useMemo(() => {
    const times: string[] = [];
    const dailyCharge: number[] = [];
    const totalCharge: number[] = [];
    const dailyDischarge: number[] = [];
    const totalDischarge: number[] = [];
    const bmsVoltage: number[] = [];
    const bmsCurrent: number[] = [];
    const bmsPower: number[] = [];
    const batterySoc: number[] = [];
    const batterySoh: number[] = [];
    const maxChargeCurrent: number[] = [];
    const maxDischargeCurrent: number[] = [];

    // 24 hours at 5-min intervals (288 points)
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        times.push(`${hh}:${mm}`);

        const totalMinutes = h * 60 + m;

        // Current time is ~10:15
        if (totalMinutes <= 615) {
          // BMS Voltage ~549V baseline with slight ripple
          const volt = 545 + Math.sin(totalMinutes / 120) * 12 + ((totalMinutes % 23) * 0.15);
          bmsVoltage.push(Number(volt.toFixed(1)));

          // Max currents at 90A baseline
          maxChargeCurrent.push(90);
          maxDischargeCurrent.push(90);

          // SOH 100%
          batterySoh.push(100);

          // Daily charge steppy curve up to ~49kWh
          const chargeProg = Math.min(1, Math.max(0, (totalMinutes - 360) / 250));
          const dChg = Math.floor(chargeProg * 48);
          dailyCharge.push(dChg);
          totalCharge.push(Number((2450 + dChg).toFixed(1)));

          // Daily discharge steppy curve
          const dDis = Math.floor(Math.min(1, totalMinutes / 400) * 12);
          dailyDischarge.push(dDis);
          totalDischarge.push(Number((1890 + dDis).toFixed(1)));

          // Power and Current spikes (especially around 07:00 - 10:15)
          if (totalMinutes >= 360) {
            const spike = Math.abs(Math.sin((totalMinutes - 360) / 18)) * 4.2 + (Math.sin(totalMinutes / 5) * 1.5);
            const pwr = Math.max(0, spike);
            bmsPower.push(Number(pwr.toFixed(2)));
            bmsCurrent.push(Number((pwr * 1000 / volt).toFixed(1)));
            batterySoc.push(Math.round(20 + chargeProg * 65));
          } else {
            bmsPower.push(0.2);
            bmsCurrent.push(0.4);
            batterySoc.push(20);
          }
        } else {
          // Future times empty
          bmsVoltage.push(null as any);
          maxChargeCurrent.push(null as any);
          maxDischargeCurrent.push(null as any);
          dailyCharge.push(null as any);
          totalCharge.push(null as any);
          dailyDischarge.push(null as any);
          totalDischarge.push(null as any);
          bmsPower.push(null as any);
          bmsCurrent.push(null as any);
          batterySoc.push(null as any);
          batterySoh.push(null as any);
        }
      }
    }

    return {
      times,
      dailyCharge,
      totalCharge,
      dailyDischarge,
      totalDischarge,
      bmsVoltage,
      bmsCurrent,
      bmsPower,
      batterySoc,
      batterySoh,
      maxChargeCurrent,
      maxDischargeCurrent,
    };
  }, []);

  // Update ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const series: echarts.SeriesOption[] = [];

    BATTERY_PARAMETERS.forEach((p) => {
      if (!selectedParams[p.key]) return;

      const data = (chartData as any)[p.key] || [];

      if (p.key === "bmsPower") {
        series.push({
          name: p.name,
          type: "line",
          yAxisIndex: p.yAxisIndex,
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: p.color, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(22, 163, 74, 0.45)" },
              { offset: 1, color: "rgba(22, 163, 74, 0.05)" },
            ]),
          },
        });
      } else if (p.key === "bmsVoltage") {
        series.push({
          name: p.name,
          type: "line",
          yAxisIndex: p.yAxisIndex,
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: p.color, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(234, 88, 12, 0.25)" },
              { offset: 1, color: "rgba(234, 88, 12, 0.02)" },
            ]),
          },
        });
      } else {
        series.push({
          name: p.name,
          type: "line",
          yAxisIndex: p.yAxisIndex,
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: p.color, width: 1.5 },
        });
      }
    });

    const option: echarts.EChartsOption = {
      animation: false,
      grid: {
        top: 40,
        left: 55,
        right: 65,
        bottom: 30,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#f37021" } },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f37021",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let html = `<div style="font-weight:bold; margin-bottom:4px; font-family:monospace; border-bottom:1px solid #eee; padding-bottom:2px;">${params[0].axisValue}</div>`;
          params.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              const def = BATTERY_PARAMETERS.find((item) => item.name === p.seriesName);
              const unit = def?.unit || "";
              html += `<div style="display:flex; justify-content:space-between; gap:14px; margin-top:2px;">
                <span style="color:${p.color}; font-weight:600;">${p.seriesName}:</span>
                <span style="font-family:monospace; font-weight:bold;">${p.value} ${unit}</span>
              </div>`;
            }
          });
          return html;
        },
      },
      xAxis: {
        type: "category",
        data: chartData.times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          interval: (index) => index % 24 === 0, // Every 2 hours
        },
      },
      yAxis: [
        {
          type: "value",
          name: "A / kWh",
          position: "left",
          nameTextStyle: { color: "#94a3b8", fontSize: 10 },
          min: 0,
          max: 100,
          interval: 20,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        {
          type: "value",
          name: "V",
          position: "right",
          nameTextStyle: { color: "#ea580c", fontSize: 10 },
          min: 0,
          max: 580,
          interval: 116,
          splitLine: { show: false },
          axisLabel: { color: "#ea580c", fontSize: 10 },
        },
        {
          type: "value",
          name: "kW",
          position: "right",
          offset: 40,
          nameTextStyle: { color: "#16a34a", fontSize: 10 },
          min: 0,
          max: 10,
          interval: 2,
          splitLine: { show: false },
          axisLabel: { color: "#16a34a", fontSize: 10 },
        },
      ],
      series: series,
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [selectedParams, chartData]);

  return (
    <div className="flex bg-[#f5f7fa] min-h-screen text-slate-800 antialiased">
      {/* 1. Left Device Switcher Rail */}
      <div className="w-[120px] bg-white border-r border-slate-200/80 p-2.5 flex flex-col justify-between shrink-0">
        <div>
          <div className="text-[12px] font-bold text-slate-800 px-1 py-1 mb-2">
            Battery Details
          </div>
          <button
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold border border-[#fca466] bg-[#fffaf5] text-[#e8600c] shadow-2xs transition-all"
          >
            Battery
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 border border-slate-200 rounded-lg p-1 text-xs text-slate-600 bg-white shadow-2xs">
          <button className="text-slate-400 hover:text-slate-700 px-1">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-medium">1 / 1</span>
          <button className="text-slate-400 hover:text-slate-700 px-1">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Content Container */}
      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-[1500px] min-w-0">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              Online
            </span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Battery</span>
              <button
                onClick={() => alert("Refreshed Battery Telemetry")}
                className="text-slate-400 hover:text-[#10b981]"
                title="Refresh"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </h1>
            <span className="text-xs text-slate-400 font-mono">
              Plant ID: {plantId} | {currentDateStr} 10:11:15 (UTC+05:00) 2Min Ago
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Battery Settings: Max Charge 90A, Max Discharge 90A, Cutoff SOC 10%")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Battery Setting</span>
            </button>
          </div>
        </div>

        {/* Card 1: Battery Graphic + Specifications Grid */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row items-center gap-8">
          {/* Battery Photo */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 border border-slate-100 w-full md:w-56 shrink-0">
            <div className="relative w-36 h-44">
              <Image
                src="/images/battery_default.png"
                alt="HV LiFePO4 Battery"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-700">
              <span>SN: {selectedSn.slice(0, 16)}...</span>
              <button
                onClick={() => handleCopy(selectedSn)}
                className="text-slate-400 hover:text-[#10b981]"
                title="Copy SN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-xs w-full">
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Model</span>
              <span className="font-semibold text-slate-800">PYLON_HV</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Plant</span>
              <span
                onClick={() => onSelectPlantByName && onSelectPlantByName(plantName)}
                className="font-semibold text-[#10b981] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{plantName}</span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-[#10b981]" />
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Associated Datalogger</span>
              <span className="font-mono font-semibold text-[#10b981] hover:underline cursor-pointer flex items-center gap-0.5">
                <span>{dataloggerSn.slice(0, 10)}...</span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-[#10b981]" />
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Capacity</span>
              <span className="font-mono font-semibold text-slate-800">52.5kWh</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Max Charge Current (BMS)</span>
              <span className="font-mono font-semibold text-slate-800">90A</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Max Discharge Current (BMS)</span>
              <span className="font-mono font-semibold text-slate-800">90A</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">SOH</span>
              <span className="font-mono font-semibold text-slate-800">100%</span>
            </div>
          </div>
        </div>

        {/* Card 2 & 3: Real-time Data + Battery Level Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Real-time Data */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h2 className="text-xs font-bold text-slate-800 mb-4">Real-time data</h2>
            <div className="flex items-center gap-6">
              {/* Radial Gauge */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#e2e8f0"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset="125"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold text-emerald-600 font-mono">0%</span>
                  <span className="text-[10px] text-slate-400 font-medium">SOC</span>
                </div>
              </div>

              {/* Status & Values */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs w-full">
                <div>
                  <span className="text-slate-400 text-[11px] block">Operating Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Discharging</span>
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Voltage</span>
                  <span className="font-mono font-bold text-slate-800">549.7V</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Current</span>
                  <span className="font-mono font-bold text-slate-800">3.7A</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Power</span>
                  <span className="font-mono font-bold text-slate-800">2034W</span>
                </div>
              </div>
            </div>
          </div>

          {/* Battery Level Summary */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
            <h2 className="text-xs font-bold text-slate-800 mb-4">Battery Level</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 text-[11px] border-b border-slate-100">
                    <th className="py-2 text-left font-medium"></th>
                    <th className="py-2 text-center font-medium">Today</th>
                    <th className="py-2 text-center font-medium">This month</th>
                    <th className="py-2 text-center font-medium">This year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-slate-600">Charge</td>
                    <td className="py-2.5 text-center">49.8kWh</td>
                    <td className="py-2.5 text-center">312.4kWh</td>
                    <td className="py-2.5 text-center">1.4MWh</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-slate-600">Discharge</td>
                    <td className="py-2.5 text-center">12.4kWh</td>
                    <td className="py-2.5 text-center">288.1kWh</td>
                    <td className="py-2.5 text-center">1.2MWh</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Note: The data includes all batteries.</p>
          </div>
        </div>

        {/* Card 4: Battery Interactive Graph with Parameters Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">
              Battery Chart <span className="font-mono text-slate-400 font-normal">SN: {selectedSn}</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
                <button
                  onClick={() => setCurrentDateStr("20/11/2026")}
                  className="text-slate-400 hover:text-slate-700 px-1"
                >
                  &lt;
                </button>
                <span className="font-mono text-slate-800 text-[11px] font-semibold">{currentDateStr}</span>
                <button
                  onClick={() => setCurrentDateStr("21/11/2026")}
                  className="text-slate-400 hover:text-slate-700 px-1"
                >
                  &gt;
                </button>
              </div>

              <div className="flex items-center gap-1">
                {(["Day", "Month", "Year", "Lifetime", "User-defined"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDateTab(tab)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                      activeDateTab === tab
                        ? "bg-[#fffaf5] text-[#e8600c] font-bold border border-[#fca466]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => alert("Downloading Battery Data CSV")}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Graph Layout: Left Parameters Tree + Right ECharts */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Left Parameters Box */}
            <div className="w-full lg:w-64 p-3.5 rounded-2xl bg-[#fafbfc] border border-slate-200/80 text-xs shrink-0 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">Parameters({activeParamCount})</span>
                <button
                  onClick={() => {
                    const allTrue: Record<string, boolean> = {};
                    BATTERY_PARAMETERS.forEach((p) => (allTrue[p.key] = true));
                    setSelectedParams(allTrue);
                  }}
                  className="text-slate-400 hover:text-[#10b981] p-1"
                  title="Reset to All"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Accordion item: Battery */}
              <div className="space-y-2">
                <div
                  className="flex items-center justify-between text-slate-800 font-semibold cursor-pointer py-1"
                  onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                >
                  <span>Battery</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${isTreeExpanded ? "" : "-rotate-90"}`}
                  />
                </div>

                {isTreeExpanded && (
                  <div className="space-y-1.5 pl-1">
                    {BATTERY_PARAMETERS.map((param) => {
                      const isChecked = !!selectedParams[param.key];
                      return (
                        <label
                          key={param.key}
                          className="flex items-center gap-2 text-[12px] text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleParam(param.key)}
                            className="rounded border-slate-300 text-[#10b981] focus:ring-[#f37021] accent-[#10b981] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={isChecked ? "font-medium text-slate-900" : "text-slate-500"}>
                            {param.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Chart Area */}
            <div className="flex-1 w-full min-w-0">
              {/* Dynamic Legend based on selected parameters */}
              <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                {BATTERY_PARAMETERS.filter((p) => selectedParams[p.key]).map((p) => (
                  <div key={p.key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-700 font-medium text-[11px]">{p.name}</span>
                  </div>
                ))}
              </div>

              {/* ECharts Canvas */}
              <div ref={chartRef} className="w-full h-80 sm:h-96" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
