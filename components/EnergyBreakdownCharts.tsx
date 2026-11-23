"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as echarts from "echarts";
import { ChevronLeft, ChevronRight, RotateCw, Calendar } from "lucide-react";
import { EnergyBreakdownResult, EnergyBreakdownSummary } from "@/lib/types";

interface EnergyBreakdownChartsProps {
  stationId: string;
  plantName: string;
}

function getPktCurrentMonth(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 7);
}

function getPktCurrentYear(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 4);
}

const SERIES_CONFIG = [
  { name: "PV", color: "#f5e026" },
  { name: "Import", color: "#38bdf8" },
  { name: "Export", color: "#0284c7" },
  { name: "Charge", color: "#15803d" },
  { name: "Discharge", color: "#10b981" },
  { name: "Consumption", color: "#8b5cf6" },
];

export default function EnergyBreakdownCharts({
  stationId,
  plantName,
}: EnergyBreakdownChartsProps) {
  // Monthly Chart State
  const [currentMonth, setCurrentMonth] = useState<string>(getPktCurrentMonth);
  const [monthlyData, setMonthlyData] = useState<EnergyBreakdownResult | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState<boolean>(true);

  // Annual Chart State
  const [currentYear, setCurrentYear] = useState<string>(getPktCurrentYear);
  const [annualData, setAnnualData] = useState<EnergyBreakdownResult | null>(null);
  const [annualLoading, setAnnualLoading] = useState<boolean>(true);

  // Chart DOM refs
  const monthlyChartRef = useRef<HTMLDivElement>(null);
  const annualChartRef = useRef<HTMLDivElement>(null);
  const monthlyInstanceRef = useRef<echarts.ECharts | null>(null);
  const annualInstanceRef = useRef<echarts.ECharts | null>(null);

  // Fetch Monthly Data
  const fetchMonthlyData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setMonthlyLoading(true);
      try {
        const res = await fetch(
          `/api/energy/breakdown?stationId=${stationId}&period=month&date=${currentMonth}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          setMonthlyData(json.data);
        }
      } catch (err) {
        console.error("Failed to load monthly energy breakdown:", err);
      } finally {
        if (isInitial) setMonthlyLoading(false);
      }
    },
    [stationId, currentMonth]
  );

  // Fetch Annual Data
  const fetchAnnualData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setAnnualLoading(true);
      try {
        const res = await fetch(
          `/api/energy/breakdown?stationId=${stationId}&period=year&date=${currentYear}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data) {
          setAnnualData(json.data);
        }
      } catch (err) {
        console.error("Failed to load annual energy breakdown:", err);
      } finally {
        if (isInitial) setAnnualLoading(false);
      }
    },
    [stationId, currentYear]
  );

  // Initial load when stationId or dates change
  useEffect(() => {
    fetchMonthlyData(true);
  }, [fetchMonthlyData]);

  useEffect(() => {
    fetchAnnualData(true);
  }, [fetchAnnualData]);

  // Automated 2-minute refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMonthlyData(false);
      fetchAnnualData(false);
    }, 120_000);

    return () => clearInterval(interval);
  }, [fetchMonthlyData, fetchAnnualData]);

  // Date Navigation: Monthly
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 2, 1));
    const newY = dateObj.getUTCFullYear();
    const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m, 1));
    const newY = dateObj.getUTCFullYear();
    const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    setCurrentMonth(`${newY}-${newM}`);
  };

  // Date Navigation: Annual
  const handlePrevYear = () => {
    const y = Number(currentYear);
    setCurrentYear(String(y - 1));
  };

  const handleNextYear = () => {
    const y = Number(currentYear);
    setCurrentYear(String(y + 1));
  };

  // Render Monthly ECharts Grouped Bar Chart
  useEffect(() => {
    if (!monthlyChartRef.current) return;

    let chart = echarts.getInstanceByDom(monthlyChartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(monthlyChartRef.current);
    }
    monthlyInstanceRef.current = chart;

    if (!monthlyData || monthlyData.labels.length === 0) {
      chart.clear();
      return;
    }

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 600,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(250, 204, 21, 0.08)",
          },
        },
        padding: 0,
        borderWidth: 0,
        backgroundColor: "transparent",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const dataIndex = params[0].dataIndex;
          const headerDate =
            monthlyData.tooltipDates[dataIndex] ||
            `${monthlyData.labels[dataIndex]}/${currentMonth.split("-")[1]}/${currentMonth.split("-")[0]}`;

          let rowsHtml = "";
          params.forEach((item: any) => {
            const val = item.value !== null && item.value !== undefined ? item.value : 0;
            rowsHtml += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 7px; color: #475569;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${item.color};"></span>
                  <span style="font-weight: 500;">${item.seriesName}</span>
                </div>
                <div style="font-weight: 700; color: #0f172a; margin-left: 20px; font-family: monospace;">
                  ${val} kWh
                </div>
              </div>
            `;
          });

          return `
            <div style="min-width: 190px; padding: 12px 14px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; font-family: system-ui, sans-serif;">
              <div style="font-weight: 600; color: #1e293b; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                ${headerDate}
              </div>
              ${rowsHtml}
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 15,
        bottom: 25,
        left: 45,
      },
      xAxis: {
        type: "category",
        data: monthlyData.labels,
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
          fontFamily: "monospace",
        },
      },
      yAxis: {
        type: "value",
        name: "kWh",
        nameLocation: "end",
        nameTextStyle: {
          color: "#94A3B8",
          fontSize: 11,
          align: "right",
          padding: [0, 8, 4, 0],
        },
        splitLine: {
          lineStyle: {
            type: "dashed",
            color: "#F1F5F9",
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
        },
      },
      series: [
        {
          name: "PV",
          type: "bar",
          data: monthlyData.pvData,
          itemStyle: { color: "#f5e026", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
          barGap: "20%",
        },
        {
          name: "Import",
          type: "bar",
          data: monthlyData.importData,
          itemStyle: { color: "#38bdf8", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
        },
        {
          name: "Export",
          type: "bar",
          data: monthlyData.exportData,
          itemStyle: { color: "#0284c7", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
        },
        {
          name: "Charge",
          type: "bar",
          data: monthlyData.chargeData,
          itemStyle: { color: "#15803d", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
        },
        {
          name: "Discharge",
          type: "bar",
          data: monthlyData.dischargeData,
          itemStyle: { color: "#10b981", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
        },
        {
          name: "Consumption",
          type: "bar",
          data: monthlyData.consumptionData,
          itemStyle: { color: "#8b5cf6", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 7,
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [monthlyData, currentMonth]);

  // Render Annual ECharts Grouped Bar Chart
  useEffect(() => {
    if (!annualChartRef.current) return;

    let chart = echarts.getInstanceByDom(annualChartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(annualChartRef.current);
    }
    annualInstanceRef.current = chart;

    if (!annualData || annualData.labels.length === 0) {
      chart.clear();
      return;
    }

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 600,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: {
            color: "rgba(250, 204, 21, 0.08)",
          },
        },
        padding: 0,
        borderWidth: 0,
        backgroundColor: "transparent",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const dataIndex = params[0].dataIndex;
          const headerDate = annualData.tooltipDates[dataIndex] || `${annualData.labels[dataIndex]}/${currentYear}`;

          let rowsHtml = "";
          params.forEach((item: any) => {
            const val = item.value !== null && item.value !== undefined ? item.value : 0;
            rowsHtml += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 7px; color: #475569;">
                  <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${item.color};"></span>
                  <span style="font-weight: 500;">${item.seriesName}</span>
                </div>
                <div style="font-weight: 700; color: #0f172a; margin-left: 20px; font-family: monospace;">
                  ${val} kWh
                </div>
              </div>
            `;
          });

          return `
            <div style="min-width: 190px; padding: 12px 14px; background: #ffffff; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; font-family: system-ui, sans-serif;">
              <div style="font-weight: 600; color: #1e293b; font-size: 13px; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                ${headerDate}
              </div>
              ${rowsHtml}
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 15,
        bottom: 25,
        left: 55,
      },
      xAxis: {
        type: "category",
        data: annualData.labels,
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
          fontFamily: "monospace",
        },
      },
      yAxis: {
        type: "value",
        name: "kWh",
        nameLocation: "end",
        nameTextStyle: {
          color: "#94A3B8",
          fontSize: 11,
          align: "right",
          padding: [0, 8, 4, 0],
        },
        splitLine: {
          lineStyle: {
            type: "dashed",
            color: "#F1F5F9",
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "#94A3B8",
          fontSize: 11,
        },
      },
      series: [
        {
          name: "PV",
          type: "bar",
          data: annualData.pvData,
          itemStyle: { color: "#f5e026", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
          barGap: "20%",
        },
        {
          name: "Import",
          type: "bar",
          data: annualData.importData,
          itemStyle: { color: "#38bdf8", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
        },
        {
          name: "Export",
          type: "bar",
          data: annualData.exportData,
          itemStyle: { color: "#0284c7", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
        },
        {
          name: "Charge",
          type: "bar",
          data: annualData.chargeData,
          itemStyle: { color: "#15803d", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
        },
        {
          name: "Discharge",
          type: "bar",
          data: annualData.dischargeData,
          itemStyle: { color: "#10b981", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
        },
        {
          name: "Consumption",
          type: "bar",
          data: annualData.consumptionData,
          itemStyle: { color: "#8b5cf6", borderRadius: [2, 2, 0, 0] },
          barMaxWidth: 10,
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();
  }, [annualData, currentYear]);

  // Handle container and window resizing for both charts
  useEffect(() => {
    const handleResize = () => {
      if (monthlyInstanceRef.current && !monthlyInstanceRef.current.isDisposed()) {
        monthlyInstanceRef.current.resize();
      }
      if (annualInstanceRef.current && !annualInstanceRef.current.isDisposed()) {
        annualInstanceRef.current.resize();
      }
    };

    window.addEventListener("resize", handleResize);

    // ResizeObserver guarantees immediate resize as soon as element dimensions are computed
    let mObserver: ResizeObserver | null = null;
    let aObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      if (monthlyChartRef.current) {
        mObserver = new ResizeObserver(() => handleResize());
        mObserver.observe(monthlyChartRef.current);
      }
      if (annualChartRef.current) {
        aObserver = new ResizeObserver(() => handleResize());
        aObserver.observe(annualChartRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      mObserver?.disconnect();
      aObserver?.disconnect();
    };
  }, []);

  // Cleanup charts on unmount
  useEffect(() => {
    return () => {
      if (monthlyInstanceRef.current && !monthlyInstanceRef.current.isDisposed()) {
        monthlyInstanceRef.current.dispose();
      }
      monthlyInstanceRef.current = null;

      if (annualInstanceRef.current && !annualInstanceRef.current.isDisposed()) {
        annualInstanceRef.current.dispose();
      }
      annualInstanceRef.current = null;
    };
  }, []);

  const monthTotals = monthlyData?.totals || {
    pv: 0,
    inverter: 0,
    acCoupled: 0,
    consumption: 0,
    gridLoadConsumption: 0,
    backupLoad: 0,
    smartLoad: 0,
    import: 0,
    export: 0,
    charge: 0,
    discharge: 0,
  };

  const annualTotals = annualData?.totals || {
    pv: 0,
    inverter: 0,
    acCoupled: 0,
    consumption: 0,
    gridLoadConsumption: 0,
    backupLoad: 0,
    smartLoad: 0,
    import: 0,
    export: 0,
    charge: 0,
    discharge: 0,
  };

  // Format month for display e.g. "11/2026"
  const [mYear, mMonth] = currentMonth.split("-");
  const displayMonthStr = `${mMonth}/${mYear}`;

  return (
    <div className="space-y-6 pt-4">
      {/* ======================================================== */}
      {/* GRAPH 3: MONTHLY ENERGY BREAKDOWN BAR CHART              */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 md:p-6 transition-all">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Monthly Daily Energy Breakdown</span>
              <span className="text-xs font-normal text-slate-500">• {plantName}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily generation, grid interaction, battery cycling & load consumption
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month Picker / Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-2 py-1 gap-1.5 text-xs font-semibold text-slate-700 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{displayMonthStr}</span>
              </div>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentMonth(getPktCurrentMonth())}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                currentMonth === getPktCurrentMonth()
                  ? "bg-slate-100 text-slate-800 border-slate-300 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Current Month
            </button>

            <button
              onClick={() => fetchMonthlyData(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              title="Refresh monthly data"
            >
              <RotateCw className={`w-4 h-4 ${monthlyLoading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* 8 Metric Summary Cards (2 rows x 4 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3.5 mb-5">
          {/* Card 1: PV */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.pv}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">PV</span>
          </div>

          {/* Card 2: Inverter */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.inverter}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Inverter</span>
          </div>

          {/* Card 3: AC Coupled */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.acCoupled}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">AC Coupled</span>
          </div>

          {/* Card 4: Monthly Consumption */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.consumption}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Monthly Consumption
            </span>
          </div>

          {/* Card 5: Monthly Grid Load Consumption */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.gridLoadConsumption}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Monthly Grid Load Consumption
            </span>
          </div>

          {/* Card 6: Monthly Backup Load */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.backupLoad}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Monthly Backup Load
            </span>
          </div>

          {/* Card 7: Smart Load */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.smartLoad}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Smart Load</span>
          </div>

          {/* Card 8: Monthly Import */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {monthTotals.import}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Monthly Import</span>
          </div>
        </div>

        {/* Legend Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center gap-3.5 md:gap-5 flex-wrap text-xs font-medium text-slate-600">
            {SERIES_CONFIG.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.name}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => fetchMonthlyData(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Refresh chart"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ECharts Area */}
        <div className="relative w-full h-[320px] md:h-[350px]">
          {monthlyLoading && !monthlyData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-amber-500" />
                Loading monthly energy breakdown...
              </div>
            </div>
          )}
          <div
            ref={monthlyChartRef}
            className="w-full h-[320px] md:h-[350px]"
            style={{ width: "100%", height: "350px", minHeight: "320px" }}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* GRAPH 4: ANNUAL MONTHLY ENERGY BREAKDOWN BAR CHART        */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 md:p-6 transition-all">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Annual Monthly Energy Breakdown</span>
              <span className="text-xs font-normal text-slate-500">• {plantName}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Year-round month-by-month energy yields, imports, exports and usage
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Year Picker / Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={handlePrevYear}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                title="Previous Year"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center px-2 py-1 gap-1.5 text-xs font-semibold text-slate-700 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentYear}</span>
              </div>
              <button
                onClick={handleNextYear}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-slate-900 rounded-md transition-colors"
                title="Next Year"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setCurrentYear(getPktCurrentYear())}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                currentYear === getPktCurrentYear()
                  ? "bg-slate-100 text-slate-800 border-slate-300 font-semibold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              Current Year
            </button>

            <button
              onClick={() => fetchAnnualData(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              title="Refresh annual data"
            >
              <RotateCw className={`w-4 h-4 ${annualLoading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>

        {/* 8 Metric Summary Cards (2 rows x 4 columns) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3.5 mb-5">
          {/* Card 1: PV */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.pv}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">PV</span>
          </div>

          {/* Card 2: Inverter */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.inverter}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Inverter</span>
          </div>

          {/* Card 3: AC Coupled */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.acCoupled}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">AC Coupled</span>
          </div>

          {/* Card 4: Annual Consumption */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.consumption}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Annual Consumption
            </span>
          </div>

          {/* Card 5: Annual Grid Load Consumption */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.gridLoadConsumption}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Annual Grid Load Consumption
            </span>
          </div>

          {/* Card 6: Annual Backup Load */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.backupLoad}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">
              Annual Backup Load
            </span>
          </div>

          {/* Card 7: Smart Load */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.smartLoad}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Smart Load</span>
          </div>

          {/* Card 8: Annual Import */}
          <div className="bg-slate-50/80 border border-slate-100/80 rounded-xl p-3 md:p-3.5 flex flex-col justify-between">
            <div className="flex items-baseline">
              <span className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {annualTotals.import}
              </span>
              <span className="text-xs md:text-sm font-semibold text-slate-500 ml-1">kWh</span>
            </div>
            <span className="text-xs text-slate-400 font-medium tracking-tight mt-1.5">Annual Import</span>
          </div>
        </div>

        {/* Legend Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-2 px-1">
          <div className="flex items-center gap-3.5 md:gap-5 flex-wrap text-xs font-medium text-slate-600">
            {SERIES_CONFIG.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.name}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => fetchAnnualData(false)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Refresh chart"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ECharts Area */}
        <div className="relative w-full h-[320px] md:h-[350px]">
          {annualLoading && !annualData && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-amber-500" />
                Loading annual energy breakdown...
              </div>
            </div>
          )}
          <div
            ref={annualChartRef}
            className="w-full h-[320px] md:h-[350px]"
            style={{ width: "100%", height: "350px", minHeight: "320px" }}
          />
        </div>
      </div>
    </div>
  );
}
