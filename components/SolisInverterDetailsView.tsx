"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import * as echarts from "echarts";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Search,
  Copy,
  Check,
  Edit,
  Heart,
  Calendar,
  Download,
  Info,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Maximize2,
  Sliders,
  AlertTriangle,
  ExternalLink,
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
  dailyImportKwh: number;
  dailyExportKwh: number;
  gridLoadKw: number;
  gridConsumptionKwh: number;
  backupLoadKw: number;
  backupConsumptionKwh: number;
  dc: Array<{ name: string; voltage: number; current: number; power: number }>;
  ac: Array<{ name: string; voltage: string; current: string; freq: string }>;
}

interface SolisInverterDetailsViewProps {
  initialSn?: string;
  onBackToDevices: () => void;
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
    sn: "1053050258180112",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "Towfiq chinoy",
    plantId: "3649E0",
    dataloggerSn: "7A12580709004122",
    alarmInfo: "F01A",
    commissioningDate: "18/11/2026",
    warrantyExpiry: "10/08/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 0,
    dailyImportKwh: 28.7,
    dailyExportKwh: 0,
    gridLoadKw: 0,
    gridConsumptionKwh: 0.1,
    backupLoadKw: 7.6,
    backupConsumptionKwh: 97.8,
    dc: [
      { name: "PV1", voltage: 618.7, current: 7.6, power: 4702 },
      { name: "PV2", voltage: 456.4, current: 8.5, power: 3879 },
      { name: "PV3", voltage: 615.6, current: 8.6, power: 5294 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "--", current: "--", freq: "--" },
      { name: "L2", voltage: "0", current: "0", freq: "0" },
      { name: "L3", voltage: "0", current: "0", freq: "0" },
    ],
  },
  {
    sn: "1053050258110159",
    name: "OPL Residence",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "OPL Residence",
    plantId: "34202A",
    dataloggerSn: "5A1249020280457B",
    alarmInfo: "None",
    commissioningDate: "20/10/2026",
    warrantyExpiry: "20/10/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 36.6,
    dailyImportKwh: 22.0,
    dailyExportKwh: 39.3,
    gridLoadKw: 1.4,
    gridConsumptionKwh: 23.8,
    backupLoadKw: 1.8,
    backupConsumptionKwh: 20.6,
    dc: [
      { name: "PV1", voltage: 642.1, current: 14.2, power: 9117 },
      { name: "PV2", voltage: 639.8, current: 14.0, power: 8957 },
      { name: "PV3", voltage: 645.0, current: 14.5, power: 9352 },
      { name: "PV4", voltage: 641.5, current: 14.3, power: 9173 },
    ],
    ac: [
      { name: "L1", voltage: "235.4", current: "52.1", freq: "49.95" },
      { name: "L2", voltage: "233.7", current: "51.8", freq: "49.95" },
      { name: "L3", voltage: "232.1", current: "51.4", freq: "49.95" },
    ],
  },
  {
    sn: "1033320253150969",
    name: "Solis 15kw",
    model: "5302",
    series: "S6-GR1P15K",
    ratedPowerKw: 15,
    plantName: "P2G 15KW",
    plantId: "3212D8",
    dataloggerSn: "7A12541606D04928",
    alarmInfo: "None",
    commissioningDate: "10/04/2026",
    warrantyExpiry: "10/04/2031",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 0,
    dailyImportKwh: 0,
    dailyExportKwh: 0,
    gridLoadKw: 0,
    gridConsumptionKwh: 0,
    backupLoadKw: 0,
    backupConsumptionKwh: 0,
    dc: [
      { name: "PV1", voltage: 0, current: 0, power: 0 },
      { name: "PV2", voltage: 0, current: 0, power: 0 },
      { name: "PV3", voltage: 0, current: 0, power: 0 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "0", current: "0", freq: "0" },
      { name: "L2", voltage: "0", current: "0", freq: "0" },
      { name: "L3", voltage: "0", current: "0", freq: "0" },
    ],
  },
  {
    sn: "1053050258280019",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P25K-H",
    ratedPowerKw: 25,
    plantName: "36 Chenab",
    plantId: "34200F",
    dataloggerSn: "7A1257240AE01C5C",
    alarmInfo: "None",
    commissioningDate: "02/08/2026",
    warrantyExpiry: "02/08/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 16.2,
    dailyImportKwh: 18.0,
    dailyExportKwh: 54.5,
    gridLoadKw: 2.1,
    gridConsumptionKwh: 14.8,
    backupLoadKw: 1.2,
    backupConsumptionKwh: 10.5,
    dc: [
      { name: "PV1", voltage: 580.4, current: 11.2, power: 6500 },
      { name: "PV2", voltage: 578.1, current: 10.8, power: 6243 },
      { name: "PV3", voltage: 569.3, current: 6.1, power: 3472 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "230.1", current: "23.4", freq: "49.98" },
      { name: "L2", voltage: "231.2", current: "23.1", freq: "49.98" },
      { name: "L3", voltage: "229.8", current: "22.9", freq: "49.98" },
    ],
  },
  {
    sn: "1053050255210107",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "P2G 50KW",
    plantId: "33A18C",
    dataloggerSn: "7A1257240AE01C5D",
    alarmInfo: "F01A",
    commissioningDate: "11/05/2026",
    warrantyExpiry: "11/05/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 12.4,
    dailyImportKwh: 29.8,
    dailyExportKwh: 56.9,
    gridLoadKw: 4.5,
    gridConsumptionKwh: 24.2,
    backupLoadKw: 2.1,
    backupConsumptionKwh: 15.6,
    dc: [
      { name: "PV1", voltage: 590.2, current: 7.2, power: 4249 },
      { name: "PV2", voltage: 585.6, current: 7.1, power: 4157 },
      { name: "PV3", voltage: 588.0, current: 6.8, power: 3998 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "232.0", current: "18.2", freq: "49.91" },
      { name: "L2", voltage: "231.5", current: "17.9", freq: "49.91" },
      { name: "L3", voltage: "230.8", current: "18.0", freq: "49.91" },
    ],
  },
  {
    sn: "1031735257050184",
    name: "Inverter",
    model: "5301",
    series: "S6-EH3P20K-H",
    ratedPowerKw: 20,
    plantName: "P2G 1ST 6kw",
    plantId: "342004",
    dataloggerSn: "7A1256240B001722",
    alarmInfo: "None",
    commissioningDate: "05/09/2026",
    warrantyExpiry: "05/09/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 0,
    dailyImportKwh: 0.5,
    dailyExportKwh: 0,
    gridLoadKw: 0,
    gridConsumptionKwh: 0,
    backupLoadKw: 0,
    backupConsumptionKwh: 0,
    dc: [
      { name: "PV1", voltage: 0, current: 0, power: 0 },
      { name: "PV2", voltage: 0, current: 0, power: 0 },
      { name: "PV3", voltage: 0, current: 0, power: 0 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "0", current: "0", freq: "0" },
      { name: "L2", voltage: "0", current: "0", freq: "0" },
      { name: "L3", voltage: "0", current: "0", freq: "0" },
    ],
  },
  {
    sn: "1053050258140015",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "Menu Karachi Office",
    plantId: "32F429",
    dataloggerSn: "7A1257240AE01C5A",
    alarmInfo: "None",
    commissioningDate: "21/07/2026",
    warrantyExpiry: "21/07/2031",
    inverterVersion: "040006-140008",
    address: 1,
    firmware: "0000",
    totalPowerKw: 31.0,
    dailyImportKwh: 68.0,
    dailyExportKwh: 89.0,
    gridLoadKw: 4.3,
    gridConsumptionKwh: 34.0,
    backupLoadKw: 4.3,
    backupConsumptionKwh: 34.0,
    dc: [
      { name: "PV1", voltage: 620.0, current: 12.5, power: 7750 },
      { name: "PV2", voltage: 618.0, current: 12.3, power: 7601 },
      { name: "PV3", voltage: 622.0, current: 12.6, power: 7837 },
      { name: "PV4", voltage: 621.0, current: 12.4, power: 7700 },
    ],
    ac: [
      { name: "L1", voltage: "234.0", current: "44.1", freq: "49.93" },
      { name: "L2", voltage: "233.0", current: "43.9", freq: "49.93" },
      { name: "L3", voltage: "232.0", current: "43.8", freq: "49.93" },
    ],
  },
  {
    sn: "1033161256090193",
    name: "Inverter",
    model: "5302",
    series: "S6-GR1P18K",
    ratedPowerKw: 18,
    plantName: "P2G 20kw",
    plantId: "3212E5",
    dataloggerSn: "7A12532605C0A5DB",
    alarmInfo: "None",
    commissioningDate: "15/06/2026",
    warrantyExpiry: "15/06/2031",
    inverterVersion: "040005-120004",
    address: 1,
    firmware: "0000",
    totalPowerKw: 0,
    dailyImportKwh: 0,
    dailyExportKwh: 0,
    gridLoadKw: 0,
    gridConsumptionKwh: 0,
    backupLoadKw: 0,
    backupConsumptionKwh: 0,
    dc: [
      { name: "PV1", voltage: 0, current: 0, power: 0 },
      { name: "PV2", voltage: 0, current: 0, power: 0 },
      { name: "PV3", voltage: 0, current: 0, power: 0 },
      { name: "PV4", voltage: 0, current: 0, power: 0 },
    ],
    ac: [
      { name: "L1", voltage: "0", current: "0", freq: "0" },
      { name: "L2", voltage: "0", current: "0", freq: "0" },
      { name: "L3", voltage: "0", current: "0", freq: "0" },
    ],
  },
  {
    sn: "1053050258180057",
    name: "Inverter",
    model: "5305",
    series: "S6-EH3P50K-H",
    ratedPowerKw: 50,
    plantName: "Menu Karachi Office",
    plantId: "32F429",
    dataloggerSn: "7A1257240AE01C5A",
    alarmInfo: "None",
    commissioningDate: "21/07/2026",
    warrantyExpiry: "21/07/2031",
    inverterVersion: "040006-140008",
    address: 2,
    firmware: "0000",
    totalPowerKw: 30.2,
    dailyImportKwh: 67.2,
    dailyExportKwh: 88.9,
    gridLoadKw: 4.3,
    gridConsumptionKwh: 33.8,
    backupLoadKw: 4.3,
    backupConsumptionKwh: 33.8,
    dc: [
      { name: "PV1", voltage: 615.0, current: 12.2, power: 7503 },
      { name: "PV2", voltage: 616.0, current: 12.1, power: 7453 },
      { name: "PV3", voltage: 619.0, current: 12.4, power: 7675 },
      { name: "PV4", voltage: 617.0, current: 12.3, power: 7589 },
    ],
    ac: [
      { name: "L1", voltage: "233.0", current: "43.2", freq: "49.93" },
      { name: "L2", voltage: "232.0", current: "43.0", freq: "49.93" },
      { name: "L3", voltage: "231.0", current: "42.8", freq: "49.93" },
    ],
  },
];

