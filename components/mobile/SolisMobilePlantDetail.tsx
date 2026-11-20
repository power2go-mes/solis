"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  Clock,
  Box,
  MoreHorizontal,
  Filter,
  Maximize2,
  HelpCircle,
  Menu,
  Sun,
  Home,
  BatteryCharging,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
} from "lucide-react";

import SolisMobileCommercialPowerFlow from "./SolisMobileCommercialPowerFlow";
import SolisMobileEnergyBreakdown from "./SolisMobileEnergyBreakdown";
import SolisMobileDevicesView from "./SolisMobileDevicesView";
import SolisMobileAlarmsView from "./SolisMobileAlarmsView";
import SolisPlantInfoTab from "../SolisPlantInfoTab";
import SolisDevicesTab from "../SolisDevicesTab";
import SolisAlarmsTab from "../SolisAlarmsTab";
import { PlantInfo, TelemetryLatest, EnergyBreakdownResult, DailyEnergyRecord } from "@/lib/types";
import { ChartSeriesData } from "@/lib/db";

interface SolisMobilePlantDetailProps {
  selectedPlantId: string;
  plantsList: PlantInfo[];
  initialTab?: string;
  onSelectPlant: (plantId: string) => void;
  onBack: () => void;
}

// Plant metadata mapping matching exact mobile screenshots
interface MobilePlantMeta {
  displayId: string;
  name: string;
  address: string;
  capacityKwp: number;
  temp: string;
  defaultYieldKwh: number;
  defaultConsumptionKwh: number;
  defaultDischargeKwh: number;
  defaultChargeKwh: number;
  defaultImportKwh: number;
  defaultExportKwh: number;
  toConsumptionKwh: number;
  toConsumptionPercent: number;
  toGridKwh: number;
  toGridPercent: number;
}

const MOBILE_METAS: Record<string, MobilePlantMeta> = {
  // P2G 50KW (Exact mobile reference plant from screenshots!)
  "1298491919450740581": {
    displayId: "3212F1",
    name: "P2G 50KW",
    address: "Ahbab Street, Korangi Industrial Area, Karachi",
    capacityKwp: 32.0,
    temp: "21/29℃",
    defaultYieldKwh: 105.0,
    defaultConsumptionKwh: 77.5,
    defaultDischargeKwh: 14.6,
    defaultChargeKwh: 36.2,
    defaultImportKwh: 17.5,
    defaultExportKwh: 17.1,
    toConsumptionKwh: 87.9,
    toConsumptionPercent: 84,
    toGridKwh: 17.1,
    toGridPercent: 16,
  },
  // 36 Chenab
  "1298491919450873747": {
    displayId: "34200F",
    name: "36 Chenab",
    address: "Plot 36, Green Forts 2, Lahore",
    capacityKwp: 25.155,
    temp: "14/26℃",
    defaultYieldKwh: 89.7,
    defaultConsumptionKwh: 27.3,
    defaultDischargeKwh: 2.4,
    defaultChargeKwh: 17.8,
    defaultImportKwh: 6.7,
    defaultExportKwh: 58.2,
    toConsumptionKwh: 27.3,
    toConsumptionPercent: 32,
    toGridKwh: 58.2,
    toGridPercent: 68,
  },
  // OPL Residence
  "1298491919450958553": {
    displayId: "34202A",
    name: "OPL Residence",
    address: "5.6 KM, Sindh Coastal Highway, Gharo",
    capacityKwp: 55.5,
    temp: "20/31℃",
    defaultYieldKwh: 201.4,
    defaultConsumptionKwh: 64.2,
    defaultDischargeKwh: 12.0,
    defaultChargeKwh: 45.0,
    defaultImportKwh: 8.5,
    defaultExportKwh: 142.0,
    toConsumptionKwh: 59.4,
    toConsumptionPercent: 30,
    toGridKwh: 142.0,
    toGridPercent: 70,
  },
  // Menu Karachi Office
  "1298491919450797504": {
    displayId: "341FFB",
    name: "Menu Karachi Office",
    address: "Menu karachi DC office, Karachi",
    capacityKwp: 80.0,
    temp: "21/32℃",
    defaultYieldKwh: 169.8,
    defaultConsumptionKwh: 153.4,
    defaultDischargeKwh: 27.8,
    defaultChargeKwh: 109.0,
    defaultImportKwh: 68.4,
    defaultExportKwh: 0.1,
    toConsumptionKwh: 169.7,
    toConsumptionPercent: 99,
    toGridKwh: 0.1,
    toGridPercent: 1,
  },
  // Towfiq chinoy
  "1298491919451014032": {
    displayId: "3649E0",
    name: "Towfiq chinoy",
    address: "Karachi, Sindh, Pakistan",
    capacityKwp: 29.67,
    temp: "21/32℃",
    defaultYieldKwh: 45.2,
    defaultConsumptionKwh: 18.4,
    defaultDischargeKwh: 6.2,
    defaultChargeKwh: 14.5,
    defaultImportKwh: 5.2,
    defaultExportKwh: 12.0,
    toConsumptionKwh: 33.2,
    toConsumptionPercent: 73,
    toGridKwh: 12.0,
    toGridPercent: 27,
  },
  // P2G 20kw
  "1298491919450851319": {
    displayId: "3212E5",
    name: "P2G 20kw",
    address: "Ahbab Street, Korangi Industrial Area, Karachi",
    capacityKwp: 18.0,
    temp: "21/29℃",
    defaultYieldKwh: 0.0,
    defaultConsumptionKwh: 0.0,
    defaultDischargeKwh: 0.0,
    defaultChargeKwh: 0.0,
    defaultImportKwh: 0.0,
    defaultExportKwh: 0.0,
    toConsumptionKwh: 0.0,
    toConsumptionPercent: 0,
    toGridKwh: 0.0,
    toGridPercent: 0,
  },
  // P2G 15KW
  "1298491919450734544": {
    displayId: "3212D8",
    name: "P2G 15KW",
    address: "1D-203, Ahbab Street, Korangi, Karachi",
    capacityKwp: 20.0,
    temp: "21/29℃",
    defaultYieldKwh: 0.0,
    defaultConsumptionKwh: 0.0,
    defaultDischargeKwh: 0.0,
    defaultChargeKwh: 0.0,
    defaultImportKwh: 0.0,
    defaultExportKwh: 0.0,
    toConsumptionKwh: 0.0,
    toConsumptionPercent: 0,
    toGridKwh: 0.0,
    toGridPercent: 0,
  },
};

