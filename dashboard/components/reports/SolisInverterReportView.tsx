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
} from "lucide-react";

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

// Exact Inverter Fleet Records matching Screenshot 2: media_1795240078562_56411e1a.jpg
const INVERTER_REPORT_RECORDS: InverterReportRecord[] = [
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
  const [selectedInverterSn, setSelectedInverterSn] = useState("All");
  const [currentDateStr, setCurrentDateStr] = useState("20/11/2026");

  const filteredInverters = useMemo(() => {
    if (selectedInverterSn === "All") return INVERTER_REPORT_RECORDS;
    return INVERTER_REPORT_RECORDS.filter((inv) => inv.sn === selectedInverterSn);
  }, [selectedInverterSn]);

  const activeInverter = useMemo(() => {
    return (
      INVERTER_REPORT_RECORDS.find((inv) => inv.sn === selectedInverterSn) ||
      INVERTER_REPORT_RECORDS[0]
    );
  }, [selectedInverterSn]);

  // Aggregate KPIs
  const fleetActiveYield = useMemo(
    () => filteredInverters.reduce((acc, inv) => acc + inv.dailyYieldKwh, 0).toFixed(1),
    [filteredInverters]
  );

  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    // Generate bell curve for power and temperature matching screenshot 2
    const times: string[] = [];
    const powerCurve: number[] = [];
    const tempCurve: number[] = [];

    for (let h = 6; h <= 18; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);

      // Peak around 12:00 at 49.6 kW
      const prog = (h - 6) / 12;
      const p = Math.max(0, Math.sin(prog * Math.PI) * 49.6);
      powerCurve.push(Number(p.toFixed(1)));

      // Temp rises from 28Â°C to ~39.1Â°C
      const temp = 28 + Math.sin(prog * Math.PI) * 11.5;
      tempCurve.push(Number(temp.toFixed(1)));
    }

    const option: echarts.EChartsOption = {
      animation: false,
      grid: { top: 35, left: 45, right: 45, bottom: 35 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f37021",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: times,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      yAxis: [
        {
          type: "value",
          name: "kW",
          max: 50,
          interval: 10,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        {
          type: "value",
          name: "Â°C",
          max: 40,
          min: 0,
          interval: 10,
          splitLine: { show: false },
          axisLabel: { color: "#ef4444", fontSize: 10 },
        },
      ],
      series: [
        {
          name: "AC Output Power (kW)",
          type: "line",
          data: powerCurve,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: "#f97316" },
          lineStyle: { color: "#f97316", width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(249, 115, 22, 0.35)" },
              { offset: 1, color: "rgba(249, 115, 22, 0.02)" },
            ]),
          },
        },
        {
          name: "Internal Temperature (Â°C)",
          type: "line",
          yAxisIndex: 1,
          data: tempCurve,
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          itemStyle: { color: "#ef4444" },
          lineStyle: { color: "#ef4444", width: 1.5, type: "dashed" },
        },
      ],
    };

    chart.setOption(option);
    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [activeInverter]);

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Inverter SN,Plant Name,Model,Rated Power (kW),Daily Yield (kWh),PV1 Voltage (V),PV2 Voltage (V),Temp (C),Efficiency (%)"]
        .concat(
          filteredInverters.map(
            (inv) =>
              `"${inv.sn}","${inv.plantName}","${inv.model}",${inv.ratedPowerKw},${inv.dailyYieldKwh},${inv.pv1Voltage},${inv.pv2Voltage},${inv.temperatureC},${inv.efficiencyPct}%`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.body.appendChild(document.createElement("a"));
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inverter_operating_report_${currentDateStr}.csv`);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto antialiased">
      {/* Title & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#f37021] shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Inverter Operating & Telemetry Report
            </h1>
            <p className="text-[11px] text-slate-400">
              DC bus electrical telemetry, conversion efficiencies, thermal behavior, and uptime metrics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono text-[11px] font-semibold">{currentDateStr}</span>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Large KPI Cards matching Screenshot 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Fleet Active Yield
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{fleetActiveYield}</span>
              <span className="text-xs text-slate-500 font-medium">kWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              {filteredInverters.length} Units Online
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#f37021] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Max AC Power Output
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">49.6</span>
              <span className="text-xs text-slate-500 font-medium">kW</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
              Peak at 12:15 PKT
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg DC/AC Efficiency
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">98.2%</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              Top Tier MPPT
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peak Thermal Level
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">39.1Â°C</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
              Normal Operating Limit
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-800">
            Inverter Power Output & Thermal Curve (SN: {activeInverter.sn})
          </h2>

          <div className="relative">
            <select
              value={selectedInverterSn}
              onChange={(e) => setSelectedInverterSn(e.target.value)}
              className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:border-[#f37021] cursor-pointer"
            >
              <option value="All">All Inverters</option>
              {INVERTER_REPORT_RECORDS.map((inv) => (
                <option key={inv.sn} value={inv.sn}>
                  {inv.plantName} ({inv.sn.slice(-6)})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
            <span>AC Output Power (kW)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span>Internal Temperature (Â°C)</span>
          </div>
        </div>

        <div ref={chartRef} className="w-full h-72 sm:h-80" />
      </div>

      {/* Inverter Technical Specification Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-800">Inverter Technical Specification Table</h2>
          <span className="text-xs text-slate-400 font-medium">Total {filteredInverters.length} Inverters</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 text-[11px] border-b border-slate-100 bg-white">
                <th className="py-3 px-4 font-medium">Inverter SN</th>
                <th className="py-3 px-3 font-medium">Plant Name</th>
                <th className="py-3 px-3 font-medium">Model</th>
                <th className="py-3 px-3 font-medium">Rated Power</th>
                <th className="py-3 px-3 font-medium">Daily Yield</th>
                <th className="py-3 px-3 font-medium">PV1 Voltage</th>
                <th className="py-3 px-3 font-medium">PV2 Voltage</th>
                <th className="py-3 px-3 font-medium">Temp</th>
                <th className="py-3 px-3 font-medium">Efficiency</th>
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
              {filteredInverters.map((inv) => (
                <tr key={inv.sn} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 text-[#ea580c] font-semibold">{inv.sn}</td>
                  <td className="py-3 px-3 font-sans text-slate-700">{inv.plantName}</td>
                  <td className="py-3 px-3 font-sans text-slate-500">{inv.model}</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{inv.ratedPowerKw} kW</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{inv.dailyYieldKwh} kWh</td>
                  <td className="py-3 px-3 text-slate-700">{inv.pv1Voltage} V</td>
                  <td className="py-3 px-3 text-slate-700">{inv.pv2Voltage} V</td>
                  <td className="py-3 px-3 text-slate-700">{inv.temperatureC}Â°C</td>
                  <td className="py-3 px-3 text-emerald-600 font-bold">{inv.efficiencyPct}%</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        inv.status === "Warning"
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectInverter && onSelectInverter(inv.sn)}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:border-[#f37021] hover:text-[#f37021] text-xs font-semibold shadow-2xs transition-all"
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

