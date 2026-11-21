"use client";

import React, { useState, useMemo } from "react";
import * as echarts from "echarts";
import {
  Download,
  Calendar,
  Building,
  Zap,
  TrendingUp,
  DollarSign,
  ChevronDown,
} from "lucide-react";

interface StationTelemetryItem {
  id: string;
  name: string;
  capacityKwp: number;
  dailyYieldKwh: number;
  monthlyTotalMwh: number;
  gridSoldKwh: number;
  gridPurchasedKwh: number;
  selfConsumptionPct: number;
  specificYieldH: number;
}

// Exact 6 Stations Data matching Screenshot 3: media_1795240078557_2d445ce4.jpg
const FLEET_STATIONS: StationTelemetryItem[] = [
  {
    id: "1298491919450797504",
    name: "Menu Karachi Office",
    capacityKwp: 80.0,
    dailyYieldKwh: 207.2,
    monthlyTotalMwh: 4.82,
    gridSoldKwh: 0,
    gridPurchasedKwh: 26.2,
    selfConsumptionPct: 100,
    specificYieldH: 2.59,
  },
  {
    id: "1298491919450740581",
    name: "P2G 50KW",
    capacityKwp: 32.0,
    dailyYieldKwh: 105.0,
    monthlyTotalMwh: 2.45,
    gridSoldKwh: 17.1,
    gridPurchasedKwh: 17.5,
    selfConsumptionPct: 84,
    specificYieldH: 3.28,
  },
  {
    id: "1298491919450873747",
    name: "36 Chenab",
    capacityKwp: 25.155,
    dailyYieldKwh: 89.7,
    monthlyTotalMwh: 2.15,
    gridSoldKwh: 58.2,
    gridPurchasedKwh: 6.7,
    selfConsumptionPct: 32,
    specificYieldH: 3.57,
  },
  {
    id: "1298491919450958553",
    name: "OPL Residence",
    capacityKwp: 55.5,
    dailyYieldKwh: 142.3,
    monthlyTotalMwh: 3.32,
    gridSoldKwh: 33.0,
    gridPurchasedKwh: 0,
    selfConsumptionPct: 77,
    specificYieldH: 2.56,
  },
  {
    id: "1298491919450851319",
    name: "P2G 20kw",
    capacityKwp: 20.0,
    dailyYieldKwh: 54.2,
    monthlyTotalMwh: 1.28,
    gridSoldKwh: 8.5,
    gridPurchasedKwh: 4.2,
    selfConsumptionPct: 84,
    specificYieldH: 2.71,
  },
  {
    id: "1298491919450734544",
    name: "P2G 15KW",
    capacityKwp: 20.0,
    dailyYieldKwh: 48.0,
    monthlyTotalMwh: 1.12,
    gridSoldKwh: 0,
    gridPurchasedKwh: 12.0,
    selfConsumptionPct: 100,
    specificYieldH: 2.40,
  },
];

interface SolisPlantReportViewProps {
  onSelectPlant?: (plantId: string) => void;
}

