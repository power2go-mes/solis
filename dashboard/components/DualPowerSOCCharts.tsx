"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as echarts from "echarts";
import { RotateCw, ChevronLeft, ChevronRight, Calendar, Radio } from "lucide-react";
import { ChartSeriesData } from "@/lib/db";

interface DualPowerSOCChartsProps {
  stationId: string;
  plantName: string;
}

function getPktToday(): string {
  // PKT is UTC+5
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function getPktCurrentMonth(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 7);
}

export default function DualPowerSOCCharts({
  stationId,
  plantName,
}: DualPowerSOCChartsProps) {
  const [range, setRange] = useState<"day" | "month">("day");
  const [currentDate, setCurrentDate] = useState<string>(getPktToday);
  const [currentMonth, setCurrentMonth] = useState<string>(getPktCurrentMonth);
  const [chartData, setChartData] = useState<ChartSeriesData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const powerChartRef = useRef<HTMLDivElement>(null);
  const socChartRef = useRef<HTMLDivElement>(null);
  const powerChartInstance = useRef<echarts.ECharts | null>(null);
  const socChartInstance = useRef<echarts.ECharts | null>(null);

  // Fetch chart data from Supabase-backed API
  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        let url = `/api/telemetry/curve?stationId=${stationId}&range=${range}`;
        if (range === "day") {
          url += `&date=${currentDate}`;
        } else if (range === "month") {
          url += `&date=${currentMonth}`;
        }
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();
        if (data.success && data.chartData) {
          setChartData(data.chartData);
        }
      } catch (err) {
        console.error("Failed to load curve data:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [stationId, range, currentDate, currentMonth]
  );

  // Initial load and automated 2-minute refresh
  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => {
      fetchData(false); // silent 2-minute auto-refresh from database
    }, 120_000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Date Navigation handlers
  const handlePrevDate = () => {
    if (range === "day") {
      const [y, m, d] = currentDate.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateObj.setUTCDate(dateObj.getUTCDate() - 1);
      setCurrentDate(dateObj.toISOString().slice(0, 10));
    } else {
      const [y, m] = currentMonth.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 2, 1));
      const newY = dateObj.getUTCFullYear();
      const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      setCurrentMonth(`${newY}-${newM}`);
    }
  };

  const handleNextDate = () => {
    if (range === "day") {
      const [y, m, d] = currentDate.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateObj.setUTCDate(dateObj.getUTCDate() + 1);
      setCurrentDate(dateObj.toISOString().slice(0, 10));
    } else {
      const [y, m] = currentMonth.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m, 1));
      const newY = dateObj.getUTCFullYear();
      const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      setCurrentMonth(`${newY}-${newM}`);
    }
  };

  const handleResetToCurrent = () => {
    if (range === "day") {
      setCurrentDate(getPktToday());
    } else {
      setCurrentMonth(getPktCurrentMonth());
    }
  };

  // Render ECharts
  useEffect(() => {
    if (!powerChartRef.current || !socChartRef.current || !chartData) return;
    if (
      powerChartRef.current.clientWidth === 0 ||
      powerChartRef.current.clientHeight === 0 ||
      socChartRef.current.clientWidth === 0 ||
      socChartRef.current.clientHeight === 0
    ) {
      return;
    }

    if (!powerChartInstance.current) {
      powerChartInstance.current = echarts.init(powerChartRef.current);
    }
    if (!socChartInstance.current) {
      socChartInstance.current = echarts.init(socChartRef.current);
    }

    const powerChart = powerChartInstance.current;
    const socChart = socChartInstance.current;

    // Connect tooltip syncing between top and bottom charts
    echarts.connect([powerChart, socChart]);

    const {
      timeLabels,
      pvData,
      gridData,
      batteryData,
      loadData,
      socData,
      purchaseTariffData,
      feedInTariffData,
      unit,
      rangeType,
      currentNowIndex = -1,
    } = chartData;

    // 1. Top Power Curve Option (Matches screenshot)
    const powerOption: echarts.EChartsOption = {
      animationDuration: 600,
      grid: {
        left: 45,
        right: 45,
        top: 25,
        bottom: 25,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#94a3b8", width: 1, type: "dashed" },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#1e293b", fontSize: 12 },
        extraCssText:
          "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 8px;",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const time = params[0].axisValue;
          let html = `<div style="font-weight:700;color:#0f172a;margin-bottom:8px;font-size:12px;display:flex;align-items:center;gap:6px;">
            <span>${time}</span>
            <span style="font-size:10px;color:#64748b;font-weight:normal;">(UTC+05:00) DST ON</span>
          </div>`;

          params.forEach((item: any) => {
            let label = item.seriesName;
            const val = Number(item.value ?? 0);
            if (label === "Grid") {
              label = val >= 0 ? "Grid(Exporting)" : "Grid(Importing)";
            } else if (label === "Battery") {
              label = "Battery";
            }

            html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:28px;padding:3px 0;font-size:12px;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color};"></span>
                <span style="color:#475569;">${label}</span>
              </span>
              <span style="font-weight:700;font-family:monospace;color:#0f172a;">${Math.abs(val).toFixed(2)} ${unit}</span>
            </div>`;
          });
          return html;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: rangeType !== "day",
        data: timeLabels,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
          interval: rangeType === "day" ? 23 : "auto",
        },
      },
      yAxis: {
        type: "value",
        name: unit,
        nameTextStyle: {
          color: "#94a3b8",
          fontSize: 11,
          align: "right",
          padding: [0, 8, 4, 0],
        },
        splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
        axisLabel: { color: "#94a3b8", fontSize: 11 },
      },
      series: [
        {
          name: "PV",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: pvData,
          itemStyle: { color: "#facc15" },
          lineStyle: { width: 2, color: "#facc15" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(250, 204, 21, 0.25)" },
              { offset: 1, color: "rgba(250, 204, 21, 0.02)" },
            ]),
          },
        },
        {
          name: "Grid",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: gridData,
          itemStyle: { color: "#0284c7" },
          lineStyle: { width: 2, color: "#0284c7" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(2, 132, 199, 0.20)" },
              { offset: 1, color: "rgba(2, 132, 199, 0.02)" },
            ]),
          },
        },
        {
          name: "Battery",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: batteryData,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 2, color: "#10b981" },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(16, 185, 129, 0.16)" },
              { offset: 1, color: "rgba(16, 185, 129, 0.01)" },
            ]),
          },
        },
        {
          name: "Total Load",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: loadData,
          itemStyle: { color: "#8b5cf6" },
          lineStyle: { width: 2, color: "#8b5cf6" },
        },
      ],
    };

    // 2. Bottom SOC & Tariff Option (Matches screenshot)
    const markLineOpt =
      currentNowIndex >= 0 && rangeType === "day"
        ? {
            symbol: ["none", "none"],
            data: [
              {
                xAxis: currentNowIndex,
                lineStyle: {
                  color: "#f97316",
                  type: "dashed",
                  width: 1.5,
                },
                label: {
                  show: true,
                  formatter: "Now",
                  position: "end",
                  color: "#f97316",
                  fontSize: 11,
                  fontWeight: "bold",
                },
              },
            ],
          }
        : undefined;

    const socOption: echarts.EChartsOption = {
      animationDuration: 600,
      grid: {
        left: 45,
        right: 45,
        top: 25,
        bottom: 25,
        containLabel: true,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "line",
          lineStyle: { color: "#94a3b8", width: 1, type: "dashed" },
        },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: "#1e293b", fontSize: 12 },
        extraCssText:
          "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border-radius: 8px;",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const time = params[0].axisValue;
          let html = `<div style="font-weight:700;color:#0f172a;margin-bottom:8px;font-size:12px;display:flex;align-items:center;gap:6px;">
            <span>${time}</span>
            <span style="font-size:10px;color:#64748b;font-weight:normal;">(UTC+05:00)</span>
          </div>`;

          params.forEach((item: any) => {
            const val = Number(item.value ?? 0);
            const unitSuffix = item.seriesName === "SOC" ? "%" : "PKR/kWh";

            html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:28px;padding:3px 0;font-size:12px;">
              <span style="display:flex;align-items:center;gap:8px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color};"></span>
                <span style="color:#475569;">${item.seriesName}</span>
              </span>
              <span style="font-weight:700;font-family:monospace;color:#0f172a;">${val.toFixed(2)} ${unitSuffix}</span>
            </div>`;
          });
          return html;
        },
      },
      xAxis: {
        type: "category",
        boundaryGap: rangeType !== "day",
        data: timeLabels,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
          interval: rangeType === "day" ? 23 : "auto",
        },
      },
      yAxis: [
        {
          type: "value",
          name: "%",
          min: 0,
          max: 100,
          interval: 20,
          nameTextStyle: {
            color: "#94a3b8",
            fontSize: 11,
            align: "right",
            padding: [0, 8, 4, 0],
          },
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 11 },
        },
        {
          type: "value",
          name: "PKR/kWh",
          min: 0,
          max: 5,
          interval: 1,
          nameTextStyle: {
            color: "#94a3b8",
            fontSize: 11,
            align: "left",
            padding: [0, 0, 4, 8],
          },
          splitLine: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 11 },
        },
      ],
      series: [
        {
          name: "SOC",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: socData,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 2, color: "#10b981" },
          markLine: markLineOpt as any,
        },
        {
          name: "Purchase Tariff",
          type: "line",
          yAxisIndex: 1,
          showSymbol: false,
          data: purchaseTariffData || [],
          itemStyle: { color: "#38bdf8" },
          lineStyle: { width: 1.5, color: "#38bdf8", type: "dotted" },
        },
        {
          name: "Feed-in Tariff",
          type: "line",
          yAxisIndex: 1,
          showSymbol: false,
          data: feedInTariffData || [],
          itemStyle: { color: "#2563eb" },
          lineStyle: { width: 1.5, color: "#2563eb", type: "dotted" },
        },
      ],
    };

    powerChart.setOption(powerOption, true);
    socChart.setOption(socOption, true);

    const handleResize = () => {
      powerChart.resize();
      socChart.resize();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      powerChartInstance.current?.dispose();
      socChartInstance.current?.dispose();
    };
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Time Range Selector Bar (Strictly Daily & Month filters) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Daily & Month Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setRange("day")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              range === "day"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setRange("month")}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              range === "month"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Month
          </button>
        </div>

        {/* Date Navigator Controls */}
        <div className="flex items-center gap-2">
          {range === "day" ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <button
                onClick={handlePrevDate}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent border-0 text-xs font-mono font-medium text-slate-800 focus:outline-hidden px-1"
              />
              <button
                onClick={handleNextDate}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetToCurrent}
                className="ml-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 hover:bg-sky-200 transition-colors"
              >
                Today
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs">
              <button
                onClick={handlePrevDate}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="bg-transparent border-0 text-xs font-mono font-medium text-slate-800 focus:outline-hidden px-1"
              />
              <button
                onClick={handleNextDate}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetToCurrent}
                className="ml-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 hover:bg-sky-200 transition-colors"
              >
                This Month
              </button>
            </div>
          )}

          {/* Quick Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors ml-1"
            title="Refresh Charts"
          >
            <RotateCw
              className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Chart 1: Power Graph (Exact match to SolisCloud screenshot) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative">
        <div className="flex items-center justify-between mb-2 px-2">
          {/* Legend Items */}
          <div className="flex items-center gap-6 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
              <span>PV</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
              <span>Grid</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Battery</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span>
              <span>Total Load</span>
            </span>
          </div>

          {/* Refresh icon */}
          <button
            onClick={() => fetchData(true)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Empty / Offline Banner */}
        {!loading && (!chartData || chartData.timeLabels.length === 0) && (
          <div className="absolute inset-x-4 top-14 bottom-4 bg-white/90 backdrop-blur-2xs flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 z-10 p-6 text-center animate-in fade-in duration-300">
            <Radio className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
            <h4 className="font-bold text-sm text-slate-800">No Telemetry Recorded on {currentDate}</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              The datalogger for {plantName} was offline or has not transmitted curves to SolisCloud for this date.
            </p>
            <button
              onClick={() => {
                const [y, m, d] = currentDate.split("-").map(Number);
                const prev = new Date(Date.UTC(y, m - 1, d - 1));
                setCurrentDate(prev.toISOString().slice(0, 10));
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition-colors shadow-2xs"
            >
              ← View Previous Day with Data
            </button>
          </div>
        )}

        {/* Top Chart Canvas */}
        <div
          ref={powerChartRef}
          className="w-full h-[270px]"
          style={{ width: "100%", height: "270px" }}
        />
      </div>

      {/* Chart 2: SOC & Tariff Graph (Exact match to SolisCloud screenshot) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs relative">
        <div className="flex items-center justify-between mb-2 px-2">
          {/* Legend Items */}
          <div className="flex items-center gap-6 text-xs font-medium text-slate-700">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>SOC</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
              <span>Purchase Tariff</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
              <span>Feed-in Tariff</span>
            </span>
          </div>

          {/* Refresh icon */}
          <button
            onClick={() => fetchData(true)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Bottom Chart Canvas */}
        <div
          ref={socChartRef}
          className="w-full h-[270px]"
          style={{ width: "100%", height: "270px" }}
        />
      </div>
    </div>
  );
}