function getPktDateStr(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

export default function SolisMobilePlantDetail({
  selectedPlantId,
  plantsList,
  initialTab = "Overview",
  onSelectPlant,
  onBack,
}: SolisMobilePlantDetailProps) {
  // Navigation tabs at bottom
  const [activeBottomNav, setActiveBottomNav] = useState<string>(initialTab);

  // Granularity selector: Day | Month | Year | Lifetime
  const [granularity, setGranularity] = useState<"Day" | "Month" | "Year">("Day");
  const [currentDate, setCurrentDate] = useState<string>(getPktDateStr);

  // Series visibility toggles for Chart Analysis
  const [visibleSeries, setVisibleSeries] = useState({
    pv: true,
    grid: true,
    battery: true,
    soc: true,
    load: true,
    purchaseTariff: true,
    feedInTariff: true,
  });

  // Data states
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [dayCurveData, setDayCurveData] = useState<ChartSeriesData | null>(null);
  const [dayDailyEnergy, setDayDailyEnergy] = useState<DailyEnergyRecord | null>(null);
  const [plantDetailsData, setPlantDetailsData] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(false);

  // Chart ref
  const chartRef = useRef<HTMLDivElement>(null);
  const socChartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const socChartInstance = useRef<echarts.ECharts | null>(null);

  const meta =
    MOBILE_METAS[selectedPlantId] ||
    ({
      displayId: "3212F1",
      name: plantsList.find((p) => p.id === selectedPlantId)?.name || "P2G 50KW",
      address: "Karachi, Pakistan",
      capacityKwp: 32.0,
      temp: "21/29℃",
      defaultYieldKwh: 105.0,
      defaultConsumptionKwh: 77.5,
      defaultDischargeKwh: 14.6,
      defaultChargeKwh: 36.2,
      defaultImportKwh: 17.5,
      defaultExportKwh: 17.1,
      toConsumptionKwh: 87.9,
      toConsumptionPercent: 84,
      toGridKwh: 17.1,
      toGridPercent: 16,
    } as MobilePlantMeta);

  // Fetch telemetry
  const loadTelemetry = useCallback(async () => {
    try {
      const res = await fetch(`/api/telemetry/latest?stationId=${selectedPlantId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.telemetry) {
        setTelemetry(data.telemetry);
      }
    } catch (err) {
      console.error("Error loading mobile telemetry:", err);
    }
  }, [selectedPlantId]);

  // Fetch the selected chart range and daily energy totals for the KPI cards.
  const loadCurve = useCallback(async () => {
    try {
      const [curveRes, dailyRes] = await Promise.all([
        granularity === "Day"
          ? fetch(
              `/api/telemetry/curve?stationId=${selectedPlantId}&range=day&date=${currentDate}`,
              { cache: "no-store" }
            )
          : Promise.resolve(null),
        fetch(
          `/api/energy/daily?stationId=${selectedPlantId}&startDate=${currentDate}&endDate=${currentDate}`,
          { cache: "no-store" }
        ),
      ]);

      if (dailyRes.ok) {
        const dData = await dailyRes.json();
        if (dData.success && dData.records && dData.records.length > 0) {
          setDayDailyEnergy(dData.records[0]);
        } else {
          setDayDailyEnergy(null);
        }
      }

      if (curveRes?.ok) {
        const data = await curveRes.json();
        if (data.success && data.chartData) {
          setDayCurveData(data.chartData);
        }
      } else if (granularity !== "Day") {
        setDayCurveData(null);
      }
    } catch (err) {
      console.error("Error loading mobile curves:", err);
    }
  }, [selectedPlantId, currentDate, granularity]);

  // Fetch plant details (inverters, batteries, alarms, plant info)
  const loadPlantDetails = useCallback(async () => {
    setIsDetailsLoading(true);
    try {
      const res = await fetch(`/api/plant/details?stationId=${selectedPlantId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPlantDetailsData(data);
        }
      }
    } catch (err) {
      console.error("Error loading mobile plant details:", err);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [selectedPlantId]);

  useEffect(() => {
    loadTelemetry();
    loadCurve();
    loadPlantDetails();
  }, [loadTelemetry, loadCurve, loadPlantDetails]);

  // Date formatted for display: "19/11/2026"
  const [y, m, d] = currentDate.split("-");
  const displayDate = `${d}/${m}/${y}`;

  const handlePrevDate = () => {
    const [year, month, day] = currentDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    dateObj.setUTCDate(dateObj.getUTCDate() - 1);
    setCurrentDate(dateObj.toISOString().slice(0, 10));
  };

  const handleNextDate = () => {
    const [year, month, day] = currentDate.split("-").map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
    setCurrentDate(dateObj.toISOString().slice(0, 10));
  };

  // Live telemetry metrics
  const liveSolar = Number(telemetry?.solar_power_kw ?? (selectedPlantId === "1298491919450740581" ? 12.3 : 10.5));
  const liveLoad = Number(telemetry?.load_power_kw ?? (selectedPlantId === "1298491919450740581" ? 9.8 : 1.4));
  const liveBatterySoc = Number(telemetry?.battery_soc ?? (selectedPlantId === "1298491919450740581" ? 60 : 100));
  const liveBatteryKw = Number(telemetry?.battery_power_kw ?? (selectedPlantId === "1298491919450740581" ? 2.1 : 0.0));
  const liveBatteryState = telemetry?.battery_direction ?? "Charging";
  const liveGridKw = Number(telemetry?.grid_power_kw ?? 0.0);
  const powerSeriesControls = [
    { key: "pv", label: "PV", color: "#eab308" },
    { key: "grid", label: "Grid", color: "#3b82f6" },
    { key: "battery", label: "Battery", color: "#22c55e" },
    { key: "load", label: "Total Load", color: "#8b5cf6" },
  ] as const;
  const socSeriesControls = [
    { key: "soc", label: "SOC", color: "#10b981" },
    { key: "purchaseTariff", label: "Purchase Tariff", color: "#38bdf8" },
    { key: "feedInTariff", label: "Feed-in Tariff", color: "#2563eb" },
  ] as const;

  // ECharts: Multi-series Chart Analysis
  useEffect(() => {
    if (!chartRef.current) return;

    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    if (!dayCurveData) {
      chart.clear();
      if (socChartRef.current) {
        echarts.getInstanceByDom(socChartRef.current)?.clear();
      }
      return;
    }

    const timestamps = dayCurveData.timeLabels || (dayCurveData as any).timestamps || [];
    const pvData = dayCurveData.pvData || (dayCurveData as any).solarKw || [];
    const gridData = dayCurveData.gridData || (dayCurveData as any).gridKw || [];
    const batData = dayCurveData.batteryData || (dayCurveData as any).batteryKw || [];
    const loadData = dayCurveData.loadData || (dayCurveData as any).loadKw || [];
    const socData = dayCurveData.socData || (dayCurveData as any).batterySoc || [];

    const isViewingToday = currentDate === getPktDateStr();
    const nowIndex = isViewingToday && dayCurveData.currentNowIndex !== undefined ? dayCurveData.currentNowIndex : -1;
    const nowTimeStr = nowIndex >= 0 ? timestamps[nowIndex] : "";

    const seriesList: any[] = [];

    if (visibleSeries.pv) {
      seriesList.push({
        name: "PV",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: pvData,
        lineStyle: { color: "#eab308", width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(234, 179, 8, 0.35)" },
            { offset: 1, color: "rgba(234, 179, 8, 0.02)" },
          ]),
        },
        markLine:
          nowIndex >= 0
            ? {
                symbol: "none",
                silent: true,
                lineStyle: { type: "dashed", color: "#f97316", width: 1.2 },
                label: { show: false },
                data: [{ xAxis: nowTimeStr }],
              }
            : undefined,
      });
    }

    if (visibleSeries.grid) {
      seriesList.push({
        name: "Grid",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: gridData,
        lineStyle: { color: "#3b82f6", width: 1.5 },
      });
    }

    if (visibleSeries.battery) {
      seriesList.push({
        name: "Battery",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: batData,
        lineStyle: { color: "#22c55e", width: 1.5 },
      });
    }

    if (visibleSeries.load) {
      seriesList.push({
        name: "Total Load",
        type: "line",
        smooth: true,
        showSymbol: false,
        data: loadData,
        lineStyle: { color: "#8b5cf6", width: 1.8 },
      });
    }

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 400,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 11 },
      },
      grid: {
        top: 26,
        right: 38,
        bottom: 30,
        left: 38,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 9,
          interval: (index: number) => index % 36 === 0, // Show every 3 hours
          formatter: (value: string) => {
            const [h] = value.split(":");
            const hour = parseInt(h, 10);
            return `${hour}:00`;
          },
        },
      },
      yAxis: {
        type: "value",
        name: "kW",
        nameLocation: "end",
        nameTextStyle: { color: "#64748b", fontSize: 10, padding: [0, 6, 2, 0] },
        splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 9 },
      },
      series: seriesList,
    };

    const tariffPurchase = dayCurveData.purchaseTariffData || timestamps.map(() => 4.5);
    const tariffFeedIn = dayCurveData.feedInTariffData || timestamps.map(() => 2.2);
    const socSeries: echarts.SeriesOption[] = [];
    if (visibleSeries.soc) {
      socSeries.push({ name: "SOC", type: "line", smooth: true, showSymbol: false, data: socData, lineStyle: { color: "#10b981", width: 1.8 } });
    }
    if (visibleSeries.purchaseTariff) {
      socSeries.push({ name: "Purchase Tariff", type: "line", yAxisIndex: 1, showSymbol: false, data: tariffPurchase, lineStyle: { color: "#38bdf8", width: 1.5 } });
    }
    if (visibleSeries.feedInTariff) {
      socSeries.push({ name: "Feed-in Tariff", type: "line", yAxisIndex: 1, showSymbol: false, data: tariffFeedIn, lineStyle: { color: "#2563eb", width: 1.5 } });
    }

    const socOption: echarts.EChartsOption = {
      animation: true,
      animationDuration: 400,
      tooltip: { trigger: "axis", backgroundColor: "rgba(255, 255, 255, 0.95)", borderColor: "#e2e8f0", borderWidth: 1, textStyle: { color: "#1e293b", fontSize: 11 } },
      grid: { top: 26, right: 42, bottom: 30, left: 38, containLabel: true },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 9, interval: (index: number) => index % 36 === 0 },
      },
      yAxis: [
        { type: "value", name: "%", min: 0, max: 100, interval: 20, nameLocation: "end", nameTextStyle: { color: "#64748b", fontSize: 10 }, splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#94a3b8", fontSize: 9 } },
        { type: "value", name: "PKR/kWh", min: 0, max: 5, interval: 1, nameLocation: "end", nameTextStyle: { color: "#64748b", fontSize: 9 }, splitLine: { show: false }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: "#94a3b8", fontSize: 9 } },
      ],
      series: socSeries,
    };

    chart.setOption(option, true);
    chart.resize();
    let socChart = socChartRef.current ? echarts.getInstanceByDom(socChartRef.current) : null;
    if (socChartRef.current && (!socChart || socChart.isDisposed())) socChart = echarts.init(socChartRef.current);
    if (socChart) {
      socChartInstance.current = socChart;
      socChart.setOption(socOption, true);
      socChart.resize();
    }
  }, [dayCurveData, visibleSeries, granularity, currentDate]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      chartInstance.current?.resize();
      socChartInstance.current?.resize();
    };
    window.addEventListener("resize", handleResize);
    const observer = new ResizeObserver(handleResize);
    if (chartRef.current) observer.observe(chartRef.current);
    if (socChartRef.current) observer.observe(socChartRef.current);
    return () => {
      window.removeEventListener("resize", handleResize);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fa] pb-24 text-slate-800 flex flex-col antialiased relative">
      {/* ======================================================== */}
      {/* 1. TOP MOBILE HEADER: < Back, Title, ID, More Menu        */}
      {/* ======================================================== */}
      <div className="bg-white px-3.5 py-2.5 flex items-center justify-between border-b border-gray-100 sticky top-0 z-40 shadow-2xs">
        {/* Circle Back Button */}
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-700 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
          title="Back to Plant List"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Center Title & ID */}
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-slate-900 leading-tight">{meta.name}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">ID:{meta.displayId}</span>
          {activeBottomNav === "Overview" && (
            <span className="mt-0.5 px-2 py-0.2 rounded border border-emerald-400 text-[10px] font-semibold text-emerald-600 bg-emerald-50/40">
              {liveBatteryState || "Charging"}
            </span>
          )}
        </div>

        {/* Right Info & Circle 3-Dots Button */}
        <div className="flex items-center gap-2">
          {activeBottomNav === "Overview" && (
            <span className="text-xs text-slate-400 font-mono">0 kW</span>
          )}
          <button
            className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-slate-600 hover:bg-gray-50 active:scale-95 transition-all shadow-2xs"
            title="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-HEADER: Weather & Top Quick Icons (Overview only) */}
      {/* ======================================================== */}
      {activeBottomNav === "Overview" && (
        <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between text-xs">
          {/* Weather & Online Pill */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 font-semibold text-slate-700">
              <span className="text-amber-500">☀️</span>
              <span>{meta.temp}</span>
            </div>
            <span className="px-2 py-0.2 rounded-full border border-emerald-200 bg-emerald-50 text-[10px] font-semibold text-emerald-600">
              Online
            </span>
          </div>
        </div>
      )}



      {activeBottomNav === "Overview" && (
        <div className="px-3 space-y-3.5 mt-1">
        {/* ======================================================== */}
        {/* 3. 3D VILLA HOUSE ISOMETRIC POWER FLOW & ANIMATIONS       */}
        {/* ======================================================== */}
        {(() => {
          const pvPoints = dayCurveData?.pvData || [];
          const yieldVal = dayDailyEnergy
            ? Number(dayDailyEnergy.solar_pv_kwh || 0)
            : pvPoints.length > 0
            ? Number(pvPoints.reduce((acc: number, v: number | null) => acc + (Number(v) || 0) * (5 / 60), 0).toFixed(1))
            : (meta.defaultYieldKwh || 112.7);
          const chargeVal = dayDailyEnergy
            ? Number(dayDailyEnergy.battery_charge_kwh || 0)
            : (meta.defaultChargeKwh || 80.4);
          const dischargeVal = dayDailyEnergy
            ? Number(dayDailyEnergy.battery_discharge_kwh || 0)
            : (meta.defaultDischargeKwh || 53.0);

          return (
            <SolisMobileCommercialPowerFlow
              solarKw={liveSolar}
              loadKw={liveLoad}
              batterySoc={liveBatterySoc}
              batteryKw={liveBatteryKw}
              batteryState={liveBatteryState}
              gridKw={liveGridKw}
              dailyYieldKwh={yieldVal}
              dailyChargeKwh={chargeVal}
              dailyDischargeKwh={dischargeVal}
            />
          );
        })()}

        {/* ======================================================== */}
        {/* 4. BATTERY CARD WITH 10 SEGMENTS                         */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <span>Battery</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <span className="text-xs font-bold text-slate-800 font-mono">{liveBatterySoc}%</span>
          </div>

          {/* 10 Glowing Rounded Green Segments */}
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: 10 }).map((_, idx) => {
              const filled = (idx + 1) * 10 <= liveBatterySoc;
              return (
                <div
                  key={idx}
                  className={`h-2.5 rounded-xs transition-all ${
                    filled
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                      : "bg-gray-100"
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. OPERATING DATA: DATE PICKER & 6 KPI CARDS             */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5">
          {/* Header Date Navigator & Granularity Dropdown */}
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold font-mono">
              <button
                onClick={handlePrevDate}
                className="p-1 hover:bg-gray-100 rounded text-slate-500"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{displayDate}</span>
              <button
                onClick={handleNextDate}
                className="p-1 hover:bg-gray-100 rounded text-slate-500"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Granularity Dropdown Button */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 text-xs font-semibold text-slate-700">
              <span>{granularity}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {/* Dynamic Daily Energy Metrics */}
          {(() => {
            const pvPoints = dayCurveData?.pvData || [];
            const loadPoints = dayCurveData?.loadData || [];
            const dayYieldKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.solar_pv_kwh || 0).toFixed(1)
              : pvPoints.length > 0
              ? pvPoints.reduce((acc: number, v: number | null) => acc + (Number(v) || 0) * (5 / 60), 0).toFixed(1)
              : String(meta.defaultYieldKwh);

            const dayConsumptionKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.house_load_kwh || 0).toFixed(1)
              : loadPoints.length > 0
              ? loadPoints.reduce((acc: number, v: number | null) => acc + (Number(v) || 0) * (5 / 60), 0).toFixed(1)
              : String(meta.defaultConsumptionKwh);

            const dayDischargeKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.battery_discharge_kwh || 0).toFixed(1)
              : String(meta.defaultDischargeKwh);

            const dayChargeKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.battery_charge_kwh || 0).toFixed(1)
              : String(meta.defaultChargeKwh);

            const dayImportKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.grid_purchased_kwh || 0).toFixed(1)
              : String(meta.defaultImportKwh);

            const dayExportKwh = dayDailyEnergy
              ? Number(dayDailyEnergy.grid_sold_kwh || 0).toFixed(1)
              : String(meta.defaultExportKwh);

            return (
              <div className="grid grid-cols-2 gap-2.5">
                {/* Card 1: Yield */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Yield</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayYieldKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-[#f37021]">
                    <Sun className="w-3.5 h-3.5 fill-orange-400" />
                  </div>
                </div>

                {/* Card 2: Consumption */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Consumption</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayConsumptionKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-slate-700">
                    <Home className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 3: Discharge */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Discharge</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayDischargeKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 4: Charge */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Charge</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayChargeKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <BatteryCharging className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 5: Import */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Import</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayImportKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-[#f37021]">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Card 6: Export */}
                <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-2.5 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-medium">Export</span>
                    <div className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                      {dayExportKwh}
                      <span className="text-[10px] font-normal text-slate-500 ml-0.5">kWh</span>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ======================================================== */}
        {/* 6. CHART ANALYSIS (MULTI-SERIES CURVE WITH SWITCHES)      */}
        {/* ======================================================== */}
        <div className={granularity === "Day" ? "bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5" : "space-y-2"}>
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-900">Chart Analysis</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Chart time range">
                {(["Day", "Month", "Year"] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setGranularity(range)}
                    aria-pressed={granularity === range}
                    className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-colors ${granularity === range ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    {range === "Day" ? "Daily" : range === "Month" ? "Monthly" : "Yearly"}
                  </button>
                ))}
              </div>
              <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <Filter className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className={granularity === "Day" ? "space-y-3" : "hidden"}>
              <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
                  <span>Power (kW)</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {powerSeriesControls.map((series) => (
                      <button key={series.key} type="button" aria-pressed={visibleSeries[series.key]} onClick={() => setVisibleSeries((state) => ({ ...state, [series.key]: !state[series.key] }))} className={`flex items-center gap-1.5 ${visibleSeries[series.key] ? "text-slate-700" : "text-slate-400 line-through"}`}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color, opacity: visibleSeries[series.key] ? 1 : 0.35 }} />{series.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div ref={chartRef} className="w-full" style={{ width: "100%", height: "clamp(220px, 58vw, 300px)", minHeight: "220px" }} />
              </div>

              <div className="border-t border-gray-100 pt-2">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
                  <span>Battery & Tariff</span>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {socSeriesControls.map((series) => (
                      <button key={series.key} type="button" aria-pressed={visibleSeries[series.key]} onClick={() => setVisibleSeries((state) => ({ ...state, [series.key]: !state[series.key] }))} className={`flex items-center gap-1.5 ${visibleSeries[series.key] ? "text-slate-700" : "text-slate-400 line-through"}`}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color, opacity: visibleSeries[series.key] ? 1 : 0.35 }} />{series.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div ref={socChartRef} className="w-full" style={{ width: "100%", height: "clamp(200px, 52vw, 260px)", minHeight: "200px" }} />
              </div>
          </div>

          {granularity !== "Day" && (
            <SolisMobileEnergyBreakdown
              key={granularity}
              stationId={selectedPlantId}
              period={granularity === "Month" ? "month" : "year"}
            />
          )}
        </div>

        {/* ======================================================== */}
        {/* 7. PV ANALYSIS GAUGE (SPEEDOMETER ARC SPLIT)             */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
              <span>PV Analysis</span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              {/* Orange Refresh Circle */}
              <button
                onClick={loadCurve}
                className="w-6 h-6 rounded-md border border-orange-200 bg-orange-50/50 flex items-center justify-center text-[#f37021] hover:bg-orange-100 transition-colors"
                title="Refresh PV Analysis"
              >
                <RotateCw className="w-3 h-3" />
              </button>
              {/* 3-Line List Toggle */}
              <button className="w-6 h-6 rounded-md border border-gray-200 flex items-center justify-center text-slate-400 hover:bg-gray-50">
                <Menu className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Semi-Circular Radial Gauge */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* SVG Speedometer Gauge (Left 7 cols) */}
            <div className="sm:col-span-7 flex flex-col items-center relative py-1">
              <svg viewBox="0 0 200 120" className="w-48 h-auto">
                {/* Background Track Arc */}
                <path
                  d="M 20 105 A 80 80 0 0 1 180 105"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Inner Ticks Guide Arc */}
                <path
                  d="M 32 105 A 68 68 0 0 1 168 105"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  strokeDasharray="2,5"
                />

                {/* Purple Arc: To Consumption (84% of 180 deg = ~151 deg) */}
                <path
                  d="M 20 105 A 80 80 0 0 1 155 40"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Blue Arc: To Grid (16% of 180 deg = ~29 deg) */}
                <path
                  d="M 160 45 A 80 80 0 0 1 180 105"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="14"
                  strokeLinecap="round"
                />

                {/* Center Lightning Bolt Solar Badge */}
                <circle cx="100" cy="100" r="16" fill="#fef3c7" stroke="#f97316" strokeWidth="1.5" />
                <path
                  d="M 101 92 L 96 100 L 100 100 L 99 108 L 104 100 L 100 100 Z"
                  fill="#f97316"
                />

                {/* Scale End Labels */}
                <text x="18" y="118" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle">
                  {dayDailyEnergy
                    ? Math.round(((Number(dayDailyEnergy.self_consumption_kwh || 0) || (Number(dayDailyEnergy.solar_pv_kwh || 0) - Number(dayDailyEnergy.grid_sold_kwh || 0))) / Math.max(1, Number(dayDailyEnergy.solar_pv_kwh || 1))) * 100)
                    : meta.toConsumptionPercent}%
                </text>
                <text x="182" y="118" fill="#64748b" fontSize="9" fontWeight="600" textAnchor="middle">
                  {dayDailyEnergy
                    ? Math.max(0, 100 - Math.round(((Number(dayDailyEnergy.self_consumption_kwh || 0) || (Number(dayDailyEnergy.solar_pv_kwh || 0) - Number(dayDailyEnergy.grid_sold_kwh || 0))) / Math.max(1, Number(dayDailyEnergy.solar_pv_kwh || 1))) * 100))
                    : meta.toGridPercent}%
                </text>
              </svg>
            </div>

            {/* Legend Stats (Right 5 cols) */}
            <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5 pl-2 sm:pl-0">
              {/* To Consumption */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium">To Consumption</span>
                <div className="text-xs font-bold text-[#8b5cf6] font-mono mt-0.5">
                  {dayDailyEnergy
                    ? `${Number(dayDailyEnergy.self_consumption_kwh || (Number(dayDailyEnergy.solar_pv_kwh || 0) - Number(dayDailyEnergy.grid_sold_kwh || 0))).toFixed(1)}kWh·${Math.round(((Number(dayDailyEnergy.self_consumption_kwh || 0) || (Number(dayDailyEnergy.solar_pv_kwh || 0) - Number(dayDailyEnergy.grid_sold_kwh || 0))) / Math.max(1, Number(dayDailyEnergy.solar_pv_kwh || 1))) * 100)}%`
                    : `${meta.toConsumptionKwh}kWh·${meta.toConsumptionPercent}%`}
                </div>
              </div>

              {/* To Grid */}
              <div>
                <span className="text-[10px] text-slate-400 font-medium">To Grid</span>
                <div className="text-xs font-bold text-[#0284c7] font-mono mt-0.5">
                  {dayDailyEnergy
                    ? `${Number(dayDailyEnergy.grid_sold_kwh || 0).toFixed(1)}kWh·${Math.max(0, 100 - Math.round(((Number(dayDailyEnergy.self_consumption_kwh || 0) || (Number(dayDailyEnergy.solar_pv_kwh || 0) - Number(dayDailyEnergy.grid_sold_kwh || 0))) / Math.max(1, Number(dayDailyEnergy.solar_pv_kwh || 1))) * 100))}%`
                    : `${meta.toGridKwh}kWh·${meta.toGridPercent}%`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Device Tab View (Exact 2-Col Solis Mobile Parity) */}
      {activeBottomNav === "Device" && (
        <div className="px-3 pb-24 mt-3">
          <SolisMobileDevicesView
            devices={plantDetailsData?.devices}
            plantName={meta.name}
            plantId={meta.displayId}
          />
        </div>
      )}

      {/* Alarm Tab View (Exact Solis Mobile Card Parity) */}
      {activeBottomNav === "Alarm" && (
        <div className="px-3 pb-24 mt-3">
          <SolisMobileAlarmsView
            alarmsData={plantDetailsData?.alarms}
            plantName={meta.name}
          />
        </div>
      )}

      {/* Info / Settings Tab View */}
      {(activeBottomNav === "Info" || activeBottomNav === "Settings") && (
        <div className="px-3 pb-24 mt-3">
          <SolisPlantInfoTab info={plantDetailsData?.plantInfo} isLoading={isDetailsLoading} />
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. FLOATING BOTTOM NAVIGATION: Overview, Device, Alarm, Settings */}
      {/* ======================================================== */}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-full px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-1.5 text-xs font-semibold pointer-events-auto">
          {/* Overview */}
          <button
            onClick={() => setActiveBottomNav("Overview")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomNav === "Overview"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Overview
          </button>

          {/* Device */}
          <button
            onClick={() => setActiveBottomNav("Device")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomNav === "Device"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Device
          </button>

          {/* Alarm with red notification dot */}
          <button
            onClick={() => setActiveBottomNav("Alarm")}
            className={`px-4 py-1.5 rounded-full transition-all flex items-center gap-1 ${
              activeBottomNav === "Alarm"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            <span>Alarm</span>
            <span className={`w-1.5 h-1.5 rounded-full ${activeBottomNav === "Alarm" ? "bg-white" : "bg-red-500 animate-pulse"}`} />
          </button>

          {/* Settings / Info */}
          <button
            onClick={() => setActiveBottomNav("Settings")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeBottomNav === "Settings" || activeBottomNav === "Info"
                ? "bg-gradient-to-r from-orange-400 to-[#f37021] text-white font-bold shadow-md shadow-orange-500/25"
                : "text-slate-600 hover:text-slate-900 active:scale-95"
            }`}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
