"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as echarts from "echarts";
import {
  Download,
  Calendar,
  BatteryCharging,
  Zap,
  Gauge,
  Heart,
  ChevronDown,
} from "lucide-react";

interface BatteryReportRecord {
  sn: string;
  plantName: string;
  nominalCapacity: string;
  dailyChargeKwh: number;
  dailyDischargeKwh: number;
  socPct: number;
  packVoltageV: number;
  cellDeltaMv: number;
  cycles: number;
  sohPct: number;
}

// Exact Battery Fleet Records matching Screenshot 1: media_1795240078542_330a048f.jpg
const BATTERY_REPORT_RECORDS: BatteryReportRecord[] = [
  {
    sn: "1053050255210107BAT01",
    plantName: "P2G 50KW",
    nominalCapacity: "26 kWh",
    dailyChargeKwh: 49.8,
    dailyDischargeKwh: 12.4,
    socPct: 100,
    packVoltageV: 512.4,
    cellDeltaMv: 8,
    cycles: 27,
    sohPct: 100,
  },
  {
    sn: "1053050255210107BAT02",
    plantName: "P2G 50KW",
    nominalCapacity: "26 kWh",
    dailyChargeKwh: 30.6,
    dailyDischargeKwh: 10.2,
    socPct: 36,
    packVoltageV: 498.2,
    cellDeltaMv: 11,
    cycles: 24,
    sohPct: 100,
  },
  {
    sn: "1053050258180057BAT01",
    plantName: "36 Chenab",
    nominalCapacity: "52 kWh",
    dailyChargeKwh: 18.1,
    dailyDischargeKwh: 7.1,
    socPct: 68,
    packVoltageV: 524,
    cellDeltaMv: 6,
    cycles: 42,
    sohPct: 100,
  },
  {
    sn: "1053050258180112BAT01",
    plantName: "Towfiq chinoy",
    nominalCapacity: "52 kWh",
    dailyChargeKwh: 34.5,
    dailyDischargeKwh: 16.2,
    socPct: 85,
    packVoltageV: 518.5,
    cellDeltaMv: 7,
    cycles: 35,
    sohPct: 100,
  },
  {
    sn: "1053050258110159BAT01",
    plantName: "OPL Residence",
    nominalCapacity: "52 kWh",
    dailyChargeKwh: 80.4,
    dailyDischargeKwh: 53.0,
    socPct: 100,
    packVoltageV: 532.1,
    cellDeltaMv: 5,
    cycles: 68,
    sohPct: 100,
  },
];

interface SolisBatteryReportViewProps {
  onSelectBattery?: (sn: string) => void;
}

