"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  RotateCw,
  Search,
  Copy,
  Check,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings,
  Heart,
  Sliders,
} from "lucide-react";

interface InverterRecord {
  sn: string;
  name: string;
  model: string;
  series: string;
  ratedPowerKw: number;
  plantName: string;
  plantId: string;
  dataloggerSn: string;
  alarmInfo?: string;
  commissioningDate: string;
  warrantyExpiry: string;
  inverterVersion: string;
  address: number | string;
  firmware: string;
  totalPowerKw: number;
  dailyYieldKwh: number;
  dailyFullLoadHours: number;
  internalTempC: number;
  batterySoc: number;
  batteryPowerKw: number;
  batteryDailyChargeKwh: number;
  batteryDailyDischargeKwh: number;
  dc: Array<{ name: string; voltage: number; current: number; power: number }>;
  ac: Array<{ name: string; voltage: string; current: string; freq: string }>;
}

interface SolisInverterDetailsViewProps {
  initialSn?: string;
  onBackToDevices?: () => void;
  onOpenAlarmDetail?: (alarm: any) => void;
  onOpenOperationLog?: () => void;
  onSelectPlantByName?: (plantName: string) => void;
  onSelectBattery?: () => void;
  onSelectMeter?: () => void;
  onSelectDatalogger?: (sn: string) => void;
}

