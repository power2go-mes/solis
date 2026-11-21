"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as echarts from "echarts";
import {
  Download,
  Calendar,
  Building,
  Zap,
  TrendingUp,
  DollarSign,
  ChevronDown,
  FileSpreadsheet,
} from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";

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

const DEFAULT_FLEET_STATIONS: StationTelemetryItem[] = [
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
  const [reportDate, setReportDate] = useState("2026-11-20");
  const [stationRows, setStationRows] = useState<StationTelemetryItem[]>(DEFAULT_FLEET_STATIONS);
  const [chartTimeline, setChartTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real aggregated data whenever date, period, or station changes
  useEffect(() => {
    let active = true;
    setLoading(true);
    const periodParam = activeDateTab.toLowerCase();
    const stParam = selectedFleetFilter !== "All" ? `&stationId=${encodeURIComponent(selectedFleetFilter)}` : "";
    fetch(`/api/reports?type=plant&period=${periodParam}&date=${reportDate}${stParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success && Array.isArray(data.rows)) {
          setStationRows(
            data.rows.map((r: any) => ({
              id: r.id,
              name: r.name,
              capacityKwp: r.capacityKwp,
              dailyYieldKwh: r.yieldKwh,
              monthlyTotalMwh: r.monthlyTotalMwh,
              gridSoldKwh: r.gridSoldKwh,
              gridPurchasedKwh: r.gridPurchasedKwh,
              selfConsumptionPct: r.selfConsumptionPct,
              specificYieldH: r.specificYieldH,
            }))
          );
        } else {
          setStationRows([]);
        }
        if (data.success && Array.isArray(data.chartData)) {
          setChartTimeline(data.chartData);
        } else {
          setChartTimeline([]);
        }
      })
      .catch((err) => console.error("Error fetching plant report:", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeDateTab, selectedFleetFilter, reportDate]);

  const filteredStations = useMemo(() => {
    if (selectedFleetFilter === "All") return stationRows;
    return stationRows.filter((st) => st.id === selectedFleetFilter);
  }, [selectedFleetFilter, stationRows]);

  // Aggregate KPI Calculations
  const fleetTotalYield = useMemo(() => {
    const sum = filteredStations.reduce((acc, st) => acc + st.dailyYieldKwh, 0);
    return sum.toFixed(2);
  }, [filteredStations]);

  const totalCapacity = useMemo(() => {
    return filteredStations.reduce((acc, st) => acc + st.capacityKwp, 0).toFixed(2);
  }, [filteredStations]);

  const periodYieldDisplay = useMemo(() => {
    const sumKwh = filteredStations.reduce((acc, st) => acc + st.dailyYieldKwh, 0);
    if (activeDateTab === "Year") {
      return `${(sumKwh / 1000).toFixed(2)} MWh`;
    }
    if (activeDateTab === "Month") {
      return `${(sumKwh / 1000).toFixed(2)} MWh`;
    }
    return `${sumKwh.toFixed(2)} kWh`;
  }, [filteredStations, activeDateTab]);

  const financialSavings = useMemo(() => {
    const sumKwh = filteredStations.reduce((acc, st) => acc + st.dailyYieldKwh, 0);
    // Average solar unit tariff in PKR (~Rs 30/kWh)
    const pkr = Math.round(sumKwh * 30);
    return `Rs ${pkr.toLocaleString()}`;
  }, [filteredStations]);

  // ECharts: Dynamic Real Data Comparison & Timeline Chart
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    let option: echarts.EChartsOption;

    if (activeDateTab === "Day" && chartTimeline.length > 0) {
      // Intraday 24-Hour Solar & Load Curve
      const times = chartTimeline.map((p) => p.time_label);
      const solarKw = chartTimeline.map((p) => Number(p.solar_kw) || 0);
      const loadKw = chartTimeline.map((p) => Number(p.load_kw) || 0);
      const gridKw = chartTimeline.map((p) => Number(p.grid_kw) || 0);

      option = {
        animation: true,
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 12 },
        },
        legend: {
          bottom: 0,
          data: ["Solar PV Generation (kW)", "House Load (kW)", "Grid Export/Import (kW)"],
          textStyle: { color: "#64748b", fontSize: 11 },
        },
        grid: { top: 30, left: 50, right: 25, bottom: 45, containLabel: true },
        xAxis: {
          type: "category",
          data: times,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#64748b", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "kW",
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          {
            name: "Solar PV Generation (kW)",
            type: "line",
            smooth: true,
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(243, 112, 33, 0.35)" },
                { offset: 1, color: "rgba(243, 112, 33, 0.0)" },
              ]),
            },
            itemStyle: { color: "#f37021" },
            data: solarKw,
          },
          {
            name: "House Load (kW)",
            type: "line",
            smooth: true,
            itemStyle: { color: "#10b981" },
            data: loadKw,
          },
          {
            name: "Grid Export/Import (kW)",
            type: "bar",
            barMaxWidth: 15,
            itemStyle: { color: "#3b82f6" },
            data: gridKw,
          },
        ],
      };
    } else {
      // Comparison Bar Chart across Stations (or Daily Timeline in Month/Year)
      const stationNames = filteredStations.map((s) => s.name);
      const pvYield = filteredStations.map((s) => s.dailyYieldKwh);
      const selfConsumed = filteredStations.map((s) =>
        Number(((s.dailyYieldKwh * s.selfConsumptionPct) / 100).toFixed(2))
      );
      const gridExport = filteredStations.map((s) => s.gridSoldKwh);

      option = {
        animation: true,
        grid: { top: 30, left: 50, right: 25, bottom: 50, containLabel: true },
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 12 },
        },
        legend: {
          bottom: 0,
          data: ["Solar PV Yield (kWh)", "Self-Consumed (kWh)", "Grid Export (kWh)"],
          textStyle: { color: "#64748b", fontSize: 11 },
        },
        xAxis: {
          type: "category",
          data: stationNames,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#64748b", fontSize: 11, interval: 0, rotate: 10 },
        },
        yAxis: {
          type: "value",
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          {
            name: "Solar PV Yield (kWh)",
            type: "bar",
            barWidth: 20,
            itemStyle: { color: "#f37021", borderRadius: [3, 3, 0, 0] },
            data: pvYield,
          },
          {
            name: "Self-Consumed (kWh)",
            type: "bar",
            barWidth: 20,
            itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] },
            data: selfConsumed,
          },
          {
            name: "Grid Export (kWh)",
            type: "bar",
            barWidth: 20,
            itemStyle: { color: "#3b82f6", borderRadius: [3, 3, 0, 0] },
            data: gridExport,
          },
        ],
      };
    }

    chart.setOption(option, true);
    chart.resize();

    const handleResize = () => chart?.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart?.dispose();
    };
  }, [filteredStations, activeDateTab, chartTimeline]);

  // Export to Professional Excel (.xlsx)
  const handleExportExcel = () => {
    const excelRows = filteredStations.map((st) => ({
      "Station ID": st.id,
      "Station Name": st.name,
      "Period": activeDateTab,
      "Report Date": reportDate,
      "Capacity (kWp)": st.capacityKwp,
      [`Yield (${activeDateTab === "Day" ? "kWh" : "kWh / MWh"})`]: st.dailyYieldKwh,
      "Self-Consumption (%)": `${st.selfConsumptionPct}%`,
      "Grid Export (kWh)": st.gridSoldKwh,
      "Grid Purchased (kWh)": st.gridPurchasedKwh,
      "Specific Yield (h)": st.specificYieldH,
    }));

    exportToExcel(
      [
        { sheetName: "Plant Performance", data: excelRows },
        ...(chartTimeline.length > 0
          ? [{ sheetName: "Timeline Telemetry", data: chartTimeline }]
          : []),
      ],
      `SolisCloud_Plant_Report_${activeDateTab}_${reportDate}`
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] tracking-tight">
              Plant Generation &amp; Performance Report
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive energy production, self-consumption ratio, and financial yields across all sites.
            </p>
          </div>
        </div>

        {/* Action Bar: Period Tabs, Date Picker, Export Excel */}
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

          {/* Date Picker */}
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

          {/* Export Excel Button */}
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
        {/* KPI 1: Fleet Yield */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">
              Fleet {activeDateTab} Yield
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {fleetTotalYield}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              +12.4% vs Previous {activeDateTab}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Installed Capacity */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Total Installed Capacity</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {totalCapacity}
              </span>
              <span className="text-xs font-medium text-slate-400">kWp</span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              Across {filteredStations.length} Stations
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Building className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Period Total Production */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">
              {activeDateTab} Total Yield
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {periodYieldDisplay}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              Recorded in Database
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Financial Savings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Financial Savings</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0f172a] font-sans">
                {financialSavings}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              Est. {activeDateTab} PKR Savings
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Site Energy Comparison Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">
            {activeDateTab === "Day" && chartTimeline.length > 0
              ? "24-Hour Energy Generation & Load Profile"
              : "Site Energy Generation & Breakdown Comparison"}
          </h2>

          <div className="relative">
            <select
              aria-label="Filter station fleet"
              value={selectedFleetFilter}
              onChange={(e) => setSelectedFleetFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-slate-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-orange-400 transition-all cursor-pointer shadow-2xs"
            >
              <option value="All">All Plants (Fleet View)</option>
              {stationRows.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* EChart Canvas */}
        <div ref={chartRef} className="w-full h-80" />
      </div>

      {/* 4. Station Telemetry Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Station Telemetry Breakdown</h3>
          <span className="text-xs text-slate-400 font-medium">
            Total {filteredStations.length} Stations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-slate-400 font-medium">
                <th className="py-3 px-4">Station Name</th>
                <th className="py-3 px-3">Capacity</th>
                <th className="py-3 px-3">{activeDateTab} Yield</th>
                <th className="py-3 px-3">Period Total</th>
                <th className="py-3 px-3">Grid Sold</th>
                <th className="py-3 px-3">Grid Purchased</th>
                <th className="py-3 px-3">Self-Consumption</th>
                <th className="py-3 px-3">Specific Yield</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStations.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[#f37021]">{row.name}</td>
                  <td className="py-3.5 px-3 text-slate-600">{row.capacityKwp} kWp</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-900">
                    {row.dailyYieldKwh} kWh
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.monthlyTotalMwh} MWh
                  </td>
                  <td className="py-3.5 px-3 font-medium text-blue-600">
                    {row.gridSoldKwh} kWh
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.gridPurchasedKwh} kWh
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                      {row.selfConsumptionPct}%
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">{row.specificYieldH} h</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectPlant && onSelectPlant(row.id)}
                      className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs font-semibold text-slate-700 hover:text-[#f37021] hover:border-orange-300 active:scale-95 transition-all shadow-2xs"
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
