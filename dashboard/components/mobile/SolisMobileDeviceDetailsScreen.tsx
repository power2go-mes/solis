"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import * as echarts from "echarts";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Check,
  HelpCircle,
  Filter,
  Maximize2,
  Edit,
  RotateCw,
  Clock,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Info,
  Calendar,
} from "lucide-react";
import SolisAlarmDetailModal, { AlarmItem } from "../SolisAlarmDetailModal";

interface SolisMobileDeviceDetailsScreenProps {
  device: {
    id: string;
    type: "Inverter" | "Battery" | "Meter" | "Datalogger";
    name: string;
    sn: string;
    status: string;
    image: string;
    ratedPowerKw?: number;
    capacityKwh?: number;
  };
  plantName?: string;
  plantId?: string;
  onBack: () => void;
  onSelectPlant?: (plantId: string) => void;
  onSelectDevice?: (sn: string, type: "Inverter" | "Battery" | "Meter" | "Datalogger") => void;
}

export default function SolisMobileDeviceDetailsScreen({
  device,
  plantName = "P2G 50KW",
  plantId = "3212F1",
  onBack,
  onSelectPlant,
  onSelectDevice,
}: SolisMobileDeviceDetailsScreenProps) {
  const searchParams = useSearchParams();
  const initialDeviceTab = (searchParams.get("deviceTab") as any) || "Data";

  // 4 Bottom Tabs: Data | Analysis | Alarm | Info
  const [activeBottomTab, setActiveBottomTab] = useState<"Data" | "Analysis" | "Alarm" | "Info">(
    ["Data", "Analysis", "Alarm", "Info"].includes(initialDeviceTab) ? initialDeviceTab : "Data"
  );

  // Analysis Sub-tabs: Generation | Battery | Grid | Load
  const [analysisSubTab, setAnalysisSubTab] = useState<"Generation" | "Battery" | "Grid" | "Load">("Generation");
  const [granularity, setGranularity] = useState<"Day" | "Month" | "Year" | "Lifetime">("Day");
  const [currentDateStr, setCurrentDateStr] = useState("20/11/2026");
  const [showPvPower, setShowPvPower] = useState(true);

  // Alarm Sub-tabs: Current | History
  const [alarmSubTab, setAlarmSubTab] = useState<"Current" | "History">("Current");
  const [selectedAlarmForModal, setSelectedAlarmForModal] = useState<AlarmItem | null>(null);

  // Info editable remark
  const [remark, setRemark] = useState("--");
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullScreenChart, setIsFullScreenChart] = useState(false);

  // Chart ref
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Date navigation: previous/next
  const handlePrevDate = () => {
    if (granularity === "Day") {
      if (currentDateStr === "20/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("18/11/2026");
    } else if (granularity === "Month") {
      if (currentDateStr === "11/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("09/2026");
    } else if (granularity === "Year") {
      if (currentDateStr === "2026") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2024");
    }
  };

  const handleNextDate = () => {
    if (granularity === "Day") {
      if (currentDateStr === "18/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("20/11/2026");
    } else if (granularity === "Month") {
      if (currentDateStr === "09/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("11/2026");
    } else if (granularity === "Year") {
      if (currentDateStr === "2024") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2026");
    }
  };

  // Change granularity format
  const handleChangeGranularity = (newGran: "Day" | "Month" | "Year" | "Lifetime") => {
    setGranularity(newGran);
    if (newGran === "Day") setCurrentDateStr("20/11/2026");
    else if (newGran === "Month") setCurrentDateStr("11/2026");
    else if (newGran === "Year") setCurrentDateStr("2026");
    else if (newGran === "Lifetime") setCurrentDateStr("Lifetime");
  };

  // Render ECharts in Analysis tab
  useEffect(() => {
    if (activeBottomTab !== "Analysis" || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    let option: echarts.EChartsOption = {};

    if (granularity === "Day") {
      // 24 Hours line curve
      const times: string[] = [];
      const dataValues: (number | null)[] = [];

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          times.push(`${hh}:${mm}`);

          const mins = h * 60 + m;
          // In live screenshot, solar curve rises at 07:00, peaks around 12:00 at ~18 kW, stops around 15:30
          if (mins <= 930) {
            if (analysisSubTab === "Generation") {
              if (mins >= 420 && mins <= 930) {
                const prog = (mins - 420) / (930 - 420);
                const curve = Math.sin(prog * Math.PI) * 17.5 + (Math.sin(mins / 6) * 0.8);
                dataValues.push(Number(Math.max(0, curve).toFixed(2)));
              } else {
                dataValues.push(0);
              }
            } else if (analysisSubTab === "Battery") {
              if (mins >= 480 && mins <= 850) {
                // Charging
                dataValues.push(Number((2.5 + Math.sin(mins / 15) * 0.5).toFixed(2)));
              } else if (mins > 850 && mins <= 930) {
                // Discharging
                dataValues.push(Number((-1.8 + Math.sin(mins / 20) * 0.3).toFixed(2)));
              } else {
                dataValues.push(0);
              }
            } else if (analysisSubTab === "Grid") {
              if (mins >= 400 && mins <= 650) {
                dataValues.push(Number((-3.5 + Math.sin(mins / 12) * 0.5).toFixed(2)));
              } else {
                dataValues.push(0);
              }
            } else {
              // Load
              dataValues.push(Number((4.5 + Math.sin(mins / 25) * 1.2).toFixed(2)));
            }
          } else {
            dataValues.push(null);
          }
        }
      }

      option = {
        animation: false,
        grid: { top: 25, left: 35, right: 15, bottom: 25 },
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
            return `<div style="font-weight:bold; font-family:monospace;">${p.axisValue}</div>
              <div style="color:${p.color}; font-weight:600;">${p.seriesName}: ${p.value !== null ? p.value + " kW" : "--"}</div>`;
          },
        },
        xAxis: {
          type: "category",
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: {
            color: "#94a3b8",
            fontSize: 9,
            interval: 12, // every 3 hours: 3:00, 6:00, 9:00, 12:00, 15:00, 18:00, 21:00
          },
        },
        yAxis: {
          type: "value",
          name: "kW",
          nameTextStyle: { color: "#94a3b8", fontSize: 9 },
          max: 25,
          min: analysisSubTab === "Grid" || analysisSubTab === "Battery" ? -5 : 0,
          interval: 5,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        series: [
          {
            name: analysisSubTab === "Generation" ? "PV Power" : `${analysisSubTab} Power`,
            type: "line",
            smooth: true,
            showSymbol: false,
            data: showPvPower ? dataValues : [],
            lineStyle: {
              color: analysisSubTab === "Generation" ? "#f37021" : analysisSubTab === "Battery" ? "#10b981" : analysisSubTab === "Grid" ? "#3b82f6" : "#8b5cf6",
              width: 2,
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                {
                  offset: 0,
                  color:
                    analysisSubTab === "Generation"
                      ? "rgba(243, 112, 33, 0.35)"
                      : analysisSubTab === "Battery"
                      ? "rgba(16, 185, 129, 0.35)"
                      : "rgba(59, 130, 246, 0.35)",
                },
                { offset: 1, color: "rgba(243, 112, 33, 0.01)" },
              ]),
            },
          },
        ],
      };
    } else if (granularity === "Month") {
      // 30 Days Bar Chart
      const days = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0"));
      const yieldData = new Array(30).fill(null);
      const backupData = new Array(30).fill(null);
      const importData = new Array(30).fill(null);

      yieldData[17] = 85.0; // Day 18
      yieldData[18] = 101.1; // Day 19
      yieldData[19] = 72.7; // Day 20

      backupData[17] = 12.0;
      backupData[18] = 105.0;
      backupData[19] = 106.2;

      importData[17] = 2.5;
      importData[19] = 29.0;

      option = {
        animation: false,
        grid: { top: 25, left: 35, right: 15, bottom: 25 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: days,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 9, interval: 2 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 120,
          interval: 24,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        series: [
          {
            name: "Yield",
            type: "bar",
            data: yieldData,
            itemStyle: { color: "#eab308" },
          },
          {
            name: "Backup Load",
            type: "bar",
            data: backupData,
            itemStyle: { color: "#a855f7" },
          },
          {
            name: "Import",
            type: "bar",
            data: importData,
            itemStyle: { color: "#06b6d4" },
          },
        ],
      };
    } else if (granularity === "Year") {
      // 12 Months Bar Chart
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const yieldData = new Array(12).fill(null);
      const backupData = new Array(12).fill(null);
      const importData = new Array(12).fill(null);

      yieldData[10] = 157.7; // Month 11
      backupData[10] = 211.2;
      importData[10] = 31.5;

      option = {
        animation: false,
        grid: { top: 25, left: 35, right: 15, bottom: 25 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: months,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 220,
          interval: 44,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        series: [
          {
            name: "Yield",
            type: "bar",
            data: yieldData,
            itemStyle: { color: "#eab308" },
          },
          {
            name: "Backup Load",
            type: "bar",
            data: backupData,
            itemStyle: { color: "#a855f7" },
          },
          {
            name: "Import",
            type: "bar",
            data: importData,
            itemStyle: { color: "#06b6d4" },
          },
        ],
      };
    } else {
      // Lifetime Bar Chart
      const years = ["2024", "2025", "2026"];
      option = {
        animation: false,
        grid: { top: 25, left: 35, right: 15, bottom: 25 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: years,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        yAxis: {
          type: "value",
          name: "MWh",
          max: 15,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 9 },
        },
        series: [
          {
            name: "Total Yield",
            type: "bar",
            data: [0, 2.1, 9.328],
            itemStyle: { color: "#eab308" },
          },
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
  }, [activeBottomTab, analysisSubTab, granularity, currentDateStr, showPvPower]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-28 relative">
      {/* ======================================================== */}
      {/* TOP HEADER: < DeviceType ID:xxxx ...                    */}
      {/* ======================================================== */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
          title="Back to Devices"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="text-center">
          <h1 className="text-sm font-bold text-slate-900">{device.type}</h1>
          <p className="text-[11px] text-slate-400 font-mono">ID:{plantId}</p>
        </div>

        <button
          onClick={() => alert(`Device Options for ${device.sn}`)}
          className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
        >
          <MoreHorizontal className="w-4 h-4 text-slate-600" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* MAIN TAB CONTENT CONTAINER                               */}
      {/* ======================================================== */}
      <div className="p-3.5 space-y-3.5 max-w-lg mx-auto">
        {/* ------------------------------------------------------ */}
        {/* TAB 1: DATA TAB (Exact Screenshots 2 & 3 Parity)        */}
        {/* ------------------------------------------------------ */}
        {activeBottomTab === "Data" && (
          <div className="space-y-3">
            {/* Top Device Summary Box */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900">
                  <span>SN:{device.sn}</span>
                  <button
                    onClick={() => handleCopy(device.sn)}
                    className="text-slate-400 hover:text-[#f37021] p-0.5"
                    title="Copy SN"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      device.status === "Warning"
                        ? "bg-orange-50 text-[#f37021] border border-orange-200"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    }`}
                  >
                    {device.status}
                  </span>

                  {device.status === "Warning" && (
                    <>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        107C
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-mono">
                        UN-V-Batt2
                      </span>
                    </>
                  )}
                </div>

                <div className="text-xs text-slate-500 pt-0.5 space-y-0.5">
                  <p>
                    PV Power: <strong className="text-slate-900 font-mono font-bold">5.9kW</strong>
                  </p>
                  <p>
                    Rated Power: <strong className="text-slate-900 font-mono font-bold">{device.ratedPowerKw || 50}kW</strong>
                  </p>
                </div>

                <p className="text-[10px] text-slate-400 font-mono pt-1">
                  20/11/2026 15:21:45 (UTC+05:00)
                </p>
              </div>

              {/* Device Image */}
              <div className="w-20 h-20 relative shrink-0">
                <Image
                  src={device.image}
                  alt={device.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>

            {/* DC Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                <span>DC</span>
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              </div>

              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] border-b border-gray-100">
                    <th className="py-2 text-left font-normal pl-2"></th>
                    <th className="py-2 font-normal">Voltage(V)</th>
                    <th className="py-2 font-normal">Current(A)</th>
                    <th className="py-2 font-normal pr-2">Power(W)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-mono text-slate-800">
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">PV1</td>
                    <td className="py-2">645.3</td>
                    <td className="py-2">2.4</td>
                    <td className="py-2 pr-2 font-semibold text-slate-900">1549</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">PV2</td>
                    <td className="py-2">641.2</td>
                    <td className="py-2">2.3</td>
                    <td className="py-2 pr-2 font-semibold text-slate-900">1475</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">PV3</td>
                    <td className="py-2">659.9</td>
                    <td className="py-2">2.4</td>
                    <td className="py-2 pr-2 font-semibold text-slate-900">1584</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">PV4</td>
                    <td className="py-2">666</td>
                    <td className="py-2">2.4</td>
                    <td className="py-2 pr-2 font-semibold text-slate-900">1598</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* AC Table Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 space-y-2">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                <span>AC</span>
              </div>

              <table className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 text-[11px] border-b border-gray-100">
                    <th className="py-2 text-left font-normal pl-2"></th>
                    <th className="py-2 font-normal">Voltage(V)</th>
                    <th className="py-2 font-normal">Current(A)</th>
                    <th className="py-2 font-normal pr-2">Frequency(Hz)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 font-mono text-slate-800">
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">L1</td>
                    <td className="py-2">236.3</td>
                    <td className="py-2">4.3</td>
                    <td className="py-2 pr-2">49.75</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">L2</td>
                    <td className="py-2">235.1</td>
                    <td className="py-2">9.1</td>
                    <td className="py-2 pr-2">49.75</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left pl-2 font-sans font-medium text-slate-500">L3</td>
                    <td className="py-2">234.8</td>
                    <td className="py-2">5.2</td>
                    <td className="py-2 pr-2">49.75</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Generation Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">Generation</h3>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500">Daily Full Load Hours</span>
                <span className="font-mono font-bold text-slate-900">2.02h</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Yield</span>
                <span className="font-mono font-bold text-slate-900">101.1kWh</span>
              </div>
            </div>

            {/* Battery Subsystem Card (Clickable -> Analysis) */}
            <div
              onClick={() => {
                setActiveBottomTab("Analysis");
                setAnalysisSubTab("Battery");
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2 cursor-pointer hover:border-orange-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#f37021] transition-colors">Battery</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#f37021] transition-colors" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500">SOC</span>
                <span className="font-mono font-bold text-slate-900">100%/36%</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">SOH</span>
                <span className="font-mono font-bold text-slate-900">100%/100%</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Power</span>
                <span className="font-mono font-bold text-slate-900">0kW</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Charge</span>
                <span className="font-mono font-bold text-slate-900">49.8kWh</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Discharge</span>
                <span className="font-mono font-bold text-slate-900">12.4kWh</span>
              </div>
            </div>

            {/* Grid Subsystem Card (Clickable -> Analysis) */}
            <div
              onClick={() => {
                setActiveBottomTab("Analysis");
                setAnalysisSubTab("Grid");
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2 cursor-pointer hover:border-orange-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#f37021] transition-colors">Grid</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#f37021] transition-colors" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500">Total Power</span>
                <span className="font-mono font-bold text-slate-900">0kW</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Import</span>
                <span className="font-mono font-bold text-slate-900">23.3kWh</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Export</span>
                <span className="font-mono font-bold text-slate-900">19.5kWh</span>
              </div>
            </div>

            {/* Load Subsystem Card (Clickable -> Analysis) */}
            <div
              onClick={() => {
                setActiveBottomTab("Analysis");
                setAnalysisSubTab("Load");
              }}
              className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-2 cursor-pointer hover:border-orange-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#f37021] transition-colors">Load</h3>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#f37021] transition-colors" />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-500">Load Power</span>
                <span className="font-mono font-bold text-slate-900">5.8kW</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-t border-gray-50">
                <span className="text-slate-500">Daily Consumption</span>
                <span className="font-mono font-bold text-slate-900">62.7kWh</span>
              </div>
            </div>

            {/* Genset Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900">Genset</h3>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ */}
        {/* TAB 2: ANALYSIS TAB (Exact Screenshot 4 Parity)         */}
        {/* ------------------------------------------------------ */}
        {activeBottomTab === "Analysis" && (
          <div className="space-y-3">
            {/* Sub-tabs: Generation | Battery | Grid | Load */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
              {(["Generation", "Battery", "Grid", "Load"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAnalysisSubTab(tab)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    analysisSubTab === tab
                      ? "border border-orange-300 bg-orange-50/70 text-[#f37021] shadow-2xs"
                      : "border border-gray-200 bg-white text-slate-500 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Top 3-Stat Yield Banner */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-bold text-slate-900 font-mono">101.1kWh</p>
                <span className="text-[10px] text-slate-400">Daily Yield</span>
              </div>
              <div className="border-x border-gray-100">
                <p className="text-xs font-bold text-slate-900 font-mono">2.038MWh</p>
                <span className="text-[10px] text-slate-400">Monthly Yield</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 font-mono">9.328MWh</p>
                <span className="text-[10px] text-slate-400">Total Yield</span>
              </div>
            </div>

            {/* Interactive Chart Box */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3">
              {/* Date & Granularity Selector Header */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                {/* < Date > */}
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                  <button onClick={handlePrevDate} className="text-slate-400 hover:text-[#f37021]">
                    &lt;
                  </button>
                  <span className="font-mono text-slate-800 text-[11px] px-1 font-semibold">
                    {currentDateStr}
                  </span>
                  <button onClick={handleNextDate} className="text-slate-400 hover:text-[#f37021]">
                    &gt;
                  </button>
                </div>

                {/* Dropdown for Day | Month | Year | Lifetime */}
                <select
                  value={granularity}
                  onChange={(e) => handleChangeGranularity(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="Day">Day</option>
                  <option value="Month">Month</option>
                  <option value="Year">Year</option>
                  <option value="Lifetime">Lifetime</option>
                </select>
              </div>

              {/* Daily Stats Summary */}
              <div className="flex items-center justify-between text-xs py-1">
                <div>
                  <p className="font-bold text-slate-900 font-mono">101.1kWh</p>
                  <span className="text-[10px] text-slate-400">Daily Yield</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 font-mono">0PKR</p>
                  <span className="text-[10px] text-slate-400">Daily Earning</span>
                </div>
                <div>
                  <p className="font-bold text-slate-900 font-mono">2.02h</p>
                  <span className="text-[10px] text-slate-400">Full Load Hours</span>
                </div>

                <div className="flex items-center gap-1.5 pl-2">
                  <button
                    onClick={() => alert("Filter chart parameters")}
                    className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-slate-500"
                    title="Filter Parameters"
                  >
                    <Filter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsFullScreenChart(!isFullScreenChart)}
                    className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-slate-500"
                    title="Expand View"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Chart Canvas */}
              <div
                ref={chartRef}
                className="w-full"
                style={{ height: isFullScreenChart ? "360px" : "240px" }}
              />

              {/* PV Power Switch Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPvPower(!showPvPower)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    showPvPower ? "bg-[#f37021]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      showPvPower ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-slate-700">
                  {analysisSubTab === "Generation" ? "PV Power" : `${analysisSubTab} Power`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ */}
        {/* TAB 3: ALARM TAB (Exact Screenshot 5 Parity)            */}
        {/* ------------------------------------------------------ */}
        {activeBottomTab === "Alarm" && (
          <div className="space-y-3">
            {/* Sub-tabs: Current | History */}
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {(["Current", "History"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAlarmSubTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    alarmSubTab === tab
                      ? "border border-orange-300 bg-orange-50/70 text-[#f37021] shadow-2xs"
                      : "border border-gray-200 bg-white text-slate-500 hover:bg-gray-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Alarm Cards List */}
            <div className="space-y-2.5">
              {/* Alarm Item 1: 107C UN-V-Batt2 */}
              <div
                onClick={() =>
                  setSelectedAlarmForModal({
                    id: 1,
                    alarmCode: "107C",
                    alarmName: "UN-V-Batt2 (Battery 2 Under-Voltage)",
                    severity: "Warning",
                    deviceSn: device.sn,
                    plantName: plantName,
                    beginTime: "20/11/2026 00:26 (UTC+05:00)",
                    endTime: "--",
                    duration: "Ongoing",
                    status: "Active",
                  })
                }
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 space-y-2 cursor-pointer hover:border-orange-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-[#f37021] border border-orange-200">
                      Warning
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      107C | UN-V-Batt2
                    </span>
                  </div>
                  <span className="text-xs font-bold text-red-600">Active</span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>
                    {plantName} {device.type}: <span className="font-mono">{device.sn}</span>
                  </p>
                  <p className="font-mono text-slate-400">
                    20/11/2026 00:26 (UTC+05:00) ~ Ongoing
                  </p>
                </div>
              </div>

              {/* Alarm Item 2: 107D NO-Battery2 */}
              <div
                onClick={() =>
                  setSelectedAlarmForModal({
                    id: 2,
                    alarmCode: "107D",
                    alarmName: "NO-Battery2 (Battery 2 Disconnected)",
                    severity: "Notice",
                    deviceSn: device.sn,
                    plantName: plantName,
                    beginTime: "20/11/2026 00:26 (UTC+05:00)",
                    endTime: "--",
                    duration: "Ongoing",
                    status: "Active",
                  })
                }
                className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5 space-y-2 cursor-pointer hover:border-orange-300 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Info
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      107D | NO-Battery2
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  </div>
                  <span className="text-xs font-bold text-red-600">Active</span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>
                    {plantName} {device.type}: <span className="font-mono">{device.sn}</span>
                  </p>
                  <p className="font-mono text-slate-400">
                    20/11/2026 00:26 (UTC+05:00) ~ Ongoing
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ */}
        {/* TAB 4: INFO TAB (Exact Screenshot 6 Parity)             */}
        {/* ------------------------------------------------------ */}
        {activeBottomTab === "Info" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs divide-y divide-gray-100 text-xs">
            {/* SN */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">SN</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>{device.sn}</span>
                <button
                  onClick={() => handleCopy(device.sn)}
                  className="text-slate-400 hover:text-[#f37021]"
                  title="Copy SN"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Model */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Model</span>
              <span className="font-mono text-slate-900">5305</span>
            </div>

            {/* Series */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Series</span>
              <span className="font-mono text-slate-900">S6-EH3P50K-H</span>
            </div>

            {/* Plant */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Plant</span>
              <span
                onClick={() => onSelectPlant && onSelectPlant(plantId)}
                className="font-medium text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{plantName}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#f37021]" />
              </span>
            </div>

            {/* Datalogger */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Datalogger</span>
              <span
                onClick={() => onSelectDevice && onSelectDevice("7A12551308F022F8", "Datalogger")}
                className="font-mono font-medium text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>7A12551308F022F8</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#f37021]" />
              </span>
            </div>

            {/* Ambient Temperature */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-500">
                <span>Inverter Internal Operating Ambient Temperature</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900">33.8°C</span>
                <span className="text-[10px] text-slate-400 block">(Up To)105°C</span>
              </div>
            </div>

            {/* Commissioning Date */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-1 text-slate-500">
                <span>Commissioning Date</span>
                <HelpCircle className="w-3 h-3 text-slate-400" />
              </div>
              <span className="font-mono text-slate-900">23/06/2026</span>
            </div>

            {/* Warranty Status */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Warranty Status</span>
              <span className="text-slate-900 font-medium">Under Warranty</span>
            </div>

            {/* Warranty Expiry Date */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Warranty Expiry Date</span>
              <span className="font-mono text-slate-900">23/11/2030</span>
            </div>

            {/* Remark */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Remark</span>
              {isEditingRemark ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="border border-orange-300 rounded px-1.5 py-0.5 text-xs text-slate-900 w-24"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsEditingRemark(false)}
                    className="p-1 rounded bg-orange-50 text-[#f37021]"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="font-mono">{remark}</span>
                  <button
                    onClick={() => setIsEditingRemark(true)}
                    className="hover:text-slate-700"
                    title="Edit Remark"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* National Standard */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">National Standard</span>
              <span className="font-mono text-slate-900">IEC61727L</span>
            </div>

            {/* AFCI Software Version */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">AFCI Software Version</span>
              <span className="font-mono text-slate-900">0</span>
            </div>

            {/* G100 Status */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">G100 Status</span>
              <span className="font-mono text-slate-900">OFF</span>
            </div>

            {/* Bypass Status */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Bypass Status</span>
              <span className="font-mono text-slate-900">OFF</span>
            </div>

            {/* Address */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="text-slate-500">Address</span>
              <span className="font-mono text-slate-900">1</span>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* FLOATING 4-TAB BOTTOM NAVIGATION                         */}
      {/* Data | Analysis | Alarm ● | Info                          */}
      {/* ======================================================== */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-full px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-1.5 text-xs font-semibold pointer-events-auto">
          {/* Data */}
          <button
            onClick={() => setActiveBottomTab("Data")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomTab === "Data"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Data
          </button>

          {/* Analysis */}
          <button
            onClick={() => setActiveBottomTab("Analysis")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomTab === "Analysis"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Analysis
          </button>

          {/* Alarm with red notification dot */}
          <button
            onClick={() => setActiveBottomTab("Alarm")}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${
              activeBottomTab === "Alarm"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            <span>Alarm</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeBottomTab === "Alarm" ? "bg-white" : "bg-red-500 animate-pulse"
              }`}
            />
          </button>

          {/* Info */}
          <button
            onClick={() => setActiveBottomTab("Info")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomTab === "Info"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Alarm Detail Modal */}
      <SolisAlarmDetailModal
        alarm={selectedAlarmForModal}
        isOpen={Boolean(selectedAlarmForModal)}
        onClose={() => setSelectedAlarmForModal(null)}
        onViewDevice={(sn) => {
          setSelectedAlarmForModal(null);
          if (onSelectDevice) onSelectDevice(sn, "Inverter");
        }}
      />
    </div>
  );
}