// 9 Solis Inverters across the plants
const ALL_INVERTERS: InverterRecord[] = [
  {
    sn: "1053010259280019",
    name: "Inverter",
    model: "5301",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "36 Chenab",
    plantId: "3420DF",
    dataloggerSn: "7A12592600213122",
    alarmInfo: "No Alarm",
    commissioningDate: "02/09/2026",
    warrantyExpiry: "01/09/2031",
    inverterVersion: "040007-350008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 7.1,
    dailyYieldKwh: 15,
    dailyFullLoadHours: 0.5,
    internalTempC: 34.2,
    batterySoc: 85,
    batteryPowerKw: 6.3,
    batteryDailyChargeKwh: 10.7,
    batteryDailyDischargeKwh: 6.5,
    dc: [
      { name: "PV1", voltage: 549.8, current: 3.7, power: 2034 },
      { name: "PV2", voltage: 507.5, current: 3.7, power: 1878 },
      { name: "PV3", voltage: 683.2, current: 4.8, power: 3279 },
    ],
    ac: [
      { name: "L1", voltage: "--", current: "--", freq: "--" },
      { name: "L2", voltage: "238.6", current: "1.4", freq: "49.81" },
      { name: "L3", voltage: "231", current: "0.9", freq: "49.81" },
    ],
  },
  {
    sn: "1053050258180112",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "Towfiq chinoy",
    plantId: "3649E0",
    dataloggerSn: "7A12580709004122",
    alarmInfo: "No Alarm",
    commissioningDate: "18/11/2026",
    warrantyExpiry: "10/08/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 14.8,
    dailyYieldKwh: 45.2,
    dailyFullLoadHours: 1.8,
    internalTempC: 36.5,
    batterySoc: 92,
    batteryPowerKw: 8.2,
    batteryDailyChargeKwh: 28.4,
    batteryDailyDischargeKwh: 12.1,
    dc: [
      { name: "PV1", voltage: 618.7, current: 7.6, power: 4702 },
      { name: "PV2", voltage: 456.4, current: 8.5, power: 3879 },
      { name: "PV3", voltage: 615.6, current: 8.6, power: 5294 },
    ],
    ac: [
      { name: "L1", voltage: "235.1", current: "2.1", freq: "49.95" },
      { name: "L2", voltage: "236.4", current: "2.0", freq: "49.95" },
      { name: "L3", voltage: "234.8", current: "2.2", freq: "49.95" },
    ],
  },
  {
    sn: "1053050255210107",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "P2G 50KW",
    plantId: "3212F1",
    dataloggerSn: "7A12551308F022F8",
    alarmInfo: "No Alarm",
    commissioningDate: "16/08/2025",
    warrantyExpiry: "16/08/2030",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 22.4,
    dailyYieldKwh: 68.3,
    dailyFullLoadHours: 2.4,
    internalTempC: 38.1,
    batterySoc: 78,
    batteryPowerKw: 5.1,
    batteryDailyChargeKwh: 34.2,
    batteryDailyDischargeKwh: 18.0,
    dc: [
      { name: "PV1", voltage: 590.2, current: 9.8, power: 5784 },
      { name: "PV2", voltage: 585.1, current: 9.5, power: 5558 },
      { name: "PV3", voltage: 602.4, current: 10.1, power: 6084 },
    ],
    ac: [
      { name: "L1", voltage: "232.0", current: "3.2", freq: "50.01" },
      { name: "L2", voltage: "233.1", current: "3.1", freq: "50.01" },
      { name: "L3", voltage: "231.8", current: "3.3", freq: "50.01" },
    ],
  },
  {
    sn: "1053050257010194",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "OPL Residence",
    plantId: "3189A4",
    dataloggerSn: "7A12570104A12903",
    alarmInfo: "No Alarm",
    commissioningDate: "05/10/2025",
    warrantyExpiry: "05/10/2030",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 11.2,
    dailyYieldKwh: 38.7,
    dailyFullLoadHours: 1.4,
    internalTempC: 33.9,
    batterySoc: 90,
    batteryPowerKw: 4.5,
    batteryDailyChargeKwh: 19.8,
    batteryDailyDischargeKwh: 10.2,
    dc: [
      { name: "PV1", voltage: 530.1, current: 6.2, power: 3287 },
      { name: "PV2", voltage: 525.4, current: 6.1, power: 3205 },
      { name: "PV3", voltage: 540.0, current: 6.5, power: 3510 },
    ],
    ac: [
      { name: "L1", voltage: "230.5", current: "1.8", freq: "49.98" },
      { name: "L2", voltage: "231.2", current: "1.9", freq: "49.98" },
      { name: "L3", voltage: "229.8", current: "1.7", freq: "49.98" },
    ],
  },
  {
    sn: "1053050258140015",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "Solis 15kw",
    plantId: "3318C2",
    dataloggerSn: "7A12581400921834",
    alarmInfo: "No Alarm",
    commissioningDate: "20/10/2025",
    warrantyExpiry: "20/10/2030",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 18.5,
    dailyYieldKwh: 52.1,
    dailyFullLoadHours: 2.1,
    internalTempC: 35.7,
    batterySoc: 70,
    batteryPowerKw: 7.2,
    batteryDailyChargeKwh: 24.5,
    batteryDailyDischargeKwh: 15.3,
    dc: [
      { name: "PV1", voltage: 560.4, current: 8.2, power: 4595 },
      { name: "PV2", voltage: 555.0, current: 8.1, power: 4495 },
      { name: "PV3", voltage: 572.1, current: 8.5, power: 4862 },
    ],
    ac: [
      { name: "L1", voltage: "234.2", current: "2.8", freq: "49.92" },
      { name: "L2", voltage: "235.0", current: "2.7", freq: "49.92" },
      { name: "L3", voltage: "233.9", current: "2.9", freq: "49.92" },
    ],
  },
  {
    sn: "1053161254090143",
    name: "Inverter",
    model: "5316",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "P2G 10KW",
    plantId: "3104B8",
    dataloggerSn: "7A12540900192843",
    alarmInfo: "No Alarm",
    commissioningDate: "12/07/2025",
    warrantyExpiry: "12/07/2030",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 9.8,
    dailyYieldKwh: 31.4,
    dailyFullLoadHours: 1.6,
    internalTempC: 32.8,
    batterySoc: 95,
    batteryPowerKw: 3.8,
    batteryDailyChargeKwh: 16.2,
    batteryDailyDischargeKwh: 8.4,
    dc: [
      { name: "PV1", voltage: 510.3, current: 5.4, power: 2755 },
      { name: "PV2", voltage: 505.8, current: 5.3, power: 2680 },
      { name: "PV3", voltage: 520.1, current: 5.7, power: 2964 },
    ],
    ac: [
      { name: "L1", voltage: "231.0", current: "1.5", freq: "49.96" },
      { name: "L2", voltage: "232.1", current: "1.6", freq: "49.96" },
      { name: "L3", voltage: "230.5", current: "1.4", freq: "49.96" },
    ],
  },
  {
    sn: "1053050258180057",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "36 Chenab",
    plantId: "3420DF",
    dataloggerSn: "7A12581800456123",
    alarmInfo: "No Alarm",
    commissioningDate: "15/11/2026",
    warrantyExpiry: "15/11/2031",
    inverterVersion: "040006-140008",
    address: 2,
    firmware: "0000",
    totalPowerKw: 16.2,
    dailyYieldKwh: 48.9,
    dailyFullLoadHours: 1.9,
    internalTempC: 35.1,
    batterySoc: 88,
    batteryPowerKw: 6.8,
    batteryDailyChargeKwh: 26.1,
    batteryDailyDischargeKwh: 11.5,
    dc: [
      { name: "PV1", voltage: 580.4, current: 7.8, power: 4527 },
      { name: "PV2", voltage: 575.0, current: 7.7, power: 4427 },
      { name: "PV3", voltage: 592.1, current: 8.1, power: 4796 },
    ],
    ac: [
      { name: "L1", voltage: "233.4", current: "2.4", freq: "49.94" },
      { name: "L2", voltage: "234.5", current: "2.5", freq: "49.94" },
      { name: "L3", voltage: "232.8", current: "2.3", freq: "49.94" },
    ],
  },
];