export default function SolisPlantReportView({ onSelectPlant }: SolisPlantReportViewProps) {
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year">("Month");
  const [selectedFleetFilter, setSelectedFleetFilter] = useState("All");

  const filteredStations = useMemo(() => {
    if (selectedFleetFilter === "All") return FLEET_STATIONS;
    return FLEET_STATIONS.filter((st) => st.id === selectedFleetFilter);
  }, [selectedFleetFilter]);

  // Aggregate KPI Calculations
  const fleetDailyYield = useMemo(
    () => filteredStations.reduce((acc, st) => acc + st.dailyYieldKwh, 0).toFixed(1),
    [filteredStations]
  );
  const totalCapacity = useMemo(
    () => filteredStations.reduce((acc, st) => acc + st.capacityKwp, 0).toFixed(1),
    [filteredStations]
  );
  const monthlyTotalYield = useMemo(
    () => filteredStations.reduce((acc, st) => acc + st.monthlyTotalMwh, 0).toFixed(2),
    [filteredStations]
  );

  // ECharts Bar Chart: Site Energy Comparison
  const chartRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);

    const stationNames = filteredStations.map((s) => s.name);
    const pvYield = filteredStations.map((s) => s.dailyYieldKwh);
    const selfConsumed = filteredStations.map((s) =>
      Number(((s.dailyYieldKwh * s.selfConsumptionPct) / 100).toFixed(1))
    );
    const gridExport = filteredStations.map((s) => s.gridSoldKwh);

    const option: echarts.EChartsOption = {
      animation: false,
      grid: { top: 30, left: 45, right: 25, bottom: 45 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f37021",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: stationNames,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: { color: "#64748b", fontSize: 11, interval: 0, rotate: 10 },
      },
      yAxis: {
        type: "value",
        max: 250,
        interval: 50,
        splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: [
        {
          name: "Solar PV Yield (kWh)",
          type: "bar",
          data: pvYield,
          itemStyle: { color: "#f97316", borderRadius: [4, 4, 0, 0] },
          barWidth: 22,
        },
        {
          name: "Self-Consumed (kWh)",
          type: "bar",
          data: selfConsumed,
          itemStyle: { color: "#10b981", borderRadius: [4, 4, 0, 0] },
          barWidth: 22,
        },
        {
          name: "Grid Export (kWh)",
          type: "bar",
          data: gridExport,
          itemStyle: { color: "#3b82f6", borderRadius: [4, 4, 0, 0] },
          barWidth: 22,
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
  }, [filteredStations]);

  const handleExport = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Station Name,Capacity (kWp),Daily Yield (kWh),Monthly Total (MWh),Grid Sold (kWh),Grid Purchased (kWh),Self-Consumption (%)"]
        .concat(
          filteredStations.map(
            (s) =>
              `"${s.name}",${s.capacityKwp},${s.dailyYieldKwh},${s.monthlyTotalMwh},${s.gridSoldKwh},${s.gridPurchasedKwh},${s.selfConsumptionPct}%`
          )
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `plant_performance_report_${activeDateTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto antialiased">
      {/* Title & Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#f37021] shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Plant Generation & Performance Report
            </h1>
            <p className="text-[11px] text-slate-400">
              Comprehensive energy production, self-consumption ratio, and financial yields across all sites.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Day / Month / Year Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            {(["Day", "Month", "Year"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDateTab(tab)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  activeDateTab === tab
                    ? "bg-white text-slate-900 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Export Report Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold shadow-2xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* 4 Large KPI Cards matching Screenshot 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Daily Yield */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Fleet Daily Yield
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{fleetDailyYield}</span>
              <span className="text-xs text-slate-500 font-medium">kWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              +12.4% vs Yesterday
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-[#f37021] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Installed Capacity */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Installed Capacity
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{totalCapacity}</span>
              <span className="text-xs text-slate-500 font-medium">kWp</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
              Across {filteredStations.length} Stations
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Monthly Yield */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Monthly Yield
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">{monthlyTotalYield}</span>
              <span className="text-xs text-slate-500 font-medium">MWh</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
              November 2026
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Financial Savings */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Financial Savings
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-slate-900">Rs 454,640</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 inline-block">
              Est. Monthly PKR
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Chart Section: Site Energy Comparison */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-slate-800">Site Energy Comparison</h2>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedFleetFilter}
                onChange={(e) => setSelectedFleetFilter(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:border-[#f37021] cursor-pointer"
              >
                <option value="All">All Plants (Fleet View)</option>
                {FLEET_STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#f97316]" />
            <span>Solar PV Yield (kWh)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#10b981]" />
            <span>Self-Consumed (kWh)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#3b82f6]" />
            <span>Grid Export (kWh)</span>
          </div>
        </div>

        {/* ECharts Canvas */}
        <div ref={chartRef} className="w-full h-72 sm:h-80" />
      </div>

      {/* Station Telemetry Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-800">Station Telemetry Breakdown</h2>
          <span className="text-xs text-slate-400 font-medium">Total {filteredStations.length} Stations</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 text-[11px] border-b border-slate-100 bg-white">
                <th className="py-3 px-4 font-medium">Station Name</th>
                <th className="py-3 px-3 font-medium">Capacity</th>
                <th className="py-3 px-3 font-medium">Daily Yield</th>
                <th className="py-3 px-3 font-medium">Monthly Total</th>
                <th className="py-3 px-3 font-medium">Grid Sold</th>
                <th className="py-3 px-3 font-medium">Grid Purchased</th>
                <th className="py-3 px-3 font-medium">Self-Consumption</th>
                <th className="py-3 px-3 font-medium">Specific Yield</th>
                <th className="py-3 px-4 font-medium text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
              {filteredStations.map((station) => (
                <tr key={station.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-sans font-semibold text-[#ea580c]">
                    {station.name}
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600">{station.capacityKwp} kWp</td>
                  <td className="py-3 px-3 font-bold text-slate-900">{station.dailyYieldKwh} kWh</td>
                  <td className="py-3 px-3 text-slate-700">{station.monthlyTotalMwh} MWh</td>
                  <td className="py-3 px-3 text-blue-600">{station.gridSoldKwh} kWh</td>
                  <td className="py-3 px-3 text-slate-700">{station.gridPurchasedKwh} kWh</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {station.selfConsumptionPct}%
                    </span>
                  </td>
                  <td className="py-3 px-3 font-sans text-slate-600">{station.specificYieldH} h</td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onSelectPlant && onSelectPlant(station.id)}
                      className="px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:border-[#f37021] hover:text-[#f37021] text-xs font-semibold shadow-2xs transition-all"
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

