"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  FileText,
  Download,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  Zap,
  Leaf,
  Sun,
  Building,
  RotateCw,
} from "lucide-react";

interface SolisPlantReportViewProps {
  onSelectPlant?: (plantId: string) => void;
}

export default function SolisPlantReportView({ onSelectPlant }: SolisPlantReportViewProps) {
  const [selectedPlant, setSelectedPlant] = useState("All");
  const [reportPeriod, setReportPeriod] = useState<"Day" | "Month" | "Year">("Month");
  const [reportDate, setReportDate] = useState("2026-11");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Sample fleet plant report data grounded in actual Supabase records
  const plantReportRows = [
    {
      id: "1298491919450797504",
      name: "Menu Karachi Office",
      capacityKwp: 80.0,
      dailyYieldKwh: 207.2,
      monthlyYieldMwh: 4.82,
      gridSoldKwh: 0.0,
      gridPurchasedKwh: 26.2,
      selfConsumptionPercent: 100,
      fullSunHours: 2.59,
      carbonOffsetTons: 3.86,
      savingsPkr: 145040,
      status: "Online",
    },
    {
      id: "1298491919450740581",
      name: "P2G 50KW",
      capacityKwp: 32.0,
      dailyYieldKwh: 105.0,
      monthlyYieldMwh: 2.45,
      gridSoldKwh: 17.1,
      gridPurchasedKwh: 17.5,
      selfConsumptionPercent: 84,
      fullSunHours: 3.28,
      carbonOffsetTons: 1.96,
      savingsPkr: 73500,
      status: "Online",
    },
    {
      id: "1298491919450873747",
      name: "36 Chenab",
      capacityKwp: 25.155,
      dailyYieldKwh: 89.7,
      monthlyYieldMwh: 2.15,
      gridSoldKwh: 58.2,
      gridPurchasedKwh: 6.7,
      selfConsumptionPercent: 32,
      fullSunHours: 3.57,
      carbonOffsetTons: 1.72,
      savingsPkr: 64500,
      status: "Online",
    },
    {
      id: "1298491919450958553",
      name: "OPL Residence",
      capacityKwp: 55.5,
      dailyYieldKwh: 142.3,
      monthlyYieldMwh: 3.32,
      gridSoldKwh: 33.0,
      gridPurchasedKwh: 0.0,
      selfConsumptionPercent: 77,
      fullSunHours: 2.56,
      carbonOffsetTons: 2.65,
      savingsPkr: 99600,
      status: "Online",
    },
    {
      id: "1298491919450851319",
      name: "P2G 20kw",
      capacityKwp: 20.0,
      dailyYieldKwh: 54.2,
      monthlyYieldMwh: 1.28,
      gridSoldKwh: 8.5,
      gridPurchasedKwh: 4.2,
      selfConsumptionPercent: 84,
      fullSunHours: 2.71,
      carbonOffsetTons: 1.02,
      savingsPkr: 38400,
      status: "Online",
    },
    {
      id: "1298491919450734544",
      name: "P2G 15KW",
      capacityKwp: 20.0,
      dailyYieldKwh: 48.0,
      monthlyYieldMwh: 1.12,
      gridSoldKwh: 0.0,
      gridPurchasedKwh: 12.0,
      selfConsumptionPercent: 100,
      fullSunHours: 2.4,
      carbonOffsetTons: 0.89,
      savingsPkr: 33600,
      status: "Online",
    },
  ];

  const filteredRows =
    selectedPlant === "All"
      ? plantReportRows
      : plantReportRows.filter((p) => p.name === selectedPlant);

  const totalCapacity = filteredRows.reduce((acc, r) => acc + r.capacityKwp, 0);
  const totalDaily = filteredRows.reduce((acc, r) => acc + r.dailyYieldKwh, 0);
  const totalMonthly = filteredRows.reduce((acc, r) => acc + r.monthlyYieldMwh, 0);
  const totalSavings = filteredRows.reduce((acc, r) => acc + r.savingsPkr, 0);

  // ECharts Bar Chart Setup
  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    const names = filteredRows.map((r) => r.name);
    const yields = filteredRows.map((r) => r.dailyYieldKwh);
    const selfCons = filteredRows.map((r) => Number((r.dailyYieldKwh * (r.selfConsumptionPercent / 100)).toFixed(1)));
    const exportData = filteredRows.map((r) => r.gridSoldKwh);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 11 },
      },
      legend: {
        data: ["Solar PV Yield (kWh)", "Self-Consumed (kWh)", "Grid Export (kWh)"],
        bottom: 0,
        textStyle: { color: "#64748b", fontSize: 11 },
      },
      grid: { top: 20, right: 20, bottom: 40, left: 50, containLabel: true },
      xAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#64748b", fontSize: 10, rotate: 15 },
      },
      yAxis: {
        type: "value",
        name: "kWh",
        splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: [
        {
          name: "Solar PV Yield (kWh)",
          type: "bar",
          data: yields,
          itemStyle: { color: "#f37021", borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
        },
        {
          name: "Self-Consumed (kWh)",
          type: "bar",
          data: selfCons,
          itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
        },
        {
          name: "Grid Export (kWh)",
          type: "bar",
          data: exportData,
          itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 32,
        },
      ],
    };

    chart.setOption(option);
    chart.resize();

    const handleResize = () => chart?.resize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [filteredRows]);

  const handleExportCSV = () => {
    const headers = [
      "Plant Name",
      "Capacity (kWp)",
      "Daily Yield (kWh)",
      "Monthly Yield (MWh)",
      "Grid Sold (kWh)",
      "Grid Purchased (kWh)",
      "Self-Consumption (%)",
      "Specific Yield (h)",
      "CO2 Offset (t)",
      "Estimated Savings (PKR)",
    ];
    const rows = filteredRows.map((r) => [
      r.name,
      r.capacityKwp,
      r.dailyYieldKwh,
      r.monthlyYieldMwh,
      r.gridSoldKwh,
      r.gridPurchasedKwh,
      `${r.selfConsumptionPercent}%`,
      r.fullSunHours,
      r.carbonOffsetTons,
      r.savingsPkr,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_plant_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-50 text-[#f37021] border border-orange-200">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Plant Generation & Performance Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive energy production, self-consumption ratio, and financial yields across all sites.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs font-semibold">
            {(["Day", "Month", "Year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 rounded-md transition-all ${
                  reportPeriod === p
                    ? "bg-white text-slate-900 font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 active:scale-95 transition-all text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Fleet Daily Yield</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalDaily.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              +12.4% vs Yesterday
            </span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 text-[#f37021]">
            <Sun className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Installed Capacity</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalCapacity.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWp</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">Across 6 Stations</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Monthly Yield</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalMonthly.toFixed(2)} <span className="text-xs font-normal text-slate-500">MWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">November 2026</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Financial Savings</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              ₨ {totalSavings.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">Est. Monthly PKR</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Leaf className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Comparative ECharts Graph */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Site Energy Comparison</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="All">All Plants (Fleet View)</option>
              {plantReportRows.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div ref={chartRef} className="w-full h-72" />
      </div>

      {/* 4. Plant Data Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Station Telemetry Breakdown</h3>
          <span className="text-xs text-slate-400">Total {filteredRows.length} Stations</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-slate-500 font-semibold">
                <th className="py-3 px-4">Station Name</th>
                <th className="py-3 px-3">Capacity</th>
                <th className="py-3 px-3">Daily Yield</th>
                <th className="py-3 px-3">Monthly Total</th>
                <th className="py-3 px-3">Grid Sold</th>
                <th className="py-3 px-3">Grid Purchased</th>
                <th className="py-3 px-3">Self-Consumption</th>
                <th className="py-3 px-3">Specific Yield</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <button
                      onClick={() => onSelectPlant && onSelectPlant(row.id)}
                      className="text-[#f37021] hover:underline text-left font-semibold"
                    >
                      {row.name}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.capacityKwp} kWp</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.dailyYieldKwh} kWh</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{row.monthlyYieldMwh} MWh</td>
                  <td className="py-3 px-3 font-mono text-[#0284c7] font-semibold">{row.gridSoldKwh} kWh</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.gridPurchasedKwh} kWh</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                      {row.selfConsumptionPercent}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.fullSunHours} h</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectPlant && onSelectPlant(row.id)}
                      className="px-3 py-1 rounded-md border border-gray-200 bg-white text-slate-700 font-semibold hover:border-orange-400 hover:text-orange-500 shadow-2xs"
                    >
                      View Dashboard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