// Inverter parameters list matching SolisCloud screenshot 2
interface InverterParamDef {
  key: string;
  name: string;
  category: "DC Voltage" | "DC Current" | "AC Voltage" | "AC Current" | "Power";
  unit: string;
  color: string;
  yAxisIndex: number; // 0: kW/A (0-15), 1: V (0-760)
  defaultChecked: boolean;
}

const INVERTER_PARAMETERS: InverterParamDef[] = [
  { key: "dcV1", name: "DC Voltage PV1", category: "DC Voltage", unit: "V", color: "#f59e0b", yAxisIndex: 1, defaultChecked: true },
  { key: "dcV2", name: "DC Voltage PV2", category: "DC Voltage", unit: "V", color: "#0d9488", yAxisIndex: 1, defaultChecked: true },
  { key: "dcV3", name: "DC Voltage PV3", category: "DC Voltage", unit: "V", color: "#ea580c", yAxisIndex: 1, defaultChecked: true },
  { key: "dcI1", name: "DC Current PV1", category: "DC Current", unit: "A", color: "#10b981", yAxisIndex: 0, defaultChecked: true },
  { key: "dcI2", name: "DC Current PV2", category: "DC Current", unit: "A", color: "#06b6d4", yAxisIndex: 0, defaultChecked: true },
  { key: "dcI3", name: "DC Current PV3", category: "DC Current", unit: "A", color: "#3b82f6", yAxisIndex: 0, defaultChecked: false },
  { key: "acV1", name: "AC Voltage L1", category: "AC Voltage", unit: "V", color: "#8b5cf6", yAxisIndex: 1, defaultChecked: false },
  { key: "acV2", name: "AC Voltage L2", category: "AC Voltage", unit: "V", color: "#ec4899", yAxisIndex: 1, defaultChecked: false },
  { key: "acV3", name: "AC Voltage L3", category: "AC Voltage", unit: "V", color: "#a855f7", yAxisIndex: 1, defaultChecked: false },
  { key: "acI1", name: "AC Current L1", category: "AC Current", unit: "A", color: "#6366f1", yAxisIndex: 0, defaultChecked: false },
  { key: "acI2", name: "AC Current L2", category: "AC Current", unit: "A", color: "#14b8a6", yAxisIndex: 0, defaultChecked: false },
  { key: "acI3", name: "AC Current L3", category: "AC Current", unit: "A", color: "#f97316", yAxisIndex: 0, defaultChecked: false },
  { key: "pvPower", name: "PV Power", category: "Power", unit: "kW", color: "#16a34a", yAxisIndex: 0, defaultChecked: true },
];

