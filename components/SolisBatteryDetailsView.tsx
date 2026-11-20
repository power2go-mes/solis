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
  Heart,
  Calendar,
  Download,
  Info,
  ChevronRight as ChevronRightIcon,
  Sliders,
} from "lucide-react";

interface SolisBatteryDetailsViewProps {
  batterySn?: string;
  plantName?: string;
  plantId?: string;
  connectedInverterSn?: string;
  dataloggerSn?: string;
  onBackToDevices: () => void;
  onOpenOperationLog?: () => void;
  onSelectInverter?: (sn: string) => void;
  onSelectPlantByName?: (plantName: string) => void;
}

export default function SolisBatteryDetailsView({
  batterySn = "1053050255210107BAT01",
  plantName = "P2G 50KW",
  plantId = "3212F1",
  connectedInverterSn = "1053050255210107",
  dataloggerSn = "7A12551308F022F8",
  onBackToDevices,
  onOpenOperationLog,
  onSelectInverter,
  onSelectPlantByName,
}: SolisBatteryDetailsViewProps) {
  const [selectedSn, setSelectedSn] = useState(batterySn);
  const [copied, setCopied] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year" | "Lifetime">("Day");
  const [currentDateStr, setCurrentDateStr] = useState("20/11/2026");

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

  // ECharts setup for Battery Charge / Discharge / SOC
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    let option: echarts.EChartsOption = {};

    if (activeDateTab === "Day") {
      const times: string[] = [];
      const powerData: (number | null)[] = [];
      const socData: (number | null)[] = [];

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          times.push(`${hh}:${mm}`);

          const mins = h * 60 + m;
          if (mins <= 920) {
            if (mins < 360) {
              powerData.push(0);
              socData.push(50);
            } else if (mins >= 360 && mins <= 480) {
              // Discharging
              powerData.push(-1.5);
              socData.push(Number((50 - ((mins - 360) / 120) * 14).toFixed(1)));
            } else if (mins > 480 && mins <= 850) {
              // Charging
              const chg = Math.min(15, Math.sin(((mins - 480) / 370) * Math.PI) * 12);
              powerData.push(Number(chg.toFixed(2)));
              socData.push(Number((36 + ((mins - 480) / 370) * 64).toFixed(1)));
            } else {
              powerData.push(0);
              socData.push(100);
            }
          } else {
            powerData.push(null);
            socData.push(null);
          }
        }
      }

      option = {
        animation: false,
        grid: { top: 35, left: 45, right: 45, bottom: 30 },
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "#10b981",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 11 },
        },
        xAxis: {
          type: "category",
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10, interval: 12 },
        },
        yAxis: [
          {
            type: "value",
            name: "kW",
            max: 20,
            min: -5,
            interval: 5,
            splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          {
            type: "value",
            name: "SOC (%)",
            max: 100,
            min: 0,
            interval: 20,
            splitLine: { show: false },
            axisLabel: { color: "#10b981", fontSize: 10 },
          },
        ],
        series: [
          {
            name: "Battery Power",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: powerData,
            lineStyle: { color: "#10b981", width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(16, 185, 129, 0.35)" },
                { offset: 1, color: "rgba(16, 185, 129, 0.02)" },
              ]),
            },
          },
          {
            name: "SOC",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            showSymbol: false,
            data: socData,
            lineStyle: { color: "#06b6d4", width: 2, type: "dashed" },
          },
        ],
      };
    } else if (activeDateTab === "Month") {
      const days = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0"));
      const chargeData = new Array(30).fill(null);
      const dischargeData = new Array(30).fill(null);

      chargeData[17] = 25.0;
      dischargeData[17] = 12.0;

      chargeData[18] = 49.8;
      dischargeData[18] = 12.4;

      chargeData[19] = 28.4;
      dischargeData[19] = 41.3;

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
          max: 60,
          interval: 12,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Daily Charge", type: "bar", data: chargeData, itemStyle: { color: "#10b981" } },
          { name: "Daily Discharge", type: "bar", data: dischargeData, itemStyle: { color: "#14b8a6" } },
        ],
      };
    } else if (activeDateTab === "Year") {
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const chargeData = new Array(12).fill(null);
      const dischargeData = new Array(12).fill(null);

      chargeData[10] = 80.4;
      dischargeData[10] = 53.0;

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
          max: 120,
          interval: 24,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Monthly Charge", type: "bar", data: chargeData, itemStyle: { color: "#10b981" } },
          { name: "Monthly Discharge", type: "bar", data: dischargeData, itemStyle: { color: "#14b8a6" } },
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
          { name: "Total Charge", type: "bar", data: [0, 0.8, 2.4], itemStyle: { color: "#10b981" } },
          { name: "Total Discharge", type: "bar", data: [0, 0.7, 2.1], itemStyle: { color: "#14b8a6" } },
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
  }, [activeDateTab, currentDateStr, selectedSn]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      {/* 1. Left Sidebar: Battery List */}
      <div className="w-full lg:w-64 bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-col shrink-0">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
          Battery Storage Units
        </h3>

        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {[
            { sn: "1053050255210107BAT01", name: "Battery Unit 1", status: "Online", soc: 100 },
            { sn: "1053050255210107BAT02", name: "Battery Unit 2", status: "Online", soc: 36 },
          ].map((bat) => (
            <div
              key={bat.sn}
              onClick={() => setSelectedSn(bat.sn)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                bat.sn === selectedSn
                  ? "border-[#10b981] bg-emerald-50/50 text-emerald-800 font-semibold shadow-2xs"
                  : "border-transparent bg-gray-50/60 hover:bg-gray-100/70 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{bat.name}</span>
                <span className="font-mono text-emerald-600 font-bold">{bat.soc}%</span>
              </div>
              <div className="font-mono text-[11px] opacity-80 truncate">{bat.sn}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 space-y-4 w-full min-w-0">
        {/* Top Header */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDevices}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-slate-700 hover:bg-gray-50 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Device Details</span>
            </button>

            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              Online
            </span>

            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900">Battery</h2>
              <button
                onClick={() => alert(`Edit Battery ${selectedSn} settings`)}
                className="text-slate-400 hover:text-[#10b981] p-1"
                title="Edit Battery"
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
              Plant ID: <strong className="text-slate-800">{plantId}</strong> | {currentDateStr} 15:21:45 (UTC+05:00)
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

        {/* Card 1: Battery Graphic & Metadata */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50/60 border border-gray-100 w-full md:w-56 shrink-0">
            <div className="relative w-36 h-36">
              <Image
                src="/images/solis_battery_card.jpg"
                alt="Solis Battery Storage"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-800">
              <span>SN: {selectedSn}</span>
              <button
                onClick={() => handleCopy(selectedSn)}
                className="text-slate-400 hover:text-[#10b981]"
                title="Copy SN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3.5 text-xs w-full">
            <div>
              <span className="text-slate-500 text-[11px] block">Model</span>
              <span className="font-medium text-slate-900">HV LiFePO4 51.2V 100Ah</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Series</span>
              <span className="font-medium text-slate-900">HV Energy Storage Module</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Nominal Capacity</span>
              <span className="font-medium text-slate-900 font-mono">100Ah (5.12kWh)</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Plant</span>
              <span
                onClick={() => onSelectPlantByName && onSelectPlantByName(plantName)}
                className="font-medium text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{plantName}</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Connected Inverter</span>
              <span
                onClick={() => onSelectInverter && onSelectInverter(connectedInverterSn)}
                className="font-mono text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{connectedInverterSn.slice(0, 10)}...</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Warranty Status</span>
              <span className="text-emerald-700 font-medium">Under Warranty</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Commissioning Date</span>
              <span className="text-slate-900 font-mono">16/08/2025</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Warranty Expiry</span>
              <span className="text-slate-900 font-mono">16/08/2030</span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">BMS Firmware</span>
              <span className="text-slate-900 font-mono">V2.1.4</span>
            </div>
          </div>
        </div>

        {/* Card 2: Real-time Information */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Real-time Information
            </h3>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">State of Charge (SOC)</span>
              <p className="text-lg font-bold text-emerald-700 font-mono mt-0.5">100% / 36%</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">State of Health (SOH)</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">100%</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">Daily Charge</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">49.8kWh</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">Daily Discharge</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">12.4kWh</p>
            </div>
          </div>
        </div>

        {/* Card 3: Battery Chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">
              Battery Chart <span className="font-mono text-slate-500 font-normal">SN: {selectedSn}</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                <button onClick={handlePrevDate} className="text-slate-400 hover:text-[#10b981]">
                  &lt;
                </button>
                <span className="font-mono text-slate-800 text-[11px] px-1 font-semibold">{currentDateStr}</span>
                <button onClick={handleNextDate} className="text-slate-400 hover:text-[#10b981]">
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
                        ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-300"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => alert("Exporting Battery Data CSV")}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-slate-500"
                title="Download Data"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div ref={chartRef} className="w-full h-72 sm:h-80" />
        </div>
      </div>
    </div>
  );
}
