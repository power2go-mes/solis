"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { EnergyBreakdownResult } from "@/lib/types";

type Period = "month" | "year";

interface SolisMobileEnergyBreakdownProps {
  stationId: string;
  period: Period;
}

const SERIES = [
  { key: "pvData", name: "PV", color: "#FACC15" },
  { key: "importData", name: "Import", color: "#38BDF8" },
  { key: "exportData", name: "Export", color: "#2563EB" },
  { key: "chargeData", name: "Charge", color: "#10B981" },
  { key: "dischargeData", name: "Discharge", color: "#34D399" },
  { key: "consumptionData", name: "Consumption", color: "#8B5CF6" },
] as const;

function pktNow() {
  return new Date(Date.now() + 5 * 60 * 60 * 1000);
}

function initialPeriodValue(period: Period) {
  const today = pktNow().toISOString();
  return period === "month" ? today.slice(0, 7) : today.slice(0, 4);
}

export default function SolisMobileEnergyBreakdown({ stationId, period }: SolisMobileEnergyBreakdownProps) {
  const [periodValue, setPeriodValue] = useState(() => initialPeriodValue(period));
  const [response, setResponse] = useState<{
    key: string;
    data?: EnergyBreakdownResult;
    error?: boolean;
  } | null>(null);
  const requestKey = `${stationId}:${period}:${periodValue}`;
  const data = response?.key === requestKey ? response.data ?? null : null;
  const loading = response?.key !== requestKey;
  const error = response?.key === requestKey && response.error === true;
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/energy/breakdown?stationId=${encodeURIComponent(stationId)}&period=${period}&date=${periodValue}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Energy breakdown request failed");
        return response.json();
      })
      .then((result) => {
        if (!result.success || !result.data) throw new Error("Energy breakdown data missing");
        setResponse({ key: requestKey, data: result.data as EnergyBreakdownResult });
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name === "AbortError") return;
        setResponse({ key: requestKey, error: true });
      });

    return () => controller.abort();
  }, [stationId, period, periodValue, requestKey]);

  const title = period === "month" ? "Monthly Energy Breakdown" : "Annual Monthly Energy Breakdown";
  const summaryCards = useMemo(() => {
    if (!data) return [];
    const totals = data.totals;
    return [
      { label: "PV", value: totals.pv },
      { label: "Inverter", value: totals.inverter },
      { label: "AC Coupled", value: totals.acCoupled },
      { label: period === "month" ? "Monthly Grid Load Consumption" : "Annual Grid Load Consumption", value: totals.gridLoadConsumption },
      { label: period === "month" ? "Monthly Backup Load" : "Annual Backup Load", value: totals.backupLoad },
      { label: "Smart Load", value: totals.smartLoad },
    ];
  }, [data, period]);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.getInstanceByDom(chartRef.current) ?? echarts.init(chartRef.current);
    chartInstance.current = chart;

    if (!data || data.labels.length === 0) {
      chart.clear();
      return;
    }

    chart.setOption({
      animationDuration: 400,
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { show: false },
      grid: { top: 28, right: 14, bottom: 36, left: 42, containLabel: true },
      xAxis: {
        type: "category",
        data: data.labels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "#E2E8F0" } },
        axisLabel: { color: "#94A3B8", fontSize: 10, hideOverlap: true },
      },
      yAxis: {
        type: "value",
        name: "kWh",
        nameTextStyle: { color: "#94A3B8", fontSize: 10 },
        splitLine: { lineStyle: { type: "dashed", color: "#F1F5F9" } },
        axisLabel: { color: "#94A3B8", fontSize: 10 },
      },
      series: SERIES.map((series) => ({
        name: series.name,
        type: "bar" as const,
        data: data[series.key],
        barMaxWidth: period === "month" ? 8 : 14,
        barGap: "15%",
        itemStyle: { color: series.color, borderRadius: [2, 2, 0, 0] },
      })),
    }, true);
    chart.resize();
  }, [data, period]);

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const resize = () => chartInstance.current?.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    chartInstance.current?.dispose();
    chartInstance.current = null;
  }, []);

  const shiftPeriod = (amount: number) => {
    if (period === "month") {
      const [year, month] = periodValue.split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1 + amount, 1));
      setPeriodValue(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`);
      return;
    }
    setPeriodValue(String(Number(periodValue) + amount));
  };

  const atCurrentPeriod = periodValue === initialPeriodValue(period);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-2xs">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-[10px] text-slate-400">Energy values in kWh</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button type="button" aria-label={period === "month" ? "Previous month" : "Previous year"} onClick={() => shiftPeriod(-1)} className="rounded-md p-1.5 text-slate-600 hover:bg-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-16 px-1 text-center text-xs font-semibold text-slate-700">
            {period === "month" ? new Date(`${periodValue}-02T00:00:00Z`).toLocaleString("en", { month: "short", timeZone: "UTC", year: "numeric" }) : periodValue}
          </span>
          <button type="button" aria-label={period === "month" ? "Next month" : "Next year"} onClick={() => shiftPeriod(1)} disabled={atCurrentPeriod} className="rounded-md p-1.5 text-slate-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setPeriodValue(initialPeriodValue(period))} disabled={atCurrentPeriod} className="rounded-md px-2 py-1 text-[10px] font-semibold text-sky-700 disabled:opacity-40">
            Current
          </button>
        </div>
      </div>

      {data && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.label} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
              <div className="flex items-baseline gap-1">
                <span className="truncate text-lg font-bold tracking-tight text-slate-900">{card.value}</span>
                <span className="text-[10px] font-semibold text-slate-500">kWh</span>
              </div>
              <span className="mt-1 block text-[10px] leading-tight text-slate-500">{card.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-medium text-slate-700">
        {SERIES.map((series) => (
          <span key={series.name} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.color }} />
            {series.name}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto overscroll-x-contain">
        <div className="relative" style={{ width: `max(100%, ${period === "month" ? 720 : 480}px)` }}>
          <div ref={chartRef} className="h-[300px] w-full" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-xs text-slate-500">
              <RotateCw className="mr-2 h-4 w-4 animate-spin text-amber-500" /> Loading energy data…
            </div>
          )}
          {!loading && error && <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-center text-xs text-rose-600">Could not load this period&apos;s energy data.</div>}
          {!loading && !error && data?.labels.length === 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/90 text-xs text-slate-500">No energy data for this period.</div>}
        </div>
      </div>
      {period === "month" && <p className="mt-1 text-center text-[10px] text-slate-400">Swipe the chart to see all days in this month.</p>}
    </section>
  );
}