export default function SolisInverterDetailsView({
  initialSn = "1053010259280019",
  onBackToDevices,
  onOpenAlarmDetail,
  onOpenOperationLog,
  onSelectPlantByName,
  onSelectBattery,
  onSelectMeter,
  onSelectDatalogger,
}: SolisInverterDetailsViewProps) {
  const [selectedSn, setSelectedSn] = useState(initialSn);
  const [copied, setCopied] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year" | "Lifetime" | "User-defined">("Day");
  const [currentDateStr, setCurrentDateStr] = useState("21/11/2026");
  const [searchSidebar, setSearchSidebar] = useState("");
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"DC" | "AC" | "Output">("DC");
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Selected parameters map
  const [selectedParams, setSelectedParams] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    INVERTER_PARAMETERS.forEach((p) => {
      init[p.key] = p.defaultChecked;
    });
    return init;
  });

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const currentInverter = ALL_INVERTERS.find((inv) => inv.sn === selectedSn) || ALL_INVERTERS[0];

  const filteredInverters = useMemo(() => {
    return ALL_INVERTERS.filter(
      (inv) =>
        inv.sn.toLowerCase().includes(searchSidebar.toLowerCase()) ||
        inv.name.toLowerCase().includes(searchSidebar.toLowerCase()) ||
        inv.plantName.toLowerCase().includes(searchSidebar.toLowerCase())
    );
  }, [searchSidebar]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleParam = (key: string) => {
    setSelectedParams((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeParamCount = useMemo(() => {
    return Object.values(selectedParams).filter(Boolean).length;
  }, [selectedParams]);

  // Set preset recommended analyses
  const applyPreset = (type: "DC" | "AC" | "Output") => {
    setActiveAnalysisTab(type);
    const updated: Record<string, boolean> = {};
    INVERTER_PARAMETERS.forEach((p) => {
      if (type === "DC") {
        updated[p.key] = p.category === "DC Voltage" || p.category === "DC Current";
      } else if (type === "AC") {
        updated[p.key] = p.category === "AC Voltage" || p.category === "AC Current";
      } else {
        updated[p.key] = p.category === "Power";
      }
    });
    setSelectedParams(updated);
  };

  // Generate 24-hour Day curves for all inverter parameters
  const chartData = useMemo(() => {
    const times: string[] = [];
    const dcV1: number[] = [];
    const dcV2: number[] = [];
    const dcV3: number[] = [];
    const dcI1: number[] = [];
    const dcI2: number[] = [];
    const dcI3: number[] = [];
    const acV1: number[] = [];
    const acV2: number[] = [];
    const acV3: number[] = [];
    const acI1: number[] = [];
    const acI2: number[] = [];
    const acI3: number[] = [];
    const pvPower: number[] = [];

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 5) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        times.push(`${hh}:${mm}`);

        const totalMinutes = h * 60 + m;

        // Current time ~10:15
        if (totalMinutes <= 615) {
          if (totalMinutes >= 360) {
            // Sun rising from 06:00
            const prog = (totalMinutes - 360) / 255;
            const vBase = 520 + Math.sin(prog * Math.PI) * 160;
            dcV1.push(Number((vBase + Math.sin(totalMinutes / 8) * 8).toFixed(1)));
            dcV2.push(Number((vBase - 35 + Math.sin(totalMinutes / 7) * 7).toFixed(1)));
            dcV3.push(Number((vBase + 45 + Math.sin(totalMinutes / 6) * 10).toFixed(1)));

            const current = Math.abs(Math.sin(prog * Math.PI)) * 4.8 + (Math.sin(totalMinutes / 12) * 0.4);
            dcI1.push(Number(Math.max(0, current).toFixed(1)));
            dcI2.push(Number(Math.max(0, current * 0.95).toFixed(1)));
            dcI3.push(Number(Math.max(0, current * 1.15).toFixed(1)));

            pvPower.push(Number((((vBase * current * 3) / 1000)).toFixed(2)));

            acV1.push(230.5);
            acV2.push(238.6);
            acV3.push(231.0);
            acI1.push(Number((current * 0.4).toFixed(1)));
            acI2.push(Number((current * 0.38).toFixed(1)));
            acI3.push(Number((current * 0.42).toFixed(1)));
          } else {
            // Night
            dcV1.push(0);
            dcV2.push(0);
            dcV3.push(0);
            dcI1.push(0);
            dcI2.push(0);
            dcI3.push(0);
            acV1.push(0);
            acV2.push(230);
            acV3.push(230);
            acI1.push(0);
            acI2.push(0);
            acI3.push(0);
            pvPower.push(0);
          }
        } else {
          // Future times null
          dcV1.push(null as any);
          dcV2.push(null as any);
          dcV3.push(null as any);
          dcI1.push(null as any);
          dcI2.push(null as any);
          dcI3.push(null as any);
          acV1.push(null as any);
          acV2.push(null as any);
          acV3.push(null as any);
          acI1.push(null as any);
          acI2.push(null as any);
          acI3.push(null as any);
          pvPower.push(null as any);
        }
      }
    }

    return {
      times,
      dcV1,
      dcV2,
      dcV3,
      dcI1,
      dcI2,
      dcI3,
      acV1,
      acV2,
      acV3,
      acI1,
      acI2,
      acI3,
      pvPower,
    };
  }, []);

  // Update ECharts
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    const series: echarts.SeriesOption[] = [];

    INVERTER_PARAMETERS.forEach((p) => {
      if (!selectedParams[p.key]) return;

      const data = (chartData as any)[p.key] || [];

      if (p.key === "dcV1") {
        series.push({
          name: p.name,
          type: "line",
          yAxisIndex: p.yAxisIndex,
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: p.color, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(245, 158, 11, 0.28)" },
              { offset: 1, color: "rgba(245, 158, 11, 0.02)" },
            ]),
          },
        });
      } else {
        series.push({
          name: p.name,
          type: "line",
          yAxisIndex: p.yAxisIndex,
          data: data,
          smooth: true,
          showSymbol: false,
          lineStyle: { color: p.color, width: 1.5 },
        });
      }
    });

    const option: echarts.EChartsOption = {
      animation: false,
      grid: {
        top: 40,
        left: 55,
        right: 65,
        bottom: 30,
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#f37021" } },
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f37021",
        borderWidth: 1,
        textStyle: { color: "#0f172a", fontSize: 11 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let html = `<div style="font-weight:bold; margin-bottom:4px; font-family:monospace; border-bottom:1px solid #eee; padding-bottom:2px;">${params[0].axisValue}</div>`;
          params.forEach((p) => {
            if (p.value !== null && p.value !== undefined) {
              const def = INVERTER_PARAMETERS.find((item) => item.name === p.seriesName);
              const unit = def?.unit || "";
              html += `<div style="display:flex; justify-content:space-between; gap:14px; margin-top:2px;">
                <span style="color:${p.color}; font-weight:600;">${p.seriesName}:</span>
                <span style="font-family:monospace; font-weight:bold;">${p.value} ${unit}</span>
              </div>`;
            }
          });
          return html;
        },
      },
      xAxis: {
        type: "category",
        data: chartData.times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          interval: (index) => index % 24 === 0,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "kW / A",
          position: "left",
          nameTextStyle: { color: "#94a3b8", fontSize: 10 },
          min: 0,
          max: 15,
          interval: 3,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        {
          type: "value",
          name: "V",
          position: "right",
          nameTextStyle: { color: "#ea580c", fontSize: 10 },
          min: 0,
          max: 760,
          interval: 152,
          splitLine: { show: false },
          axisLabel: { color: "#ea580c", fontSize: 10 },
        },
      ],
      series: series,
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [selectedParams, chartData]);

  return (
    <div className="flex bg-[#f5f7fa] min-h-screen text-slate-800 antialiased">
      {/* 1. Left Inverters Switcher Rail */}
      <div className="w-[140px] bg-white border-r border-slate-200/80 p-2.5 flex flex-col justify-between shrink-0">
        <div className="space-y-2">
          <div className="text-[12px] font-bold text-slate-800 px-1 py-1">
            Inverter Details
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search Name..."
              value={searchSidebar}
              onChange={(e) => setSearchSidebar(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#10b981]"
            />
            <Search className="w-3 h-3 text-slate-400 absolute left-1.5 top-1.5" />
          </div>

          {/* Inverter Items List */}
          <div className="space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto pr-0.5">
            {filteredInverters.map((inv) => {
              const isSelected = inv.sn === selectedSn;
              return (
                <button
                  key={inv.sn}
                  onClick={() => setSelectedSn(inv.sn)}
                  className={`w-full text-left p-2 rounded-xl transition-all ${isSelected
                    ? "border border-[#fca466] bg-[#fffaf5] text-[#e8600c] shadow-2xs font-semibold"
                    : "text-slate-600 hover:bg-slate-50 border border-transparent font-normal"
                    }`}
                >
                  <div className="text-[11px] truncate">{inv.plantName}</div>
                  <div className="text-[9px] font-mono opacity-70 truncate">{inv.sn}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 border border-slate-200 rounded-lg p-1 text-xs text-slate-600 bg-white shadow-2xs">
          <button className="text-slate-400 hover:text-slate-700 px-1">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] font-medium">1 / 1</span>
          <button className="text-slate-400 hover:text-slate-700 px-1">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Inverter Content */}
      <div className="flex-1 p-4 lg:p-6 space-y-4 max-w-[1500px] min-w-0">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              Online
            </span>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Inverter</span>
              <button
                onClick={() => alert("Refreshed Inverter Telemetry")}
                className="text-slate-400 hover:text-[#10b981]"
                title="Refresh"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <Heart className="w-4 h-4 text-slate-400 hover:text-red-500 cursor-pointer" />
            </h1>
            <span className="text-xs text-slate-400 font-mono">
              Plant ID: {currentInverter.plantId} | {currentDateStr} 10:11:18 (UTC+05:00) 4Min Ago
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Inverter Remote Control & Parameter Setting")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Inverter Setting</span>
            </button>
          </div>
        </div>

        {/* Card 1: Inverter Graphic & Metadata Specifications */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50/70 border border-slate-100 w-full md:w-56 shrink-0">
            <div className="relative w-36 h-44">
              <Image
                src="/images/solis_inverter_card.jpg"
                alt="Solis Inverter"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-700">
              <span>SN: {currentInverter.sn}</span>
              <button
                onClick={() => handleCopy(currentInverter.sn)}
                className="text-slate-400 hover:text-[#10b981]"
                title="Copy SN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3.5 text-xs w-full">
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Model</span>
              <span className="font-semibold text-slate-800">{currentInverter.model}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Series</span>
              <span className="font-semibold text-slate-800">{currentInverter.series}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Rated Power</span>
              <span className="font-semibold text-slate-800">{currentInverter.ratedPowerKw}kW</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Plant</span>
              <span
                onClick={() => onSelectPlantByName && onSelectPlantByName(currentInverter.plantName)}
                className="font-semibold text-[#10b981] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{currentInverter.plantName}</span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-[#10b981]" />
              </span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Associated Datalogger</span>
              <span
                onClick={() => onSelectDatalogger && onSelectDatalogger(currentInverter.dataloggerSn)}
                className="font-mono font-semibold text-[#10b981] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{currentInverter.dataloggerSn.slice(0, 10)}...</span>
                <ChevronRightIcon className="w-3.5 h-3.5 text-[#10b981]" />
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Alarm Information</span>
              <span className="font-semibold text-emerald-600">No Alarm &gt;</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Commissioning Date</span>
              <span className="font-mono text-slate-800">{currentInverter.commissioningDate}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Warranty Status</span>
              <span className="text-slate-800">In Warranty</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Warranty Expiry Date</span>
              <span className="font-mono text-slate-800">{currentInverter.warrantyExpiry}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">National Standard</span>
              <span className="font-mono text-slate-800">IEC61727L</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">AFCI Version (Internal)</span>
              <span className="font-mono text-slate-800">0000</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">G100 State</span>
              <span className="font-mono text-slate-800">OFF</span>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Inverter Version</span>
              <span className="font-mono text-slate-800">{currentInverter.inverterVersion}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Address</span>
              <span className="font-mono text-slate-800">{currentInverter.address}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Firmware Version</span>
              <span className="font-mono text-slate-800">{currentInverter.firmware}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Remark</span>
              <span className="font-mono text-slate-800">--</span>
            </div>
          </div>
        </div>

        {/* Card 2: Real-time Information (PV, Inverter, Battery) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800">Real-time Information</h2>
          </div>

          <div className="space-y-4">
            {/* PV Section */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">PV</span>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Power</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.totalPowerKw}kW</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Daily Yield</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.dailyYieldKwh}kWh</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Daily Full Load Hours</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.dailyFullLoadHours}h</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Inverter Internal Operating Ambient Temp</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.internalTempC}°C</span>
                </div>
              </div>
            </div>

            {/* Battery Section */}
            <div className="pt-3 border-t border-slate-100">
              <div
                onClick={() => onSelectBattery && onSelectBattery()}
                className="flex items-center justify-between cursor-pointer group mb-2"
              >
                <span className="text-xs font-bold text-slate-700 group-hover:text-[#10b981] transition-colors">
                  Battery
                </span>
                <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-[#10b981]" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">SOC</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.batterySoc}%</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Power</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Charging {currentInverter.batteryPowerKw}kW
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Daily Charge</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.batteryDailyChargeKwh}kWh</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Daily Discharge</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{currentInverter.batteryDailyDischargeKwh}kWh</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: DC & AC Telemetry Tables */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          {/* DC Table */}
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 text-[11px] border-b border-slate-100">
                  <th className="py-2.5 px-3 font-medium">DC</th>
                  <th className="py-2.5 px-3 font-medium">Voltage (V)</th>
                  <th className="py-2.5 px-3 font-medium">Current (A)</th>
                  <th className="py-2.5 px-3 font-medium">Power (W)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                {currentInverter.dc.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700">{row.name}</td>
                    <td className="py-2.5 px-3">{row.voltage}</td>
                    <td className="py-2.5 px-3">{row.current}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.power}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AC Table */}
          <div className="pt-2 border-t border-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 text-[11px] border-b border-slate-100">
                  <th className="py-2.5 px-3 font-medium">AC</th>
                  <th className="py-2.5 px-3 font-medium">Voltage (V)</th>
                  <th className="py-2.5 px-3 font-medium">Current (A)</th>
                  <th className="py-2.5 px-3 font-medium">Frequency (Hz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                {currentInverter.ac.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700">{row.name}</td>
                    <td className="py-2.5 px-3">{row.voltage}</td>
                    <td className="py-2.5 px-3">{row.current}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 4: Inverter Interactive Graph with Parameters Checklist */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">
              Inverter Chart <span className="font-mono text-slate-400 font-normal">SN: {currentInverter.sn}</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1 bg-white">
                <button
                  onClick={() => setCurrentDateStr("20/11/2026")}
                  className="text-slate-400 hover:text-slate-700 px-1"
                >
                  &lt;
                </button>
                <span className="font-mono text-slate-800 text-[11px] font-semibold">{currentDateStr}</span>
                <button
                  onClick={() => setCurrentDateStr("21/11/2026")}
                  className="text-slate-400 hover:text-slate-700 px-1"
                >
                  &gt;
                </button>
              </div>

              <div className="flex items-center gap-1">
                {(["Day", "Month", "Year", "Lifetime", "User-defined"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDateTab(tab)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${activeDateTab === tab
                      ? "bg-[#fffaf5] text-[#e8600c] font-bold border border-[#fca466]"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => alert("Downloading Inverter Data CSV")}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500"
                title="Download CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Graph Layout: Left Parameters Tree + Right ECharts */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Left Parameter Panel */}
            <div className="w-full lg:w-64 p-3.5 rounded-2xl bg-[#fafbfc] border border-slate-200/80 text-xs shrink-0 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800">Parameters({activeParamCount})</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const allTrue: Record<string, boolean> = {};
                      INVERTER_PARAMETERS.forEach((p) => (allTrue[p.key] = true));
                      setSelectedParams(allTrue);
                    }}
                    className="text-slate-400 hover:text-[#10b981] p-1"
                    title="Select All"
                  >
                    +
                  </button>
                  <button
                    onClick={() => applyPreset("DC")}
                    className="text-slate-400 hover:text-[#10b981] p-1"
                    title="Reset to DC"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Recommended Analysis Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Recommended Analysis
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => applyPreset("DC")}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all ${activeAnalysisTab === "DC"
                      ? "border border-[#fca466] bg-[#fffaf5] text-[#e8600c] font-semibold"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    DC Analysis
                  </button>
                  <button
                    onClick={() => applyPreset("AC")}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all ${activeAnalysisTab === "AC"
                      ? "border border-[#fca466] bg-[#fffaf5] text-[#e8600c] font-semibold"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    AC Analysis
                  </button>
                </div>
                <button
                  onClick={() => applyPreset("Output")}
                  className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-medium transition-all ${activeAnalysisTab === "Output"
                    ? "border border-[#fca466] bg-[#fffaf5] text-[#e8600c] font-semibold"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                >
                  Output Analysis
                </button>
              </div>

              {/* Inverter Tree */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-[11px]">
                <div
                  className="flex items-center justify-between text-slate-800 font-semibold cursor-pointer py-1"
                  onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                >
                  <span>Inverter</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${isTreeExpanded ? "" : "-rotate-90"}`}
                  />
                </div>

                {isTreeExpanded && (
                  <div className="space-y-3 pl-1">
                    {/* DC Voltage */}
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-600 block text-[11px]">DC Voltage</span>
                      {INVERTER_PARAMETERS.filter((p) => p.category === "DC Voltage").map((param) => (
                        <label
                          key={param.key}
                          className="flex items-center gap-2 text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedParams[param.key]}
                            onChange={() => toggleParam(param.key)}
                            className="rounded border-slate-300 text-[#10b981] focus:ring-[#f37021] accent-[#10b981] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={selectedParams[param.key] ? "font-medium text-slate-900" : "text-slate-500"}>
                            {param.name}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* DC Current */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-600 block text-[11px]">DC Current</span>
                      {INVERTER_PARAMETERS.filter((p) => p.category === "DC Current").map((param) => (
                        <label
                          key={param.key}
                          className="flex items-center gap-2 text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedParams[param.key]}
                            onChange={() => toggleParam(param.key)}
                            className="rounded border-slate-300 text-[#10b981] focus:ring-[#f37021] accent-[#10b981] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={selectedParams[param.key] ? "font-medium text-slate-900" : "text-slate-500"}>
                            {param.name}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Power */}
                    <div className="space-y-1 pt-2 border-t border-slate-100">
                      <span className="font-semibold text-slate-600 block text-[11px]">Power</span>
                      {INVERTER_PARAMETERS.filter((p) => p.category === "Power").map((param) => (
                        <label
                          key={param.key}
                          className="flex items-center gap-2 text-[11px] text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={!!selectedParams[param.key]}
                            onChange={() => toggleParam(param.key)}
                            className="rounded border-slate-300 text-[#10b981] focus:ring-[#f37021] accent-[#10b981] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className={selectedParams[param.key] ? "font-medium text-slate-900" : "text-slate-500"}>
                            {param.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Chart Area */}
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                {INVERTER_PARAMETERS.filter((p) => selectedParams[p.key]).map((p) => (
                  <div key={p.key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-700 font-medium text-[11px]">{p.name}</span>
                  </div>
                ))}
              </div>

              <div ref={chartRef} className="w-full h-80 sm:h-96" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
                                                                                                                              