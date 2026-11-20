"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Copy,
  Check,
  Edit,
  Download,
  Info,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";

interface SolisMeterDetailsViewProps {
  meterSn?: string;
  plantName?: string;
  plantId?: string;
  dataloggerSn?: string;
  onBackToDevices: () => void;
  onOpenOperationLog?: () => void;
  onSelectPlantByName?: (plantName: string) => void;
}

export default function SolisMeterDetailsView({
  meterSn = "1053050258180112MTR01",
  plantName = "Towfiq chinoy",
  plantId = "3649E0",
  dataloggerSn = "7A12580709004122",
  onBackToDevices,
  onOpenOperationLog,
  onSelectPlantByName,
}: SolisMeterDetailsViewProps) {
  const [copied, setCopied] = useState(false);
  const [searchSidebar, setSearchSidebar] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("20/11/2026");
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year" | "Lifetime">("Day");
  const [activePowerChecked, setActivePowerChecked] = useState(true);

  // Chart ref
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePrevDate = () => {
    if (activeDateTab === "Day") {
      if (currentDateStr === "20/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("18/11/2026");
    } else if (activeDateTab === "Month") {
      if (currentDateStr === "11/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("09/2026");
    } else if (activeDateTab === "Year") {
      if (currentDateStr === "2026") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2024");
    }
  };

  const handleNextDate = () => {
    if (activeDateTab === "Day") {
      if (currentDateStr === "18/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("20/11/2026");
    } else if (activeDateTab === "Month") {
      if (currentDateStr === "09/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("11/2026");
    } else if (activeDateTab === "Year") {
      if (currentDateStr === "2024") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2026");
    }
  };

  const handleTabChange = (tab: "Day" | "Month" | "Year" | "Lifetime") => {
    setActiveDateTab(tab);
    if (tab === "Day") setCurrentDateStr("20/11/2026");
    else if (tab === "Month") setCurrentDateStr("11/2026");
    else if (tab === "Year") setCurrentDateStr("2026");
    else if (tab === "Lifetime") setCurrentDateStr("Lifetime");
  };

  // Render ECharts for Meter
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    let option: echarts.EChartsOption = {};

    if (activeDateTab === "Day") {
      const times: string[] = [];
      const activePower: (number | null)[] = [];

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          times.push(`${hh}:${mm}`);

          const mins = h * 60 + m;
          if (mins <= 810) {
            if (mins < 370) {
              activePower.push(Number((-0.05 + Math.random() * 0.05).toFixed(2)));
            } else if (mins >= 370 && mins <= 650) {
              const prog = (mins - 370) / (650 - 370);
              const dip = -Math.sin(prog * Math.PI) * 3.8 - (mins % 30 === 0 ? 0.3 : 0);
              activePower.push(Number(dip.toFixed(2)));
            } else if (mins > 650 && mins <= 700) {
              const rec = -1.5 + ((mins - 650) / 50) * 1.5;
              activePower.push(Number(rec.toFixed(2)));
            } else {
              activePower.push(0);
            }
          } else {
            activePower.push(null);
          }
        }
      }

      option = {
        animation: false,
        grid: { top: 25, left: 45, right: 25, bottom: 30 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross", crossStyle: { color: "#f37021" } },
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 11 },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return "";
            const p = params[0];
            return `<div style="font-weight:bold; margin-bottom:4px; font-family:monospace;">${p.axisValue}</div>
              <div style="display:flex; justify-content:space-between; gap:12px;">
                <span style="color:#f37021; font-weight:600;">Active Power:</span>
                <span style="font-family:monospace; font-weight:bold;">${p.value !== null ? p.value + " kW" : "--"}</span>
              </div>`;
          },
        },
        xAxis: {
          type: "category",
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10, interval: 12 },
        },
        yAxis: {
          type: "value",
          name: "kW",
          nameTextStyle: { color: "#94a3b8", fontSize: 10 },
          max: 0.9,
          min: -4.5,
          interval: 0.9,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          {
            name: "Active Power",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: activePowerChecked ? activePower : [],
            lineStyle: { color: "#f37021", width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(243, 112, 33, 0.05)" },
                { offset: 1, color: "rgba(243, 112, 33, 0.35)" },
              ]),
            },
          },
        ],
      };
    } else if (activeDateTab === "Month") {
      const days = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0"));
      const importData = new Array(30).fill(null);
      const exportData = new Array(30).fill(null);

      importData[17] = 2.5;
      importData[18] = 28.72;
      importData[19] = 29.0;

      exportData[18] = 19.5;
      exportData[19] = 39.3;

      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: days,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 50,
          interval: 10,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Daily Import", type: "bar", data: importData, itemStyle: { color: "#06b6d4" } },
          { name: "Daily Export", type: "bar", data: exportData, itemStyle: { color: "#3b82f6" } },
        ],
      };
    } else if (activeDateTab === "Year") {
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const importData = new Array(12).fill(null);
      const exportData = new Array(12).fill(null);

      importData[10] = 31.5;
      exportData[10] = 58.2;

      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: months,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 100,
          interval: 20,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Monthly Import", type: "bar", data: importData, itemStyle: { color: "#06b6d4" } },
          { name: "Monthly Export", type: "bar", data: exportData, itemStyle: { color: "#3b82f6" } },
        ],
      };
    } else {
      const years = ["2024", "2025", "2026"];
      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: years,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "MWh",
          max: 5,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Total Import", type: "bar", data: [0, 0.4, 1.8], itemStyle: { color: "#06b6d4" } },
          { name: "Total Export", type: "bar", data: [0, 0.6, 2.9], itemStyle: { color: "#3b82f6" } },
        ],
      };
    }

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [activePowerChecked, activeDateTab, currentDateStr]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: DATALOGGER NAVIGATOR                   */}
      {/* ======================================================== */}
      <div className="w-full lg:w-64 bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-col shrink-0">
        <button
          onClick={onBackToDevices}
          className="text-xs font-bold text-slate-800 hover:text-[#f37021] flex items-center gap-1 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Device Details</span>
        </button>

        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search Nam..."
            value={searchSidebar}
            onChange={(e) => setSearchSidebar(e.target.value)}
            className="w-full pl-2.5 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Tree item */}
        <div className="p-2 rounded-lg bg-orange-50/40 border border-orange-200 text-xs text-[#f37021] font-medium flex items-center gap-1.5">
          <ChevronRightIcon className="w-3.5 h-3.5 text-[#f37021]" />
          <div className="truncate">
            <span className="block font-semibold">Datalogger</span>
            <span className="font-mono text-[11px] opacity-80">{dataloggerSn.slice(0, 14)}...</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN METER DETAILS CONTENT AREA                      */}
      {/* ======================================================== */}
      <div className="flex-1 space-y-4 w-full min-w-0">
        {/* Header Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              Online
            </span>

            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900">Meter</h2>
              <button
                onClick={() => alert("Edit meter configuration")}
                className="text-slate-400 hover:text-[#f37021] p-1"
                title="Edit Meter"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-slate-400 hover:text-slate-700 p-1"
                title="Refresh"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
            <span className="font-mono text-[11px]">
              Plant ID: <strong className="text-slate-800">{plantId}</strong> |{" "}
              {currentDateStr} 13:31:36 (UTC+05:00) 2Min Ago
            </span>

            {onOpenOperationLog && (
              <button
                onClick={onOpenOperationLog}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-xs font-normal text-slate-700 hover:bg-gray-50 transition-all shadow-2xs active:scale-95 whitespace-nowrap"
              >
                Operation Log
              </button>
            )}
          </div>
        </div>

        {/* Top Card: Meter Profile & Associated Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row items-center gap-6">
          {/* Left: Graphic and SN */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50/60 border border-gray-100 w-full md:w-56 shrink-0">
            <div className="relative w-32 h-32">
              <Image
                src="/images/solis_meter_card.jpg"
                alt="Solis Smart Meter"
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-800">
              <span>SN: --</span>
              <button
                onClick={() => handleCopy("--")}
                className="text-slate-400 hover:text-[#f37021]"
                title="Copy SN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
          </div>

          {/* Right: Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs w-full">
            <div>
              <span className="text-slate-500 text-[11px] block mb-1">Plant</span>
              <span
                onClick={() => onSelectPlantByName && onSelectPlantByName(plantName)}
                className="font-medium text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{plantName}</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block mb-1">Associated Datalogger</span>
              <span className="font-mono text-[#f37021] flex items-center gap-0.5 hover:underline cursor-pointer">
                <span>{dataloggerSn.slice(0, 10)}...</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block mb-1">Address</span>
              <span className="font-mono font-medium text-slate-900">01</span>
            </div>
          </div>
        </div>

        {/* Card 2: Real-time Information (Left) & AC Info (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Real-time Information */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-100 pb-2">
              Real-time Information
            </h3>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Daily Export Energy</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Daily Import Energy</span>
                <span className="font-mono font-bold text-slate-900">28.72kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Monthly Export Energy</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Monthly Import Energy</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Annual Export Energy</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Annual Import Energy</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Total Export</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Total Import</span>
                <span className="font-mono font-medium text-slate-900">0kWh</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Power</span>
                <span className="font-mono font-bold text-slate-900">0kW</span>
              </div>
            </div>
          </div>

          {/* AC Info */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-gray-100 pb-2">
              AC Info
            </h3>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-gray-100 text-[11px]">
                  <th className="py-2 px-3 font-normal"></th>
                  <th className="py-2 px-3 font-normal">Voltage</th>
                  <th className="py-2 px-3 font-normal">Current</th>
                  <th className="py-2 px-3 font-normal">Active Power</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-slate-800">
                <tr className="hover:bg-gray-50/60">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-700">L1</td>
                  <td className="py-2.5 px-3">0V</td>
                  <td className="py-2.5 px-3">0A</td>
                  <td className="py-2.5 px-3">0W</td>
                </tr>
                <tr className="hover:bg-gray-50/60">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-700">L2</td>
                  <td className="py-2.5 px-3">0V</td>
                  <td className="py-2.5 px-3">0A</td>
                  <td className="py-2.5 px-3">0W</td>
                </tr>
                <tr className="hover:bg-gray-50/60">
                  <td className="py-2.5 px-3 font-sans font-medium text-slate-700">L3</td>
                  <td className="py-2.5 px-3">0V</td>
                  <td className="py-2.5 px-3">0A</td>
                  <td className="py-2.5 px-3">0W</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 3: Meter Chart SN: 1053050258180112MTR01 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">
              Meter Chart <span className="font-mono text-slate-500 font-normal">SN: {meterSn}</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                <button
                  onClick={handlePrevDate}
                  className="p-0.5 hover:text-[#f37021] text-slate-400"
                  title="Previous Date"
                >
                  &lt;
                </button>
                <span className="font-mono text-slate-800 text-[11px] px-1 font-semibold">{currentDateStr}</span>
                <button
                  onClick={handleNextDate}
                  className="p-0.5 hover:text-[#f37021] text-slate-400"
                  title="Next Date"
                >
                  &gt;
                </button>
              </div>

              <div className="flex items-center gap-1">
                {(["Day", "Month", "Year", "Lifetime"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      activeDateTab === tab
                        ? "bg-orange-50 text-[#f37021] font-bold border border-orange-300"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => alert("Exporting Meter Chart CSV")}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-slate-500"
                title="Download Data"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {activeDateTab !== "Day" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#fafbfc] border border-gray-100">
                <div>
                  <span className="text-[11px] text-slate-400 block">{activeDateTab === "Year" ? "Annual" : activeDateTab === "Month" ? "Monthly" : "Lifetime"} Import</span>
                  <span className="text-sm font-bold font-mono text-slate-900">28.72 kWh</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">{activeDateTab === "Year" ? "Annual" : activeDateTab === "Month" ? "Monthly" : "Lifetime"} Export</span>
                  <span className="text-sm font-bold font-mono text-slate-900">0 kWh</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Peak Active Power</span>
                  <span className="text-sm font-bold font-mono text-slate-900">4.1 kW</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Average Power Factor</span>
                  <span className="text-sm font-bold font-mono text-slate-900">0.99</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                  <span className="text-slate-700 font-medium">Import Energy</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-slate-700 font-medium">Export Energy</span>
                </div>
              </div>

              <div ref={chartRef} className="w-full h-72 sm:h-80" />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Left Parameter Panel */}
              <div className="w-full lg:w-56 p-3 rounded-xl bg-gray-50/60 border border-gray-100 text-xs shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Parameters(1)</span>
                  <button className="text-slate-400 hover:text-[#f37021] p-0.5">
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2 text-[11px]">
                  {/* Energy */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                      <span>Energy</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="pl-3 space-y-1 text-slate-600">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="accent-[#f37021] w-3 h-3" />
                        <span>Total Export</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" className="accent-[#f37021] w-3 h-3" />
                        <span>Total Import</span>
                      </label>
                    </div>
                  </div>

                  {/* Active Power */}
                  <div className="space-y-1 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                      <span>Active Power</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="pl-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[#f37021] font-semibold">
                        <input
                          type="checkbox"
                          checked={activePowerChecked}
                          onChange={(e) => setActivePowerChecked(e.target.checked)}
                          className="accent-[#f37021] w-3 h-3"
                        />
                        <span>Active Power</span>
                      </label>
                    </div>
                  </div>

                  {/* Apparent Power */}
                  <div className="space-y-1 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                      <span>Apparent Power</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Voltage */}
                  <div className="space-y-1 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                      <span>Voltage</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Current */}
                  <div className="space-y-1 pt-1 border-t border-gray-200/50">
                    <div className="flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                      <span>Current</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Chart Area */}
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Daily Export</span>
                      <span className="font-mono font-bold text-slate-900">0 kWh</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Daily Import</span>
                      <span className="font-mono font-bold text-slate-900">28.72 kWh</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f37021]" />
                    <span className="text-slate-700 font-medium">Active Power</span>
                  </div>
                </div>

                <div ref={chartRef} className="w-full h-72 sm:h-80" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
