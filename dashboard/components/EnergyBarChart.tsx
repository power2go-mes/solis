"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { DailyEnergyRecord } from "@/lib/types";
import { Download } from "lucide-react";

interface EnergyBarChartProps {
  records: DailyEnergyRecord[];
  title?: string;
  loading?: boolean;
}

export default function EnergyBarChart({
  records,
  title = "Daily Energy Accounting",
  loading = false,
}: EnergyBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    if (loading) {
      chart.showLoading({ text: "Loading Energy Records..." });
      return;
    } else {
      chart.hideLoading();
    }

    if (!records || records.length === 0) {
      chart.clear();
      chart.setOption({
        title: {
          text: "No energy records stored for selected range",
          left: "center",
          top: "middle",
          textStyle: { color: "#94a3b8", fontSize: 13, fontWeight: "normal" },
        },
      });
      return;
    }

    const dates = records.map((r) => r.energy_date);
    const solarPv = records.map((r) => r.solar_pv_kwh);
    const batteryCharge = records.map((r) => r.battery_charge_kwh);
    const batteryDischarge = records.map((r) => r.battery_discharge_kwh);
    const gridPurchased = records.map((r) => r.grid_purchased_kwh);
    const gridSold = records.map((r) => r.grid_sold_kwh);
    const consumption = records.map((r) => r.house_load_kwh);

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 0,
        textStyle: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#334155",
        textStyle: { color: "#f8fafc", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          let html = `<div class="font-bold border-b border-slate-700 pb-1 mb-1">${params[0].axisValue}</div>`;
          params.forEach((item: any) => {
            html += `<div class="flex items-center justify-between gap-4 py-0.5">
              <span class="flex items-center gap-1.5">
                <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background-color:${item.color};"></span>
                <span>${item.seriesName}</span>
              </span>
              <span class="font-mono font-bold">${Number(item.value).toFixed(1)} kWh</span>
            </div>`;
          });
          return html;
        },
      },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        textStyle: { color: "#475569", fontSize: 11 },
        data: [
          "Solar PV",
          "Battery Charge",
          "Battery Discharge",
          "Grid Import",
          "Grid Export",
          "Consumption",
        ],
      },
      grid: {
        left: "3%",
        right: "3%",
        bottom: "12%",
        top: "16%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "inside",
          start: Math.max(0, 100 - (30 / Math.max(dates.length, 1)) * 100),
          end: 100,
        },
        {
          type: "slider",
          bottom: 0,
          height: 18,
          borderColor: "#cbd5e1",
          fillerColor: "rgba(14, 165, 233, 0.15)",
          handleStyle: { color: "#0284c7" },
          textStyle: { color: "#64748b", fontSize: 10 },
        },
      ],
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { color: "#64748b", fontSize: 10, rotate: 30 },
      },
      yAxis: {
        type: "value",
        name: "Energy (kWh)",
        nameTextStyle: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      series: [
        {
          name: "Solar PV",
          type: "bar",
          data: solarPv,
          itemStyle: { color: "#f59e0b", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Battery Charge",
          type: "bar",
          data: batteryCharge,
          itemStyle: { color: "#10b981", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Battery Discharge",
          type: "bar",
          data: batteryDischarge,
          itemStyle: { color: "#8b5cf6", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Grid Import",
          type: "bar",
          data: gridPurchased,
          itemStyle: { color: "#3b82f6", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Grid Export",
          type: "bar",
          data: gridSold,
          itemStyle: { color: "#06b6d4", borderRadius: [3, 3, 0, 0] },
        },
        {
          name: "Consumption",
          type: "bar",
          data: consumption,
          itemStyle: { color: "#ef4444", borderRadius: [3, 3, 0, 0] },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [records, title, loading]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  const exportCsv = () => {
    if (!records || records.length === 0) return;
    const headers = [
      "Date",
      "Solar PV (kWh)",
      "Battery Charge (kWh)",
      "Battery Discharge (kWh)",
      "Grid Import (kWh)",
      "Grid Export (kWh)",
      "Consumption (kWh)",
    ];
    const rows = records.map((r) => [
      r.energy_date,
      r.solar_pv_kwh,
      r.battery_charge_kwh,
      r.battery_discharge_kwh,
      r.grid_purchased_kwh,
      r.grid_sold_kwh,
      r.house_load_kwh,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_energy_${records[0].station_id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs relative">
      <div className="flex justify-end mb-2">
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
      <div ref={chartRef} className="w-full h-[380px]" />
    </div>
  );
}