export default function SolisInverterDetailsView({
  initialSn = "1053050258180112",
  onBackToDevices,
  onOpenAlarmDetail,
  onOpenOperationLog,
  onSelectPlantByName,
  onSelectBattery,
  onSelectMeter,
  onSelectDatalogger,
}: SolisInverterDetailsViewProps) {
  const [selectedSn, setSelectedSn] = useState<string>(initialSn);
  const [searchSidebar, setSearchSidebar] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year" | "Lifetime" | "User-defined">("Day");
  const [currentDateStr, setCurrentDateStr] = useState("20/11/2026");
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<"DC" | "AC" | "Output">("DC");
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Chart DOM ref
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Active inverter record
  const currentInverter = ALL_INVERTERS.find((i) => i.sn === selectedSn) || ALL_INVERTERS[0];

  // Filtered sidebar list
  const filteredInverters = ALL_INVERTERS.filter(
    (inv) =>
      inv.sn.toLowerCase().includes(searchSidebar.toLowerCase()) ||
      inv.name.toLowerCase().includes(searchSidebar.toLowerCase()) ||
      inv.plantName.toLowerCase().includes(searchSidebar.toLowerCase())
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePrevDate = () => {
    if (activeDateTab === "Day") {
      if (currentDateStr === "20/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("18/11/2026");
    } else if (activeDateTab === "Month") {
      if (currentDateStr === "11/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("09/2026");
    } else if (activeDateTab === "Year") {
      if (currentDateStr === "2026") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2024");
    }
  };

  const handleNextDate = () => {
    if (activeDateTab === "Day") {
      if (currentDateStr === "18/11/2026") setCurrentDateStr("19/11/2026");
      else if (currentDateStr === "19/11/2026") setCurrentDateStr("20/11/2026");
    } else if (activeDateTab === "Month") {
      if (currentDateStr === "09/2026") setCurrentDateStr("10/2026");
      else if (currentDateStr === "10/2026") setCurrentDateStr("11/2026");
    } else if (activeDateTab === "Year") {
      if (currentDateStr === "2024") setCurrentDateStr("2025");
      else if (currentDateStr === "2025") setCurrentDateStr("2026");
    }
  };

  const handleTabChange = (tab: "Day" | "Month" | "Year" | "Lifetime" | "User-defined") => {
    setActiveDateTab(tab);
    if (tab === "Day") setCurrentDateStr("20/11/2026");
    else if (tab === "Month") setCurrentDateStr("11/2026");
    else if (tab === "Year") setCurrentDateStr("2026");
    else if (tab === "Lifetime") setCurrentDateStr("Lifetime");
    else if (tab === "User-defined") setCurrentDateStr("2026-11-01 ~ 2026-11-20");
  };

  // Render ECharts for Inverter Chart SN (Exact SolisCloud Parity)
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.dispose();

    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    let option: echarts.EChartsOption = {};

    if (activeDateTab === "Day") {
      // Build Day curve matching screenshot:
      // PV Power rising around 07:00, reaching 16kW around 12:30, with red alarm bar from 10:50 to 15:15
      const times: string[] = [];
      const pvPower: (number | null)[] = [];
      const alarmSeries: (number | null)[] = [];

      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 10; m += 10) {
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          const t = `${hh}:${mm}`;
          times.push(t);

          const mins = h * 60 + m;
          // Day curve up to ~15:15
          if (mins <= 920) {
            let pv = 0;
            if (mins >= 420 && mins <= 920) {
              const prog = (mins - 420) / (920 - 420);
              pv = Number((Math.sin(prog * Math.PI) * 15.8 + Math.sin(mins / 8) * 0.6).toFixed(2));
              if (pv < 0) pv = 0;
            }
            pvPower.push(pv);

            // Solid Red Alarm bar active between 10:50 (mins 650) and 15:15 (mins 915)
            if (mins >= 650 && mins <= 915 && currentInverter.alarmInfo !== "None") {
              alarmSeries.push(0.5); // baseline red bar
            } else {
              alarmSeries.push(null);
            }
          } else {
            pvPower.push(null);
            alarmSeries.push(null);
          }
        }
      }

      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross", crossStyle: { color: "#f37021" } },
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 11 },
          formatter: (params: any) => {
            if (!Array.isArray(params) || params.length === 0) return "";
            let html = `<div style="font-weight: bold; margin-bottom: 4px; font-family: monospace;">${params[0].axisValue}</div>`;
            params.forEach((p) => {
              if (p.value !== null && p.value !== undefined) {
                html += `<div style="display:flex; justify-content:space-between; gap:12px;">
                  <span style="color:${p.color}; font-weight:600;">${p.seriesName}:</span>
                  <span style="font-family:monospace; font-weight:bold;">${p.seriesName === "Alarm" ? "Active (F01A)" : p.value + " kW"}</span>
                </div>`;
              }
            });
            return html;
          },
        },
        xAxis: {
          type: "category",
          data: times,
          boundaryGap: false,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10, interval: 2 },
        },
        yAxis: [
          {
            type: "value",
            name: "kW",
            nameTextStyle: { color: "#94a3b8", fontSize: 10 },
            max: 20,
            min: 0,
            interval: 4,
            splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
        ],
        series: [
          {
            name: "PV Power",
            type: "line",
            smooth: true,
            showSymbol: false,
            data: pvPower,
            lineStyle: { color: "#f37021", width: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "rgba(243, 112, 33, 0.35)" },
                { offset: 1, color: "rgba(243, 112, 33, 0.02)" },
              ]),
            },
          },
          {
            name: "Alarm",
            type: "bar",
            data: alarmSeries,
            barWidth: "100%",
            itemStyle: { color: "rgba(239, 68, 68, 0.85)" },
          },
        ],
      };
    } else if (activeDateTab === "Month") {
      // Month View: 30-Day Grouped Bar Chart matching media_1795169616127_d0e6f92a.jpg
      const days = Array.from({ length: 30 }, (_, i) => String(i + 1).padStart(2, "0"));
      const yieldData = new Array(30).fill(null);
      const backupData = new Array(30).fill(null);
      const importData = new Array(30).fill(null);
      const chargeData = new Array(30).fill(null);
      const dischargeData = new Array(30).fill(null);
      const gridLoadData = new Array(30).fill(null);

      // On day 18:
      backupData[17] = 12.0;
      importData[17] = 2.5;

      // On day 19:
      yieldData[18] = 85.0;
      backupData[18] = 105.0;
      dischargeData[18] = 22.0;

      // On day 20:
      yieldData[19] = 72.7;
      backupData[19] = 106.2;
      importData[19] = 29.0;
      chargeData[19] = 28.4;
      dischargeData[19] = 19.3;
      gridLoadData[19] = 0.4;

      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 11 },
        },
        xAxis: {
          type: "category",
          data: days,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 115,
          interval: 23,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Yield", type: "bar", data: yieldData, itemStyle: { color: "#eab308" } },
          { name: "Genset", type: "bar", data: new Array(30).fill(null), itemStyle: { color: "#f97316" } },
          { name: "Grid Load", type: "bar", data: gridLoadData, itemStyle: { color: "#6366f1" } },
          { name: "Backup Load", type: "bar", data: backupData, itemStyle: { color: "#a855f7" } },
          { name: "Import", type: "bar", data: importData, itemStyle: { color: "#06b6d4" } },
          { name: "Export", type: "bar", data: new Array(30).fill(null), itemStyle: { color: "#3b82f6" } },
          { name: "Charge", type: "bar", data: chargeData, itemStyle: { color: "#10b981" } },
          { name: "Discharge", type: "bar", data: dischargeData, itemStyle: { color: "#14b8a6" } },
          { name: "Smart", type: "bar", data: new Array(30).fill(null), itemStyle: { color: "#ec4899" } },
          { name: "AC Coupled", type: "bar", data: new Array(30).fill(null), itemStyle: { color: "#f59e0b" } },
        ],
      };
    } else if (activeDateTab === "Year") {
      // Year View: 12-Month Grouped Bar Chart matching media_1795169611671_adec931f.jpg
      const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const yieldData = new Array(12).fill(null);
      const backupData = new Array(12).fill(null);
      const importData = new Array(12).fill(null);
      const chargeData = new Array(12).fill(null);
      const dischargeData = new Array(12).fill(null);
      const gridLoadData = new Array(12).fill(null);

      // Month 11 (November)
      yieldData[10] = 157.7;
      backupData[10] = 211.2;
      importData[10] = 31.5;
      chargeData[10] = 28.4;
      dischargeData[10] = 41.3;
      gridLoadData[10] = 0.4;

      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          borderColor: "#f37021",
          borderWidth: 1,
          textStyle: { color: "#0f172a", fontSize: 11 },
        },
        xAxis: {
          type: "category",
          data: months,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "kWh",
          max: 220,
          interval: 44,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Yield", type: "bar", data: yieldData, itemStyle: { color: "#eab308" } },
          { name: "Genset", type: "bar", data: new Array(12).fill(null), itemStyle: { color: "#f97316" } },
          { name: "Grid Load", type: "bar", data: gridLoadData, itemStyle: { color: "#6366f1" } },
          { name: "Backup Load", type: "bar", data: backupData, itemStyle: { color: "#a855f7" } },
          { name: "Import", type: "bar", data: importData, itemStyle: { color: "#06b6d4" } },
          { name: "Export", type: "bar", data: new Array(12).fill(null), itemStyle: { color: "#3b82f6" } },
          { name: "Charge", type: "bar", data: chargeData, itemStyle: { color: "#10b981" } },
          { name: "Discharge", type: "bar", data: dischargeData, itemStyle: { color: "#14b8a6" } },
          { name: "Smart", type: "bar", data: new Array(12).fill(null), itemStyle: { color: "#ec4899" } },
          { name: "AC Coupled", type: "bar", data: new Array(12).fill(null), itemStyle: { color: "#f59e0b" } },
        ],
      };
    } else {
      // Lifetime / User-defined View
      const years = ["2024", "2025", "2026"];
      option = {
        animation: false,
        grid: { top: 30, left: 45, right: 25, bottom: 30 },
        tooltip: { trigger: "axis" },
        xAxis: {
          type: "category",
          data: years,
          axisLine: { lineStyle: { color: "#e2e8f0" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        yAxis: {
          type: "value",
          name: "MWh",
          max: 35,
          splitLine: { lineStyle: { color: "#f1f5f9", type: "dashed" } },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        series: [
          { name: "Yield", type: "bar", data: [0, 5.2, 26.48], itemStyle: { color: "#eab308" } },
          { name: "Backup Load", type: "bar", data: [0, 6.1, 31.2], itemStyle: { color: "#a855f7" } },
          { name: "Import", type: "bar", data: [0, 1.4, 8.4], itemStyle: { color: "#06b6d4" } },
        ],
      };
    }

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.dispose();
    };
  }, [selectedSn, currentInverter, activeDateTab, currentDateStr]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
      {/* ======================================================== */}
      {/* 1. LEFT SIDEBAR: INVERTER DETAILS LIST (Exact Screenshot) */}
      {/* ======================================================== */}
      <div className="w-full lg:w-64 bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 flex flex-col shrink-0">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
          Inverter Details
        </h3>

        {/* Search Input */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search Nam..."
            value={searchSidebar}
            onChange={(e) => setSearchSidebar(e.target.value)}
            className="w-full pl-2.5 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-400"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Scrollable Inverter List */}
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
          {filteredInverters.map((inv) => {
            const isSelected = inv.sn === selectedSn;
            return (
              <div
                key={inv.sn}
                onClick={() => setSelectedSn(inv.sn)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#f37021] bg-orange-50/40 text-[#f37021] font-semibold shadow-2xs"
                    : "border-transparent bg-gray-50/60 hover:bg-gray-100/70 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{inv.plantName}</span>
                </div>
                <div className="font-mono text-[11px] opacity-80 truncate">{inv.sn}</div>
              </div>
            );
          })}
        </div>

        {/* Bottom Pagination */}
        <div className="flex items-center justify-center gap-2 pt-3 mt-2 border-t border-gray-100 text-xs text-slate-500">
          <button className="px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-slate-400">
            &lt;
          </button>
          <span className="font-mono">1/1</span>
          <button className="px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-slate-400">
            &gt;
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN INVERTER DETAILS CONTENT AREA                   */}
      {/* ======================================================== */}
      <div className="flex-1 space-y-4 w-full min-w-0">
        {/* Top Header Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDevices}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-xs font-medium text-slate-700 hover:bg-gray-50 transition-all flex items-center gap-1 active:scale-95 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Device Details</span>
            </button>

            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              Info
            </span>

            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900">Inverter</h2>
              <button
                onClick={() => alert(`Edit Inverter ${currentInverter.sn} configuration`)}
                className="text-slate-400 hover:text-[#f37021] p-1"
                title="Edit Inverter"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => window.location.reload()}
                className="text-slate-400 hover:text-slate-700 p-1"
                title="Refresh"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => alert("Added to favorites")}
                className="text-slate-400 hover:text-[#f37021] p-1"
                title="Favorite"
              >
                <Heart className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500">
            <span className="font-mono text-[11px]">
              Plant ID: <strong className="text-slate-800">{currentInverter.plantId}</strong> |{" "}
              {currentDateStr} 13:31:36 (UTC+05:00) 3Min Ago
            </span>

            {onOpenOperationLog && (
              <button
                onClick={onOpenOperationLog}
                className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-xs font-normal text-slate-700 hover:bg-gray-50 transition-all shadow-2xs active:scale-95 whitespace-nowrap"
              >
                Operation Log
              </button>
            )}
          </div>
        </div>

        {/* Card 1: Inverter Graphic & Metadata Grid */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 flex flex-col md:flex-row items-center gap-6">
          {/* Left: Graphic and SN */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50/60 border border-gray-100 w-full md:w-56 shrink-0">
            <div className="relative w-36 h-36">
              <Image
                src="/images/solis_inverter_card.jpg"
                alt="Solis Inverter"
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-mono text-xs text-slate-800">
              <span>SN: {currentInverter.sn}</span>
              <button
                onClick={() => handleCopy(currentInverter.sn)}
                className="text-slate-400 hover:text-[#f37021]"
                title="Copy SN"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Right: 4-Column Metadata Grid (Exact Screenshot Parity) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-3.5 text-xs w-full">
            <div>
              <span className="text-slate-500 text-[11px] block">Model</span>
              <span className="font-medium text-slate-900">{currentInverter.model}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Series</span>
              <span className="font-medium text-slate-900">{currentInverter.series}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Rated Power</span>
              <span className="font-medium text-slate-900">{currentInverter.ratedPowerKw}kW</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Plant</span>
              <span
                onClick={() => onSelectPlantByName && onSelectPlantByName(currentInverter.plantName)}
                className="font-medium text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{currentInverter.plantName}</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Associated Datalogger</span>
              <span
                onClick={() => onSelectDatalogger && onSelectDatalogger(currentInverter.dataloggerSn)}
                className="font-mono text-[#f37021] hover:underline cursor-pointer flex items-center gap-0.5"
                title="View Datalogger Details"
              >
                <span>{currentInverter.dataloggerSn.slice(0, 10)}...</span>
                <ChevronRightIcon className="w-3 h-3 text-[#f37021]" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Alarm Information</span>
              <span
                onClick={() => {
                  if (onOpenAlarmDetail) {
                    onOpenAlarmDetail({
                      id: 1,
                      alarmCode: currentInverter.alarmInfo || "F01A",
                      alarmName: "AC Grid Frequency Exceeded / Drop",
                      severity: "Warning",
                      deviceSn: currentInverter.sn,
                      plantName: currentInverter.plantName,
                      beginTime: "18/11/2026 14:22 (UTC+05:00)",
                      endTime: "18/11/2026 14:25 (UTC+05:00)",
                      duration: "3m 30s",
                      status: "Recovered / Resolved",
                    });
                  }
                }}
                className={`font-semibold cursor-pointer hover:underline flex items-center gap-0.5 ${
                  currentInverter.alarmInfo && currentInverter.alarmInfo !== "None"
                    ? "text-[#f37021]"
                    : "text-emerald-700"
                }`}
              >
                <span>{currentInverter.alarmInfo || "None"}</span>
                <ChevronRightIcon className="w-3 h-3" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Commissioning Date</span>
              <span className="text-slate-900 font-mono">{currentInverter.commissioningDate}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Warranty Status</span>
              <span className="text-slate-900">In Warranty</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Warranty Expiry Date</span>
              <span className="text-slate-900 font-mono">{currentInverter.warrantyExpiry}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">National Standard</span>
              <span className="text-slate-900 font-mono">IEC61727L</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">AFCI Version (Internal)</span>
              <span className="text-slate-900 font-mono">0000</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">G100 State</span>
              <span className="text-slate-900 font-mono">OFF</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Inverter Version</span>
              <span className="text-slate-900 font-mono">{currentInverter.inverterVersion}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Address</span>
              <span className="text-slate-900 font-mono">{currentInverter.address}</span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Remark</span>
              <span className="text-slate-400 font-mono flex items-center gap-1">
                <span>--</span>
                <Edit className="w-3 h-3 text-slate-300 hover:text-slate-500 cursor-pointer" />
              </span>
            </div>

            <div>
              <span className="text-slate-500 text-[11px] block">Firmware Version</span>
              <span className="text-slate-900 font-mono">{currentInverter.firmware}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Real-time Information */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Real-time Information
            </h3>
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric 1 */}
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">Total Power</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {currentInverter.totalPowerKw}kW
              </p>
            </div>

            {/* Metric 2 */}
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">Daily Import</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {currentInverter.dailyImportKwh}kWh
              </p>
            </div>

            {/* Metric 3 */}
            <div className="p-3 rounded-lg bg-gray-50/60 border border-gray-100">
              <span className="text-[11px] text-slate-500 block">Daily Export</span>
              <p className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {currentInverter.dailyExportKwh}kWh
              </p>
            </div>
          </div>

          {/* Grid Load & Backup Load split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div
              onClick={() => onSelectMeter && onSelectMeter()}
              className="p-3.5 rounded-lg bg-gray-50/60 border border-gray-100 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-all group"
              title="View Grid Meter Details"
            >
              <div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#f37021] transition-colors block">Grid Load</span>
                <span className="text-[11px] text-slate-500">
                  Load Power: <strong className="text-slate-900 font-mono">{currentInverter.gridLoadKw}kW</strong>
                </span>
              </div>
              <div className="text-right flex items-center gap-1">
                <div>
                  <span className="text-[11px] text-slate-500 block">Daily Consumption</span>
                  <span className="font-mono font-bold text-slate-900">{currentInverter.gridConsumptionKwh}kWh</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-[#f37021]" />
              </div>
            </div>

            <div
              onClick={() => onSelectBattery && onSelectBattery()}
              className="p-3.5 rounded-lg bg-gray-50/60 border border-gray-100 flex items-center justify-between cursor-pointer hover:border-orange-300 transition-all group"
              title="View Battery Details"
            >
              <div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#f37021] transition-colors block">Backup Load / Battery</span>
                <span className="text-[11px] text-slate-500">
                  Load Power: <strong className="text-slate-900 font-mono">{currentInverter.backupLoadKw}kW</strong>
                </span>
              </div>
              <div className="text-right flex items-center gap-1">
                <div>
                  <span className="text-[11px] text-slate-500 block">Daily Consumption</span>
                  <span className="font-mono font-bold text-slate-900">{currentInverter.backupConsumptionKwh}kWh</span>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-slate-400 group-hover:text-[#f37021]" />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: DC & AC Telemetry Tables */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          {/* DC Table */}
          <div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-gray-100 text-[11px]">
                  <th className="py-2 px-3 font-normal">DC</th>
                  <th className="py-2 px-3 font-normal">Voltage (V)</th>
                  <th className="py-2 px-3 font-normal">Current (A)</th>
                  <th className="py-2 px-3 font-normal">Power (W)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-slate-800">
                {currentInverter.dc.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50/60">
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
          <div className="pt-2 border-t border-gray-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-gray-100 text-[11px]">
                  <th className="py-2 px-3 font-normal">AC</th>
                  <th className="py-2 px-3 font-normal">Voltage (V)</th>
                  <th className="py-2 px-3 font-normal">Current (A)</th>
                  <th className="py-2 px-3 font-normal">Frequency (Hz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono text-slate-800">
                {currentInverter.ac.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50/60">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-700">{row.name}</td>
                    <td className="py-2.5 px-3">{row.voltage}</td>
                    <td className="py-2.5 px-3">{row.current}</td>
                    <td className="py-2.5 px-3">{row.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card 4: Inverter Chart SN (Exact SolisCloud Multi-Timeframe Parity) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5 space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800">
              Inverter Chart <span className="font-mono text-slate-500 font-normal">SN: {currentInverter.sn}</span>
            </h3>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Date arrows */}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
                <button
                  onClick={handlePrevDate}
                  className="p-0.5 hover:text-[#f37021] text-slate-400"
                  title="Previous Date"
                >
                  &lt;
                </button>
                <span className="font-mono text-slate-800 text-[11px] px-1 font-semibold">{currentDateStr}</span>
                <button
                  onClick={handleNextDate}
                  className="p-0.5 hover:text-[#f37021] text-slate-400"
                  title="Next Date"
                >
                  &gt;
                </button>
              </div>

              {/* Time Span Tabs */}
              <div className="flex items-center gap-1">
                {(["Day", "Month", "Year", "Lifetime", "User-defined"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      activeDateTab === tab
                        ? "bg-orange-50 text-[#f37021] font-bold border border-orange-300 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Download Tray */}
              <button
                onClick={() => alert("Exporting Inverter Chart CSV")}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-slate-500"
                title="Download Data"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Conditional Layout: Day has Left Parameter Selector; Month/Year/Lifetime has Full-Width Top Metric Cards + Legend */}
          {activeDateTab !== "Day" ? (
            <div className="space-y-4">
              {/* Top 5-Column Metric Summary Row (Exact Screenshot media_1795169611671_adec931f.jpg Parity) */}
              {(() => {
                const labelPrefix = activeDateTab === "Year" ? "Annual" : activeDateTab === "Month" ? "Monthly" : "Lifetime";
                const metric = currentInverter.sn === "1053050258180112"
                  ? {
                      pvKwh: 157.7,
                      pvToConsumptionKwh: 157.7,
                      pvToConsumptionPct: 100,
                      pvToGridKwh: 0,
                      pvToGridPct: 0,
                      yieldKwh: 157.7,
                      importKwh: 31.5,
                      chargeKwh: 28.4,
                      dischargeKwh: 41.3,
                      gridLoadKwh: 0.4,
                      backupLoadKwh: 211.2,
                      gensetKwh: 0,
                      smartLoadKwh: 0,
                      acCoupledKwh: 0,
                    }
                  : {
                      pvKwh: (currentInverter.ratedPowerKw * 3.15).toFixed(1),
                      pvToConsumptionKwh: (currentInverter.ratedPowerKw * 2.8).toFixed(1),
                      pvToConsumptionPct: 88,
                      pvToGridKwh: (currentInverter.ratedPowerKw * 0.35).toFixed(1),
                      pvToGridPct: 12,
                      yieldKwh: (currentInverter.ratedPowerKw * 3.15).toFixed(1),
                      importKwh: currentInverter.dailyImportKwh,
                      chargeKwh: (currentInverter.backupConsumptionKwh * 0.8).toFixed(1),
                      dischargeKwh: (currentInverter.backupConsumptionKwh * 0.7).toFixed(1),
                      gridLoadKwh: currentInverter.gridConsumptionKwh,
                      backupLoadKwh: currentInverter.backupConsumptionKwh,
                      gensetKwh: 0,
                      smartLoadKwh: 0,
                      acCoupledKwh: 0,
                    };

                return (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-[#fafbfc] p-3.5 sm:p-4 rounded-xl border border-gray-100">
                    {/* 1. Purple Circle Badge & PV to Consumption/Grid */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full border-2 border-purple-500 flex flex-col items-center justify-center bg-white shadow-2xs shrink-0">
                        <span className="text-[11px] font-bold text-slate-800 font-mono leading-none">
                          {metric.pvKwh}kWh
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold uppercase mt-0.5">PV</span>
                      </div>
                      <div className="flex flex-col justify-center space-y-1 text-xs">
                        <div className="border-l-2 border-purple-500 pl-2">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {metric.pvToConsumptionKwh} kWh({metric.pvToConsumptionPct}%)
                          </span>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            {labelPrefix} PV to Consumption
                          </span>
                        </div>
                        <div className="border-l-2 border-slate-300 pl-2">
                          <span className="font-mono font-bold text-slate-800 text-[11px]">
                            {metric.pvToGridKwh} kWh({metric.pvToGridPct}%)
                          </span>
                          <span className="text-[10px] text-slate-400 block leading-tight">
                            {labelPrefix} PV to Grid
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Yield & Import */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.yieldKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Yield</span>
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.importKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Import</span>
                      </div>
                    </div>

                    {/* 3. Charge & Discharge */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.chargeKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Charge</span>
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.dischargeKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Discharge</span>
                      </div>
                    </div>

                    {/* 4. Grid Load Consumption & Backup Load */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.gridLoadKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Grid Load Consumption</span>
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {metric.backupLoadKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">{labelPrefix} Backup Load</span>
                      </div>
                    </div>

                    {/* 5. Genset, Smart Load, AC Coupled */}
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">
                          {metric.gensetKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">Genset</span>
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">
                          {metric.smartLoadKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">Smart Load</span>
                      </div>
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-[11px] sm:text-xs">
                          {metric.acCoupledKwh} kWh
                        </span>
                        <span className="text-[10px] text-slate-500 block">AC Coupled</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 10-Item Legend Bar (Exact SolisCloud Parity) */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    <span>Yield</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                    <span>Genset</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                    <span>Grid Load</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" />
                    <span>Backup Load</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" />
                    <span>Import</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
                    <span>Export</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                    <span>Charge</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#14b8a6]" />
                    <span>Discharge</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" />
                    <span>Smart</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span>AC Coupled</span>
                  </div>
                </div>

                <button
                  onClick={() => alert("Refreshed chart data")}
                  className="p-1 hover:text-[#f37021] text-slate-400"
                  title="Refresh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Full-width Bar Chart */}
              <div ref={chartRef} className="w-full h-72 sm:h-80" />
            </div>
          ) : (
            /* Day View: Left Parameter Selector + Right Interactive ECharts (Exact media_1795169618479_f19d646f.jpg) */
            <div className="flex flex-col lg:flex-row gap-4 items-start">
              {/* Left Parameter Panel */}
              <div className="w-full lg:w-56 p-3 rounded-xl bg-gray-50/60 border border-gray-100 text-xs shrink-0 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Parameters(1)</span>
                  <div className="flex items-center gap-1">
                    <button className="text-slate-400 hover:text-[#f37021] p-0.5">+</button>
                    <button
                      onClick={() => alert("Refreshed parameters")}
                      className="text-slate-400 hover:text-[#f37021] p-0.5"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Recommended Analysis Tabs */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 block uppercase">Recommended Analysis</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setActiveAnalysisTab("DC")}
                      className={`py-1 px-1.5 rounded text-[11px] border font-medium ${
                        activeAnalysisTab === "DC"
                          ? "bg-white border-[#f37021] text-[#f37021]"
                          : "bg-white border-gray-200 text-slate-600"
                      }`}
                    >
                      DC Analysis
                    </button>
                    <button
                      onClick={() => setActiveAnalysisTab("AC")}
                      className={`py-1 px-1.5 rounded text-[11px] border font-medium ${
                        activeAnalysisTab === "AC"
                          ? "bg-white border-[#f37021] text-[#f37021]"
                          : "bg-white border-gray-200 text-slate-600"
                      }`}
                    >
                      AC Analysis
                    </button>
                  </div>
                  <button
                    onClick={() => setActiveAnalysisTab("Output")}
                    className={`w-full py-1 px-1.5 rounded text-[11px] border font-medium ${
                      activeAnalysisTab === "Output"
                        ? "bg-white border-[#f37021] text-[#f37021]"
                        : "bg-white border-gray-200 text-slate-600"
                    }`}
                  >
                    Output Analysis
                  </button>
                </div>

                {/* Tree of metrics */}
                <div className="space-y-2 pt-2 border-t border-gray-200/60 text-[11px]">
                  <div
                    className="flex items-center gap-1 text-slate-800 font-semibold cursor-pointer"
                    onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                  >
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isTreeExpanded ? "" : "-rotate-90"}`}
                    />
                    <span>Inverter</span>
                  </div>

                  {isTreeExpanded && (
                    <div className="pl-4 space-y-1.5 text-slate-600">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-700 block">DC Voltage</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="accent-[#f37021] w-3 h-3" />
                          <span>DC Voltage PV1</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="accent-[#f37021] w-3 h-3" />
                          <span>DC Voltage PV2</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="accent-[#f37021] w-3 h-3" />
                          <span>DC Voltage PV3</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" defaultChecked className="accent-[#f37021] w-3 h-3" />
                          <span>DC Voltage PV4</span>
                        </label>
                      </div>

                      <div className="space-y-1 pt-1.5 border-t border-gray-200/40">
                        <span className="font-medium text-slate-700 block">DC Current</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" className="accent-[#f37021] w-3 h-3" />
                          <span>DC Current PV1</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Chart Area */}
              <div className="flex-1 w-full min-w-0">
                {/* Legend matching screenshot */}
                <div className="flex items-center gap-4 text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f37021]" />
                    <span className="text-slate-700 font-medium">PV Power</span>
                  </div>

                  {currentInverter.alarmInfo !== "None" && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span className="text-slate-700 font-medium">Alarm</span>
                    </div>
                  )}
                </div>

                {/* Chart Canvas */}
                <div ref={chartRef} className="w-full h-72 sm:h-80" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
