"use client";

import React, { useState, useEffect, useRef } from "react";
import * as echarts from "echarts";
import {
  Cpu,
  Download,
  Calendar,
  Filter,
  Activity,
  Zap,
  Gauge,
  Thermometer,
  ShieldCheck,
} from "lucide-react";

interface SolisInverterReportViewProps {
  onSelectInverter?: (sn: string) => void;
}

export default function SolisInverterReportView({ onSelectInverter }: SolisInverterReportViewProps) {
  const [selectedSn, setSelectedSn] = useState("All");
  const [reportDate, setReportDate] = useState("2026-11-20");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const inverterReportRows = [
    {
      sn: "1053050255210107",
      plant: "P2G 50KW",
      model: "S6-EH3P50K-H",
      ratedPowerKw: 50,
      dailyYieldKwh: 105.0,
      peakPowerKw: 48.2,
      pv1Voltage: 645.3,
      pv2Voltage: 641.2,
      tempC: 38.5,
      efficiencyPercent: 98.2,
      operatingHours: "11.2h",
      status: "Warning",
    },
    {
      sn: "1053050258180112",
      plant: "Towfiq chinoy",
      model: "S6-EH3P50K-H",
      ratedPowerKw: 50,
      dailyYieldKwh: 112.7,
      peakPowerKw: 49.6,
      pv1Voltage: 652.1,
      pv2Voltage: 648.7,
      tempC: 36.2,
      efficiencyPercent: 98.4,
      operatingHours: "11.8h",
      status: "Normal",
    },
    {
      sn: "1053050258180057",
      plant: "36 Chenab",
      model: "S6-EH3P25K-H",
      ratedPowerKw: 25,
      dailyYieldKwh: 89.7,
      peakPowerKw: 24.1,
      pv1Voltage: 638.0,
      pv2Voltage: 635.4,
      tempC: 34.0,
      efficiencyPercent: 98.1,
      operatingHours: "10.5h",
      status: "Normal",
    },
    {
      sn: "1053050258110159",
      plant: "OPL Residence",
      model: "S6-EH3P50K-H",
      ratedPowerKw: 50,
      dailyYieldKwh: 142.3,
      peakPowerKw: 47.8,
      pv1Voltage: 660.2,
      pv2Voltage: 655.0,
      tempC: 39.1,
      efficiencyPercent: 98.3,
      operatingHours: "12.1h",
      status: "Normal",
    },
    {
      sn: "1033320253150969",
      plant: "P2G 15KW",
      model: "S6-EH3P15K-H",
      ratedPowerKw: 15,
      dailyYieldKwh: 48.0,
      peakPowerKw: 14.5,
      pv1Voltage: 580.4,
      pv2Voltage: 576.2,
      tempC: 33.5,
      efficiencyPercent: 97.9,
      operatingHours: "9.8h",
      status: "Normal",
    },
    {
      sn: "1033161256090193",
      plant: "P2G 20kw",
      model: "S6-EH3P20K-H",
      ratedPowerKw: 20,
      dailyYieldKwh: 54.2,
      peakPowerKw: 19.2,
      pv1Voltage: 610.1,
      pv2Voltage: 608.0,
      tempC: 35.0,
      efficiencyPercent: 98.0,
      operatingHours: "10.2h",
      status: "Normal",
    },
  ];

  const filteredRows =
    selectedSn === "All"
      ? inverterReportRows
      : inverterReportRows.filter((r) => r.sn === selectedSn);

  const totalYield = filteredRows.reduce((acc, r) => acc + r.dailyYieldKwh, 0);
  const peakFleetPower = Math.max(...filteredRows.map((r) => r.peakPowerKw), 0);
  const avgEfficiency = (
    filteredRows.reduce((acc, r) => acc + r.efficiencyPercent, 0) /
    Math.max(1, filteredRows.length)
  ).toFixed(1);
  const maxTemp = Math.max(...filteredRows.map((r) => r.tempC), 0);

  // Inverter Power vs Temp Chart
  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    const times = [
      "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
      "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
    ];
    const powerCurve = [0, 4.2, 14.5, 28.6, 42.1, 48.2, 47.9, 45.3, 38.0, 26.4, 12.1, 2.0, 0];
    const tempCurve = [22, 23, 26, 29, 33, 37, 38.5, 38.0, 36.5, 34, 30, 27, 25];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 11 },
      },
      legend: {
        data: ["AC Output Power (kW)", "Internal Temperature (°C)"],
        bottom: 0,
        textStyle: { color: "#64748b", fontSize: 11 },
      },
      grid: { top: 20, right: 40, bottom: 40, left: 45, containLabel: true },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#64748b", fontSize: 10 },
      },
      yAxis: [
        {
          type: "value",
          name: "kW",
          splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        {
          type: "value",
          name: "°C",
          splitLine: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "AC Output Power (kW)",
          type: "line",
          smooth: true,
          data: powerCurve,
          itemStyle: { color: "#f37021" },
          lineStyle: { width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(243, 112, 33, 0.35)" },
              { offset: 1, color: "rgba(243, 112, 33, 0.0)" },
            ]),
          },
        },
        {
          name: "Internal Temperature (°C)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: tempCurve,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 2, type: "dashed" },
        },
      ],
    };

    chart.setOption(option);
    chart.resize();

    const handleResize = () => chart?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart?.dispose();
    };
  }, [filteredRows]);

  const handleExportCSV = () => {
    const headers = [
      "Inverter SN",
      "Plant Name",
      "Model",
      "Rated Power (kW)",
      "Daily Yield (kWh)",
      "Peak Power (kW)",
      "PV1 Voltage (V)",
      "PV2 Voltage (V)",
      "Temp (°C)",
      "Efficiency (%)",
      "Operating Hours",
      "Status",
    ];
    const rows = filteredRows.map((r) => [
      r.sn,
      r.plant,
      r.model,
      r.ratedPowerKw,
      r.dailyYieldKwh,
      r.peakPowerKw,
      r.pv1Voltage,
      r.pv2Voltage,
      r.tempC,
      `${r.efficiencyPercent}%`,
      r.operatingHours,
      r.status,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_inverter_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Inverter Operating & Telemetry Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              DC bus electrical telemetry, conversion efficiencies, thermal behavior, and uptime metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>20/11/2026</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 active:scale-95 transition-all text-xs font-semibold shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Fleet Active Yield</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalYield.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              {filteredRows.length} Units Online
            </span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 text-[#f37021]">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Max AC Power Output</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {peakFleetPower.toFixed(1)} <span className="text-xs font-normal text-slate-500">kW</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">Peak at 12:15 PKT</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Avg DC/AC Efficiency</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {avgEfficiency}%
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Top Tier MPPT</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Peak Thermal Level</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {maxTemp}°C
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Normal Operating Limit</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-500">
            <Thermometer className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Daily Telemetry Curve Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Inverter Power Output & Thermal Curve (SN: {selectedSn === "All" ? "1053050255210107" : selectedSn})
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedSn}
              onChange={(e) => setSelectedSn(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="All">All Inverters</option>
              {inverterReportRows.map((inv) => (
                <option key={inv.sn} value={inv.sn}>
                  {inv.plant} - {inv.sn}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div ref={chartRef} className="w-full h-72" />
      </div>

      {/* 4. Inverter Telemetry Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Inverter Technical Specification Table</h3>
          <span className="text-xs text-slate-400">Total {filteredRows.length} Inverters</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-slate-500 font-semibold">
                <th className="py-3 px-4">Inverter SN</th>
                <th className="py-3 px-3">Plant Name</th>
                <th className="py-3 px-3">Model</th>
                <th className="py-3 px-3">Rated Power</th>
                <th className="py-3 px-3">Daily Yield</th>
                <th className="py-3 px-3">PV1 Voltage</th>
                <th className="py-3 px-3">PV2 Voltage</th>
                <th className="py-3 px-3">Temp</th>
                <th className="py-3 px-3">Efficiency</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.sn} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">
                    <button
                      onClick={() => onSelectInverter && onSelectInverter(row.sn)}
                      className="text-[#f37021] hover:underline"
                    >
                      {row.sn}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{row.plant}</td>
                  <td className="py-3 px-3 font-mono text-slate-500">{row.model}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{row.ratedPowerKw} kW</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.dailyYieldKwh} kWh</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.pv1Voltage} V</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.pv2Voltage} V</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{row.tempC}°C</td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-600">{row.efficiencyPercent}%</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        row.status === "Warning"
                          ? "bg-orange-50 text-[#f37021] border border-orange-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectInverter && onSelectInverter(row.sn)}
                      className="px-3 py-1 rounded-md border border-gray-200 bg-white text-slate-700 font-semibold hover:border-orange-400 hover:text-orange-500 shadow-2xs"
                    >
                      View Details
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
