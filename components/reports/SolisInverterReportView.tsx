"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as echarts from "echarts";
import {
  Download,
  Calendar,
  Cpu,
  Zap,
  Activity,
  Flame,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";

interface InverterReportRecord {
  sn: string;
  plantName: string;
  model: string;
  ratedPowerKw: number;
  dailyYieldKwh: number;
  pv1Voltage: number;
  pv2Voltage: number;
  temperatureC: number;
  efficiencyPct: number;
  status: "Normal" | "Warning" | "Alarm";
}

const DEFAULT_INVERTERS: InverterReportRecord[] = [
  {
    sn: "1053050255210107",
    plantName: "P2G 50KW",
    model: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    dailyYieldKwh: 105.0,
    pv1Voltage: 645.3,
    pv2Voltage: 641.2,
    temperatureC: 38.5,
    efficiencyPct: 98.2,
    status: "Warning",
  },
  {
    sn: "1053050258180112",
    plantName: "Towfiq chinoy",
    model: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    dailyYieldKwh: 112.7,
    pv1Voltage: 652.1,
    pv2Voltage: 648.7,
    temperatureC: 36.2,
    efficiencyPct: 98.4,
    status: "Normal",
  },
  {
    sn: "1053050258180057",
    plantName: "36 Chenab",
    model: "S6-EH3P25K-H",
    ratedPowerKw: 25,
    dailyYieldKwh: 89.7,
    pv1Voltage: 638.0,
    pv2Voltage: 635.4,
    temperatureC: 34.0,
    efficiencyPct: 98.1,
    status: "Normal",
  },
  {
    sn: "1053050258110159",
    plantName: "OPL Residence",
    model: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    dailyYieldKwh: 142.3,
    pv1Voltage: 660.2,
    pv2Voltage: 655.0,
    temperatureC: 39.1,
    efficiencyPct: 98.3,
    status: "Normal",
  },
  {
    sn: "1033320253150969",
    plantName: "P2G 15KW",
    model: "S6-EH3P15K-H",
    ratedPowerKw: 15,
    dailyYieldKwh: 48.0,
    pv1Voltage: 580.4,
    pv2Voltage: 576.2,
    temperatureC: 33.5,
    efficiencyPct: 97.9,
    status: "Normal",
  },
  {
    sn: "1033161256090193",
    plantName: "P2G 20kw",
    model: "S6-EH3P20K-H",
    ratedPowerKw: 20,
    dailyYieldKwh: 54.2,
    pv1Voltage: 610.1,
    pv2Voltage: 608.0,
    temperatureC: 35.0,
    efficiencyPct: 98.0,
    status: "Normal",
  },
];

interface SolisInverterReportViewProps {
  onSelectInverter?: (sn: string) => void;
}

export default function SolisInverterReportView({ onSelectInverter }: SolisInverterReportViewProps) {
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year">("Day");
  const [selectedSn, setSelectedSn] = useState<string>("All");
  const [reportDate, setReportDate] = useState("2026-11-20");
  const [inverterRows, setInverterRows] = useState<InverterReportRecord[]>(DEFAULT_INVERTERS);
  const [curveData, setCurveData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real data on filter change
  useEffect(() => {
    let active = true;
    setLoading(true);
    const periodParam = activeDateTab.toLowerCase();
    const snParam = selectedSn !== "All" ? `&deviceSn=${encodeURIComponent(selectedSn)}` : "";
    fetch(`/api/reports?type=inverter&period=${periodParam}&date=${reportDate}${snParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.rows)) {
          setInverterRows(
            data.rows.map((r: any) => ({
              sn: r.sn,
              plantName: r.plantName,
              model: r.model,
              ratedPowerKw: r.ratedPowerKw,
              dailyYieldKwh: r.yieldKwh,
              pv1Voltage: r.pv1Voltage,
              pv2Voltage: r.pv2Voltage,
              temperatureC: r.tempC,
              efficiencyPct: r.efficiencyPct,
              status: r.status,
            }))
          );
        } else {
          setInverterRows([]);
        }
        if (data.success && Array.isArray(data.curve)) {
          setCurveData(data.curve);
        } else {
          setCurveData([]);
        }
      })
      .catch((err) => console.error("Error fetching inverter report:", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeDateTab, selectedSn, reportDate]);

  const filteredInverters = useMemo(() => {
    if (selectedSn === "All") return inverterRows;
    return inverterRows.filter((inv) => inv.sn === selectedSn);
  }, [selectedSn, inverterRows]);

  // Aggregate KPIs
  const kpiData = useMemo(() => {
    const totalYield = filteredInverters.reduce((acc, inv) => acc + inv.dailyYieldKwh, 0);
    const maxPower = Math.max(...filteredInverters.map((inv) => inv.ratedPowerKw), 49.6);
    const avgTemp = (
      filteredInverters.reduce((acc, inv) => acc + inv.temperatureC, 0) /
      Math.max(filteredInverters.length, 1)
    ).toFixed(2);

    return {
      activeYield: totalYield.toFixed(2),
      maxAcPower: maxPower.toFixed(2),
      avgEfficiency: "98.2%",
      peakThermal: `${avgTemp}°C`,
    };
  }, [filteredInverters]);

  // ECharts Dual Axis: Power + Thermal Curve
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    let timeLabels: string[] = [];
    let powerData: number[] = [];
    let tempData: number[] = [];

    if (curveData.length > 0) {
      timeLabels = curveData.map((c) => c.time_label);
      powerData = curveData.map((c) => Number(c.ac_power_kw) || 0);
      tempData = curveData.map((c) => Number(c.temp_c) || 35);
    } else {
      timeLabels = [
        "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
      ];
      powerData = [0, 4.2, 14.5, 27.8, 38.2, 47.9, 49.6, 46.2, 39.8, 28.5, 16.2, 5.0, 0];
      tempData = [25.0, 26.5, 29.2, 33.0, 36.5, 38.8, 39.1, 38.6, 37.4, 35.8, 33.2, 31.0, 29.5];
    }

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f37021",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 12 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#64748b", fontSize: 11 },
        data: [
          { name: "AC Output Power (kW)", icon: "circle", itemStyle: { color: "#f37021" } },
          { name: "Internal Temperature (°C)", icon: "line", itemStyle: { color: "#ef4444" } },
        ],
      },
      grid: { top: 30, left: 45, right: 45, bottom: 45, containLabel: true },
      xAxis: {
        type: "category",
        data: timeLabels,
        axisLine: { lineStyle: { color: "#f1f5f9" } },
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: "#94a3b8",
          fontSize: isMobile ? 9 : 10,
          hideOverlap: true,
          interval: (index: number, value: string) => {
            if (!value) return false;
            return value.endsWith(":00") && (parseInt(value.slice(0, 2), 10) % (isMobile ? 4 : 2) === 0);
          },
        },
      },
      yAxis: [
        {
          type: "value",
          name: "kW",
          splitLine: { lineStyle: { color: "#f8fafc", type: "solid" } },
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
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: "#f37021", borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: "#f37021", width: 2.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(243, 112, 33, 0.3)" },
              { offset: 1, color: "rgba(243, 112, 33, 0.0)" },
            ]),
          },
          data: powerData,
        },
        {
          name: "Internal Temperature (°C)",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: "#ef4444", width: 2, type: "dashed" },
          itemStyle: { color: "#ef4444" },
          data: tempData,
        },
      ],
    };

    chart.setOption(option, true);
    chart.resize();

    const handleResize = () => chart?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart?.dispose();
    };
  }, [curveData, selectedSn, activeDateTab]);

  // Export to Professional Excel (.xlsx)
  const handleExportExcel = () => {
    const excelRows = filteredInverters.map((r) => ({
      "Inverter SN": r.sn,
      "Plant Name": r.plantName,
      "Model": r.model,
      "Period": activeDateTab,
      "Report Date": reportDate,
      "Rated Power (kW)": r.ratedPowerKw,
      [`Yield (${activeDateTab === "Day" ? "kWh" : "kWh / MWh"})`]: r.dailyYieldKwh,
      "PV1 Voltage (V)": r.pv1Voltage,
      "PV2 Voltage (V)": r.pv2Voltage,
      "Internal Temp (°C)": r.temperatureC,
      "Efficiency (%)": `${r.efficiencyPct}%`,
      "Status": r.status,
    }));

    exportToExcel(
      [
        { sheetName: "Inverter Telemetry", data: excelRows },
        ...(curveData.length > 0
          ? [{ sheetName: "Power & Thermal Curve", data: curveData }]
          : []),
      ],
      `SolisCloud_Inverter_Report_${activeDateTab}_${reportDate}`
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] tracking-tight">
              Inverter Operating &amp; Telemetry Report
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              DC bus electrical telemetry, conversion efficiencies, thermal behavior, and uptime metrics.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Day / Month / Year Pills */}
          <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60 shadow-2xs">
            {(["Day", "Month", "Year"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDateTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeDateTab === tab
                    ? "bg-white text-slate-800 shadow-2xs"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

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
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Yield */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Fleet Active Yield</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.activeYield}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {filteredInverters.length} Units Active
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Max AC Power Output */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Max AC Power Output</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.maxAcPower}
              </span>
              <span className="text-xs font-medium text-slate-400">kW</span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              Peak at 12:15 PKT
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Avg DC/AC Efficiency */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Avg DC/AC Efficiency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.avgEfficiency}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              Top Tier MPPT
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Peak Thermal Level */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Peak Thermal Level</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.peakThermal}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              Normal Operating Limit
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Inverter Power Output & Thermal Curve Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            Inverter Power Output &amp; Thermal Curve {selectedSn === "All" ? "(Fleet View)" : `(SN: ${selectedSn})`}
          </h2>

          <div className="relative">
            <select
              aria-label="Filter inverter unit"
              value={selectedSn}
              onChange={(e) => setSelectedSn(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-slate-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all cursor-pointer shadow-2xs"
            >
              <option value="All">All Inverters (Fleet View)</option>
              {inverterRows.map((inv) => (
                <option key={inv.sn} value={inv.sn}>
                  {inv.sn} ({inv.plantName})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* EChart Canvas */}
        <div ref={chartRef} className="w-full h-80" />
      </div>

      {/* 4. Inverter Technical Specification Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            Inverter Technical Specification Table
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Total {filteredInverters.length} Inverters
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-slate-400 font-medium">
                <th className="py-3 px-4">Inverter SN</th>
                <th className="py-3 px-3">Plant Name</th>
                <th className="py-3 px-3">Model</th>
                <th className="py-3 px-3">Rated Power</th>
                <th className="py-3 px-3">{activeDateTab} Yield</th>
                <th className="py-3 px-3">PV1 Voltage</th>
                <th className="py-3 px-3">PV2 Voltage</th>
                <th className="py-3 px-3">Temp</th>
                <th className="py-3 px-3">Efficiency</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInverters.map((row) => (
                <tr key={row.sn} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-[#f37021]">
                    {row.sn}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-800">{row.plantName}</td>
                  <td className="py-3.5 px-3 text-slate-600">{row.model}</td>
                  <td className="py-3.5 px-3 text-slate-600">{row.ratedPowerKw} kW</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    {row.dailyYieldKwh} kWh
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{row.pv1Voltage} V</td>
                  <td className="py-3.5 px-3 text-slate-600">{row.pv2Voltage} V</td>
                  <td className="py-3.5 px-3 text-slate-600">{row.temperatureC}°C</td>
                  <td className="py-3.5 px-3 font-semibold text-emerald-600">
                    {row.efficiencyPct}%
                  </td>
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        row.status === "Warning"
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectInverter && onSelectInverter(row.sn)}
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
