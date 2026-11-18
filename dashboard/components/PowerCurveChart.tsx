"use client";

import React, { useEffect, useRef } from "react";
import * as echarts from "echarts";
import { PowerCurvePoint } from "@/lib/types";

interface PowerCurveChartProps {
  points: PowerCurvePoint[];
  dateTitle?: string;
  loading?: boolean;
}

export default function PowerCurveChart({
  points,
  dateTitle,
  loading = false,
}: PowerCurveChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;

    if (loading) {
      chart.showLoading({ text: "Loading 5-Minute Telemetry..." });
      return;
    } else {
      chart.hideLoading();
    }

    if (!points || points.length === 0) {
      chart.clear();
      chart.setOption({
        title: {
          text: "No 5-minute curve telemetry stored for selected date",
          left: "center",
          top: "middle",
          textStyle: { color: "#94a3b8", fontSize: 13, fontWeight: "normal" },
        },
      });
      return;
    }

    const times = points.map((p) => p.time_str);
    const solarData = points.map((p) => p.solar_power_kw);
    const batteryData = points.map((p) => p.battery_power_kw);
    const gridData = points.map((p) => p.grid_power_kw);
    const loadData = points.map((p) => p.load_power_kw);
    const socData = points.map((p) => p.battery_soc);

    const option: echarts.EChartsOption = {
      title: {
        text: dateTitle ? `Daily Power & Storage Curve (${dateTitle})` : "Daily Power & Storage Curve",
        left: 0,
        textStyle: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#94a3b8" } },
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "#334155",
        textStyle: { color: "#f8fafc", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          let html = `<div class="font-bold border-b border-slate-700 pb-1 mb-1">${params[0].axisValue} (PKT)</div>`;
          params.forEach((item: any) => {
            const unit = item.seriesName === "Battery SOC" ? "%" : "kW";
            html += `<div class="flex items-center justify-between gap-4 py-0.5">
              <span class="flex items-center gap-1.5">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${item.color};"></span>
                <span>${item.seriesName}</span>
              </span>
              <span class="font-mono font-bold">${Number(item.value).toFixed(2)} ${unit}</span>
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
        data: ["Solar Power", "Battery Power", "Grid Power", "Facility Load", "Battery SOC"],
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        top: "16%",
        containLabel: true,
      },
      dataZoom: [
        {
          type: "inside",
          start: 0,
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
        boundaryGap: false,
        data: times,
        axisLine: { lineStyle: { color: "#cbd5e1" } },
        axisLabel: { color: "#64748b", fontSize: 11 },
      },
      yAxis: [
        {
          type: "value",
          name: "Power (kW)",
          nameTextStyle: { color: "#64748b", fontSize: 11 },
          splitLine: { lineStyle: { color: "#f1f5f9" } },
          axisLabel: { color: "#64748b", fontSize: 11 },
        },
        {
          type: "value",
          name: "SOC (%)",
          min: 0,
          max: 100,
          nameTextStyle: { color: "#64748b", fontSize: 11 },
          splitLine: { show: false },
          axisLabel: { color: "#64748b", fontSize: 11, formatter: "{value}%" },
        },
      ],
      series: [
        {
          name: "Solar Power",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: solarData,
          itemStyle: { color: "#f59e0b" },
          lineStyle: { width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(245, 158, 11, 0.3)" },
              { offset: 1, color: "rgba(245, 158, 11, 0.0)" },
            ]),
          },
        },
        {
          name: "Battery Power",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: batteryData,
          itemStyle: { color: "#10b981" },
          lineStyle: { width: 2 },
        },
        {
          name: "Grid Power",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: gridData,
          itemStyle: { color: "#3b82f6" },
          lineStyle: { width: 1.5 },
        },
        {
          name: "Facility Load",
          type: "line",
          smooth: true,
          showSymbol: false,
          data: loadData,
          itemStyle: { color: "#ef4444" },
          lineStyle: { width: 1.5, type: "dashed" },
        },
        {
          name: "Battery SOC",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          showSymbol: false,
          data: socData,
          itemStyle: { color: "#06b6d4" },
          lineStyle: { width: 2, type: "dotted" },
        },
      ],
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [points, dateTitle, loading]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div ref={chartRef} className="w-full h-[360px]" />
    </div>
  );
}
