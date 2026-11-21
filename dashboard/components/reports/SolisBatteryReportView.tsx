"use client";

import React, { useState, useEffect, useRef } from "react";
import * as echarts from "echarts";
import {
  Battery,
  BatteryCharging,
  Download,
  Calendar,
  Filter,
  Activity,
  Zap,
  Gauge,
  Heart,
  ShieldCheck,
} from "lucide-react";

interface SolisBatteryReportViewProps {
  onSelectBattery?: (sn: string) => void;
}

export default function SolisBatteryReportView({ onSelectBattery }: SolisBatteryReportViewProps) {
  const [selectedSn, setSelectedSn] = useState("All");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const batteryReportRows = [
    {
      sn: "1053050255210107BAT01",
      plant: "P2G 50KW",
      model: "HV LiFePO4 51.2V 100Ah",
      capacityKwh: 26.0,
      dailyChargeKwh: 49.8,
      dailyDischargeKwh: 12.4,
      roundTripEfficiency: 92.5,
      currentSoc: 100,
      soh: 100,
      packVoltageV: 512.4,
      cellDeltaMv: 8,
      cycleCount: 27,
      bmsTempC: 28.4,
      status: "Online",
    },
    {
      sn: "1053050255210107BAT02",
      plant: "P2G 50KW",
      model: "HV LiFePO4 51.2V 100Ah",
      capacityKwh: 26.0,
      dailyChargeKwh: 30.6,
      dailyDischargeKwh: 10.2,
      roundTripEfficiency: 91.8,
      currentSoc: 36,
      soh: 100,
      packVoltageV: 498.2,
      cellDeltaMv: 11,
      cycleCount: 24,
      bmsTempC: 29.1,
      status: "Online",
    },
    {
      sn: "1053050258180057BAT01",
      plant: "36 Chenab",
      model: "HV LiFePO4 51.2V 100Ah",
      capacityKwh: 52.0,
      dailyChargeKwh: 18.1,
      dailyDischargeKwh: 7.1,
      roundTripEfficiency: 93.0,
      currentSoc: 68,
      soh: 100,
      packVoltageV: 524.0,
      cellDeltaMv: 6,
      cycleCount: 42,
      bmsTempC: 26.5,
      status: "Online",
    },
    {
      sn: "1053050258180112BAT01",
      plant: "Towfiq chinoy",
      model: "HV LiFePO4 51.2V 100Ah",
      capacityKwh: 52.0,
      dailyChargeKwh: 34.5,
      dailyDischargeKwh: 16.2,
      roundTripEfficiency: 92.8,
      currentSoc: 85,
      soh: 100,
      packVoltageV: 518.5,
      cellDeltaMv: 7,
      cycleCount: 35,
      bmsTempC: 27.2,
      status: "Online",
    },
    {
      sn: "1053050258110159BAT01",
      plant: "OPL Residence",
      model: "HV LiFePO4 51.2V 100Ah",
      capacityKwh: 52.0,
      dailyChargeKwh: 80.4,
      dailyDischargeKwh: 53.0,
      roundTripEfficiency: 94.1,
      currentSoc: 100,
      soh: 100,
      packVoltageV: 532.1,
      cellDeltaMv: 5,
      cycleCount: 68,
      bmsTempC: 30.0,
      status: "Online",
    },
  ];

  const filteredRows =
    selectedSn === "All"
      ? batteryReportRows
      : batteryReportRows.filter((r) => r.sn === selectedSn);

  const totalCharge = filteredRows.reduce((acc, r) => acc + r.dailyChargeKwh, 0);
  const totalDischarge = filteredRows.reduce((acc, r) => acc + r.dailyDischargeKwh, 0);
  const avgEfficiency = (
    filteredRows.reduce((acc, r) => acc + r.roundTripEfficiency, 0) /
    Math.max(1, filteredRows.length)
  ).toFixed(1);
  const avgSoc = Math.round(
    filteredRows.reduce((acc, r) => acc + r.currentSoc, 0) /
      Math.max(1, filteredRows.length)
  );

  // Battery Charge/Discharge Curve & SOC
  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    const times = [
      "00:00", "02:00", "04:00", "06:00", "08:00", "10:00",
      "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"
    ];
    // Positive = Charge, Negative = Discharge
    const chargeDischargeKw = [-1.5, -1.8, -1.2, 0, 5.2, 12.4, 15.6, 9.8, 3.2, -2.4, -4.1, -2.8];
    const socPercent = [45, 42, 38, 36, 48, 72, 95, 100, 100, 92, 78, 65];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 11 },
      },
      legend: {
        data: ["Battery Power (Charge + / Discharge - kW)", "State of Charge (SOC %)"],
        bottom: 0,
        textStyle: { color: "#64748b", fontSize: 11 },
      },
      grid: { top: 20, right: 45, bottom: 40, left: 45, containLabel: true },
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
          name: "%",
          min: 0,
          max: 100,
          splitLine: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "Battery Power (Charge + / Discharge - kW)",
          type: "bar",
          data: chargeDischargeKw,
          itemStyle: {
            color: (params: any) => (params.value >= 0 ? "#10b981" : "#0284c7"),
            borderRadius: [3, 3, 0, 0],
          },
          barMaxWidth: 24,
        },
        {
          name: "State of Charge (SOC %)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          data: socPercent,
          itemStyle: { color: "#f37021" },
          lineStyle: { width: 2.5 },
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
      "Battery SN",
      "Plant Name",
      "Model",
      "Capacity (kWh)",
      "Daily Charge (kWh)",
      "Daily Discharge (kWh)",
      "Round-Trip Eff (%)",
      "SOC (%)",
      "Pack Voltage (V)",
      "Cell Delta (mV)",
      "Cycles",
      "SOH (%)",
    ];
    const rows = filteredRows.map((r) => [
      r.sn,
      r.plant,
      r.model,
      r.capacityKwh,
      r.dailyChargeKwh,
      r.dailyDischargeKwh,
      `${r.roundTripEfficiency}%`,
      `${r.currentSoc}%`,
      r.packVoltageV,
      r.cellDeltaMv,
      r.cycleCount,
      `${r.soh}%`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_battery_report_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Battery Storage & Health Report
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Round-trip efficiency, daily throughput cycles, pack state of health, and cell voltage balancing.
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
            <span className="text-xs font-semibold text-slate-500">Fleet Daily Charge</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalCharge.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              {filteredRows.length} Packs Active
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <BatteryCharging className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Fleet Daily Discharge</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {totalDischarge.toFixed(1)} <span className="text-xs font-normal text-slate-500">kWh</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 inline-block">Offloaded during peak</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Round-Trip Efficiency</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {avgEfficiency}%
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">High Coulombic Yield</span>
          </div>
          <div className="p-3 rounded-xl bg-orange-50 text-[#f37021]">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Fleet Avg SOC / SOH</span>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono mt-0.5">
              {avgSoc}% <span className="text-xs font-normal text-slate-500">/ 100% SOH</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">Healthy Cell Balancing</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Heart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Daily Battery Curve Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Battery Charge/Discharge Profile & SOC % (Unit: {selectedSn === "All" ? "1053050255210107BAT01" : selectedSn})
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedSn}
              onChange={(e) => setSelectedSn(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="All">All Batteries (Fleet View)</option>
              {batteryReportRows.map((bat) => (
                <option key={bat.sn} value={bat.sn}>
                  {bat.plant} - {bat.sn}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div ref={chartRef} className="w-full h-72" />
      </div>

      {/* 4. Battery Telemetry Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">Battery Technical Specification Table</h3>
          <span className="text-xs text-slate-400">Total {filteredRows.length} Battery Units</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-slate-500 font-semibold">
                <th className="py-3 px-4">Battery SN</th>
                <th className="py-3 px-3">Plant Name</th>
                <th className="py-3 px-3">Nominal Capacity</th>
                <th className="py-3 px-3">Daily Charge</th>
                <th className="py-3 px-3">Daily Discharge</th>
                <th className="py-3 px-3">SOC</th>
                <th className="py-3 px-3">Pack Voltage</th>
                <th className="py-3 px-3">Cell Delta</th>
                <th className="py-3 px-3">Cycles</th>
                <th className="py-3 px-3">SOH</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.sn} className="hover:bg-orange-50/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold">
                    <button
                      onClick={() => onSelectBattery && onSelectBattery(row.sn)}
                      className="text-[#f37021] hover:underline"
                    >
                      {row.sn}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{row.plant}</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{row.capacityKwh} kWh</td>
                  <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">{row.dailyChargeKwh} kWh</td>
                  <td className="py-3 px-3 font-mono text-[#0284c7] font-semibold">{row.dailyDischargeKwh} kWh</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{row.currentSoc}%</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.packVoltageV} V</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{row.cellDeltaMv} mV</td>
                  <td className="py-3 px-3 font-mono text-slate-700">{row.cycleCount}</td>
                  <td className="py-3 px-3 font-mono font-semibold text-emerald-600">{row.soh}%</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectBattery && onSelectBattery(row.sn)}
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