export default function SolisBatteryReportView({ onSelectBattery }: SolisBatteryReportViewProps) {
  const [selectedSn, setSelectedSn] = useState<string>("All");
  const [reportDate, setReportDate] = useState("2026-11-20");
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const filteredRecords = useMemo(() => {
    if (selectedSn === "All") return BATTERY_REPORT_RECORDS;
    return BATTERY_REPORT_RECORDS.filter((r) => r.sn === selectedSn);
  }, [selectedSn]);

  // Compute KPIs according to Screenshot 1
  const kpiData = useMemo(() => {
    if (selectedSn === "All") {
      return {
        dailyCharge: "213.4",
        dailyDischarge: "98.9",
        efficiency: "92.8%",
        socSoh: "78% / 100% SOH",
        chargeSubtitle: "5 Packs Active",
        dischargeSubtitle: "Offloaded during peak",
        efficiencySubtitle: "High Coulombic Yield",
        socSohSubtitle: "Healthy Cell Balancing",
      };
    }
    const target = filteredRecords[0] || BATTERY_REPORT_RECORDS[0];
    const eff = ((target.dailyDischargeKwh / Math.max(target.dailyChargeKwh, 1)) * 100).toFixed(1);
    return {
      dailyCharge: target.dailyChargeKwh.toFixed(1),
      dailyDischarge: target.dailyDischargeKwh.toFixed(1),
      efficiency: `${eff}%`,
      socSoh: `${target.socPct}% / ${target.sohPct}% SOH`,
      chargeSubtitle: "1 Pack Active",
      dischargeSubtitle: "Offloaded during peak",
      efficiencySubtitle: "High Coulombic Yield",
      socSohSubtitle: "Healthy Cell Balancing",
    };
  }, [selectedSn, filteredRecords]);

  // Battery Charge/Discharge Profile & SOC % EChart
  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    // Time points matching the screenshot: 00:00, 02:00, 04:00, 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00
    const timeLabels = [
      "00:00",
      "02:00",
      "04:00",
      "06:00",
      "08:00",
      "10:00",
      "12:00",
      "14:00",
      "16:00",
      "18:00",
      "20:00",
      "22:00",
    ];

    // Profile in screenshot:
    // 00:00 -> discharge -1.8 kW
    // 02:00 -> discharge -1.8 kW
    // 04:00 -> discharge -1.5 kW
    // 06:00 -> 0 kW
    // 08:00 -> charge +5.2 kW
    // 10:00 -> charge +11.8 kW
    // 12:00 -> charge +15.5 kW
    // 14:00 -> charge +9.4 kW
    // 16:00 -> charge +3.1 kW
    // 18:00 -> discharge -2.0 kW
    // 20:00 -> discharge -3.5 kW
    // 22:00 -> discharge -2.2 kW
    const batteryPowerValues = [-1.8, -1.8, -1.5, 0, 5.2, 11.8, 15.5, 9.4, 3.1, -2.0, -3.5, -2.2];

    // SOC line curve in screenshot:
    // 00:00: ~45%
    // 02:00: ~42%
    // 04:00: ~38%
    // 06:00: ~35%
    // 08:00: ~58%
    // 10:00: ~84%
    // 12:00: ~98%
    // 14:00: ~100%
    // 16:00: ~100%
    // 18:00: ~92%
    // 20:00: ~80%
    // 22:00: ~68%
    const socValues = [45, 42, 38, 35, 58, 84, 98, 100, 100, 92, 80, 68];

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f1f5f9",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          let res = `<div class="font-bold text-slate-800 mb-1">${params[0].axisValue}</div>`;
          params.forEach((item) => {
            if (item.seriesName.includes("Battery Power")) {
              const val = Number(item.value);
              const label = val >= 0 ? `Charge: +${val.toFixed(1)} kW` : `Discharge: ${val.toFixed(1)} kW`;
              res += `<div class="flex items-center gap-1.5 text-xs"><span style="color:${val >= 0 ? '#10b981' : '#0284c7'}">â—</span> ${label}</div>`;
            } else if (item.seriesName.includes("State of Charge")) {
              res += `<div class="flex items-center gap-1.5 text-xs"><span style="color:#f37021">â—</span> SOC: ${item.value}%</div>`;
            }
          });
          return res;
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: "#64748b", fontSize: 12 },
        data: [
          {
            name: "Battery Power (Charge + / Discharge - kW)",
            icon: "rect",
            itemStyle: { color: "#0284c7" },
          },
          {
            name: "State of Charge (SOC %)",
            icon: "circle",
            itemStyle: { color: "#f37021" },
          },
        ],
      },
      grid: {
        top: 30,
        left: "3%",
        right: "3%",
        bottom: 50,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: timeLabels,
        boundaryGap: true,
        axisLine: { lineStyle: { color: "#f1f5f9" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 11,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "kW",
          min: -6,
          max: 18,
          interval: 3,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: "#f8fafc", type: "solid" } },
          axisLabel: { color: "#94a3b8", fontSize: 11 },
        },
        {
          type: "value",
          name: "%",
          min: 0,
          max: 100,
          interval: 20,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 11 },
        },
      ],
      series: [
        {
          name: "Battery Power (Charge + / Discharge - kW)",
          type: "bar",
          yAxisIndex: 0,
          barWidth: 20,
          itemStyle: {
            color: (params: any) => {
              return params.value >= 0 ? "#10b981" : "#0284c7";
            },
            borderRadius: [2, 2, 2, 2],
          },
          data: batteryPowerValues,
        },
        {
          name: "State of Charge (SOC %)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: {
            color: "#f37021",
            borderColor: "#ffffff",
            borderWidth: 2,
          },
          lineStyle: {
            color: "#f37021",
            width: 2.5,
          },
          data: socValues,
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
  }, [selectedSn]);

  const handleExportCSV = () => {
    const headers = [
      "Battery SN",
      "Plant Name",
      "Nominal Capacity",
      "Daily Charge (kWh)",
      "Daily Discharge (kWh)",
      "SOC (%)",
      "Pack Voltage (V)",
      "Cell Delta (mV)",
      "Cycles",
      "SOH (%)",
    ];
    const rows = filteredRecords.map((r) => [
      r.sn,
      r.plantName,
      r.nominalCapacity,
      r.dailyChargeKwh,
      r.dailyDischargeKwh,
      r.socPct,
      r.packVoltageV,
      r.cellDeltaMv,
      r.cycles,
      r.sohPct,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_battery_report_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header Bar matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] tracking-tight">
              Battery Storage &amp; Health Report
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Round-trip efficiency, daily throughput cycles, pack state of health, and cell voltage balancing.
            </p>
          </div>
        </div>

        {/* Date Selector & Export CSV */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-slate-700 shadow-2xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              aria-label="Report Date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="bg-transparent outline-none text-slate-700 font-medium cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Daily Charge */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Fleet Daily Charge</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.dailyCharge}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.chargeSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <BatteryCharging className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Fleet Daily Discharge */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Fleet Daily Discharge</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.dailyDischarge}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              {kpiData.dischargeSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Round-Trip Efficiency */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Round-Trip Efficiency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.efficiency}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.efficiencySubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Fleet Avg SOC / SOH */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Fleet Avg SOC / SOH</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.socSoh}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.socSohSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Battery Charge/Discharge Profile & SOC % Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Battery Charge/Discharge Profile &amp; SOC % (Unit: {selectedSn === "All" ? "1053050255210107BAT01" : selectedSn})
          </h2>

          <div className="relative">
            <select
              aria-label="Filter battery unit"
              value={selectedSn}
              onChange={(e) => setSelectedSn(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-slate-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all cursor-pointer shadow-2xs"
            >
              <option value="All">All Batteries (Fleet View)</option>
              {BATTERY_REPORT_RECORDS.map((b) => (
                <option key={b.sn} value={b.sn}>
                  {b.sn} ({b.plantName})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* EChart Canvas Container */}
        <div ref={chartRef} className="w-full h-80" />
      </div>

      {/* 4. Battery Technical Specification Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Battery Technical Specification Table
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Total {filteredRecords.length} Battery Units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-slate-400 font-medium">
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
              {filteredRecords.map((row) => (
                <tr key={row.sn} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-[#f37021]">
                    {row.sn}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-800">
                    {row.plantName}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-600">
                    {row.nominalCapacity}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-emerald-600">
                    {row.dailyChargeKwh} kWh
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-blue-600">
                    {row.dailyDischargeKwh} kWh
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">
                    {row.socPct}%
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.packVoltageV} V
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.cellDeltaMv} mV
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.cycles}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-emerald-600">
                    {row.sohPct}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectBattery && onSelectBattery(row.sn)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs font-semibold text-slate-700 hover:text-[#f37021] hover:border-orange-300 active:scale-95 transition-all shadow-2xs"
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

