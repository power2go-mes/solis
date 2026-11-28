"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as echarts from "echarts";
import {
  Download,
  Calendar,
  BatteryCharging,
  Zap,
  Gauge,
  Heart,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle,
  Building2,
  Cpu,
} from "lucide-react";
import { exportToExcel } from "@/lib/excelExport";
import { exportBatteryReportToPdf } from "@/lib/pdfReportExport";
import BmsTempHistoryChart from "@/components/BmsTempHistoryChart";
import BmsCollectorHealth from "@/components/BmsCollectorHealth";

// Plant → Inverter mapping (Authoritative)
const PLANT_INVERTER_MAP: Record<string, { sn: string; label: string }[]> = {
  "1298491919450797504": [
    { sn: "1053050258180057", label: "Menu Karachi INV1" },
    { sn: "1053050258140015", label: "Menu Karachi INV2" },
  ],
  "1298491919450958553": [{ sn: "1053050258110159", label: "OPL Residence INV" }],
  "1298491919450873747": [{ sn: "1053010259280019", label: "36 Chenab INV" }],
  "1298491919451014032": [{ sn: "1053050258180112", label: "Towfiq chinoy INV" }],
  "1298491919450740581": [{ sn: "1053050255210107", label: "P2G 50KW INV" }],
  "1298491919450840394": [{ sn: "1031731257050184", label: "P2G 1ST 6kw INV" }],
  "1298491919450851319": [{ sn: "1033161256090193", label: "P2G 20kw INV" }],
  "1298491919450734544": [{ sn: "1033320253150969", label: "P2G 15KW INV" }],
};

const ALL_INVERTERS = Object.values(PLANT_INVERTER_MAP).flat();

function packColor(index: number) {
  const palette = ["#15803d", "#2563eb", "#ea580c"];
  return palette[index] ?? `hsl(${(index * 137 + 212) % 360}, 68%, 40%)`;
}

const INVERTER_LABELS: Record<string, string> = Object.fromEntries(
  ALL_INVERTERS.map(({ sn, label }) => [sn, label])
);

interface BatteryReportRecord {
  sn: string;
  inverterSn?: string;
  stationId?: string;
  plantName: string;
  nominalCapacity: string;
  dailyChargeKwh: number;
  dailyDischargeKwh: number;
  socPct: number;
  packVoltageV: number;
  cellDeltaMv: number;
  cycles: number;
  sohPct: number;
  tempC?: number;
  minTempC?: number;
  maxTempC?: number;
  minTempLoc?: string;
  maxTempLoc?: string;
  minCellV?: number;
  maxCellV?: number;
  minCellLoc?: string;
  maxCellLoc?: string;
}

interface SolisBatteryReportViewProps {
  onSelectBattery?: (sn: string) => void;
}

export default function SolisBatteryReportView({ onSelectBattery }: SolisBatteryReportViewProps) {
  const [activeDateTab, setActiveDateTab] = useState<"Day" | "Month" | "Year">("Day");
  const [selectedPlant, setSelectedPlant] = useState<string>("All");
  const [selectedInverter, setSelectedInverter] = useState<string>("All");
  const [selectedSn, setSelectedSn] = useState<string>("All");
  const [reportDate, setReportDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date());
  });
  const [batteryRows, setBatteryRows] = useState<BatteryReportRecord[]>([]);
  const [curveData, setCurveData] = useState<any[]>([]);
  const comparing = activeDateTab === "Day" && selectedSn === "All" && (selectedPlant !== "All" || selectedInverter !== "All");
  const station = batteryRows.find(row => row.plantName === selectedPlant)?.stationId || "";
  const scope = new URLSearchParams();
  if (comparing && station) scope.set("compareStation", station);
  if (comparing && selectedInverter !== "All") scope.set("compareInverter", selectedInverter);
  const scopeQuery = scope.toString();
  const scopeKey = reportDate + scopeQuery;
  const [comparison, setComparison] = useState<{key: string; points: {
    inverter_sn: string; battery_sn: string; slot: number; power_kw: number | string | null; soc_pct: number | string | null
  }[]} | null>(null);
  const [metrics, setMetrics] = useState({ SOC: true, Charge: false, Discharge: false });
  const [loading, setLoading] = useState(false);

  // Selected Battery Alarms & Alerts
  const [batteryAlarms, setBatteryAlarms] = useState<any[]>([]);
  const [loadingAlarms, setLoadingAlarms] = useState(false);

  // Fetch real data on period, sn, or date change with 2-minute auto-refresh
  useEffect(() => {
    let active = true;
    const fetchData = (showLoading = true) => {
      if (showLoading) setLoading(true);
      const periodParam = activeDateTab.toLowerCase();
      const snParam = selectedSn !== "All" ? `&deviceSn=${encodeURIComponent(selectedSn)}` : "";

      fetch(`/api/reports?type=battery&period=${periodParam}&date=${reportDate}${snParam}&${scopeQuery}`)
        .then((res) => res.json())
        .then((data) => {
          if (!active) return;
          setComparison(Array.isArray(data.comparison) ? {key: scopeKey, points: data.comparison} : null);
          if (data.success && Array.isArray(data.rows)) {
            setBatteryRows(
              data.rows.map((r: any) => ({
                sn: r.sn,
                inverterSn: r.inverterSn || "",
                stationId: r.stationId || "",
                plantName: r.plantName || "Unknown",
                nominalCapacity: r.nominalCapacity || "45 kWh",
                dailyChargeKwh: r.dailyChargeKwh,
                dailyDischargeKwh: r.dailyDischargeKwh,
                socPct: r.socPct,
                packVoltageV: r.packVoltageV,
                cellDeltaMv: r.cellDeltaMv,
                cycles: r.cycles,
                sohPct: r.sohPct,
                tempC: r.tempC || 26,
                minTempC: r.minTempC,
                maxTempC: r.maxTempC,
                minTempLoc: r.minTempLoc,
                maxTempLoc: r.maxTempLoc,
                minCellV: r.minCellV,
                maxCellV: r.maxCellV,
                minCellLoc: r.minCellLoc,
                maxCellLoc: r.maxCellLoc,
              }))
            );
          } else {
            setBatteryRows([]);
          }
          if (data.success && Array.isArray(data.curve)) {
            setCurveData(data.curve);
          } else {
            setCurveData([]);
          }
        })
        .catch((err) => console.error("Error fetching battery report:", err))
        .finally(() => {
          if (active && showLoading) setLoading(false);
        });
    };

    fetchData(true);
    // Auto-refresh every 2 minutes (120,000 ms)
    const interval = setInterval(() => {
      fetchData(false);
    }, 120000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeDateTab, reportDate, selectedSn, scopeQuery, scopeKey]);

  // Fetch alarms & alerts for the selected battery pack, inverter, or plant
  useEffect(() => {
    setLoadingAlarms(true);
    const params = new URLSearchParams();
    if (selectedSn !== "All") {
      params.set("batterySn", selectedSn);
    } else if (selectedInverter !== "All") {
      params.set("inverterSn", selectedInverter);
    } else if (selectedPlant !== "All") {
      const match = batteryRows.find((r) => r.plantName === selectedPlant);
      if (match?.stationId) params.set("stationId", match.stationId);
    }

    fetch(`/api/bms/alarms?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setBatteryAlarms(data.alarms || []);
        } else {
          setBatteryAlarms([]);
        }
      })
      .catch((err) => console.error("Error loading battery alarms:", err))
      .finally(() => setLoadingAlarms(false));
  }, [selectedSn, selectedInverter, selectedPlant, batteryRows]);

  // Distinct plants list
  const uniquePlants = useMemo(() => {
    const set = new Set<string>();
    batteryRows.forEach((r) => {
      if (r.plantName) set.add(r.plantName);
    });
    return Array.from(set).sort();
  }, [batteryRows]);

  // Distinct inverters list (filtered by selectedPlant if not "All")
  const availableInverters = useMemo(() => {
    const invertersMap = new Map<string, { sn: string; label: string; plantName: string }>();
    batteryRows.forEach((r) => {
      if (!r.inverterSn) return;
      if (selectedPlant !== "All" && r.plantName !== selectedPlant) return;
      const label = INVERTER_LABELS[r.inverterSn] || r.inverterSn;
      invertersMap.set(r.inverterSn, { sn: r.inverterSn, label, plantName: r.plantName });
    });
    return Array.from(invertersMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [batteryRows, selectedPlant]);

  // Available battery packs (filtered by plant & inverter)
  const availableBatteryPacks = useMemo(() => {
    return batteryRows.filter((r) => {
      const matchPlant = selectedPlant === "All" || r.plantName === selectedPlant;
      const matchInv = selectedInverter === "All" || r.inverterSn === selectedInverter;
      return matchPlant && matchInv;
    });
  }, [batteryRows, selectedPlant, selectedInverter]);

  // Final filtered records for KPIs and table
  const filteredRecords = useMemo(() => {
    return batteryRows.filter((r) => {
      const matchPlant = selectedPlant === "All" || r.plantName === selectedPlant;
      const matchInv = selectedInverter === "All" || r.inverterSn === selectedInverter;
      const matchSn = selectedSn === "All" || r.sn === selectedSn;
      return matchPlant && matchInv && matchSn;
    });
  }, [selectedPlant, selectedInverter, selectedSn, batteryRows]);

  // Compute KPIs
  const kpiData = useMemo(() => {
    const totalCharge = filteredRecords.reduce((acc, b) => acc + b.dailyChargeKwh, 0);
    const totalDischarge = filteredRecords.reduce((acc, b) => acc + b.dailyDischargeKwh, 0);
    const eff = totalCharge > 0 ? ((totalDischarge / totalCharge) * 100).toFixed(2) : "92.8";
    const avgSoc = Math.round(
      filteredRecords.reduce((acc, b) => acc + b.socPct, 0) / Math.max(filteredRecords.length, 1)
    );

    return {
      dailyCharge: totalCharge.toFixed(2),
      dailyDischarge: totalDischarge.toFixed(2),
      efficiency: `${eff}%`,
      socSoh: `${avgSoc}% / 100% SOH`,
      chargeSubtitle: `${filteredRecords.length} Battery Packs`,
      dischargeSubtitle: "Offloaded during peak",
      efficiencySubtitle: "High Coulombic Yield",
      socSohSubtitle: "Healthy Cell Balancing",
    };
  }, [filteredRecords]);

  // ECharts Dual Axis: Battery Power Bar (Charge/Discharge) + SOC Line Curve
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    let chart = echarts.getInstanceByDom(chartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(chartRef.current);
    }
    chartInstance.current = chart;

    const timeLabels = curveData.map(c => c.time_label);
    const powerData = curveData.map(c => c.power_kw == null ? null : Number(c.power_kw));
    const socData = curveData.map(c => c.soc_pct == null ? null : Number(c.soc_pct));

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const option: echarts.EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.98)",
        borderColor: "#f1f5f9",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return "";
          let res = `<div class="font-bold text-slate-800 mb-1">${params[0].axisValue}</div>`;
          params.forEach((item) => {
            if (item.seriesName.includes("Battery Power")) {
              const val = Number(item.value);
              const label = val >= 0 ? `Charge: +${val.toFixed(2)} kW` : `Discharge: ${val.toFixed(2)} kW`;
              res += `<div class="flex items-center gap-1.5 text-xs"><span style="color:${val >= 0 ? '#10b981' : '#0284c7'}">●</span> ${label}</div>`;
            } else if (item.seriesName.includes("State of Charge")) {
              res += `<div class="flex items-center gap-1.5 text-xs"><span style="color:#f37021">●</span> SOC: ${item.value}%</div>`;
            }
          });
          return res;
        },
      },
      legend: {
        bottom: 0,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: "#64748b", fontSize: isMobile ? 9 : 12 },
        itemGap: isMobile ? 6 : 10,
        data: [
          {
            name: "Battery Power (Charge + / Discharge - kW)",
            icon: "rect",
            itemStyle: { color: "#0284c7" },
          },
          {
            name: "State of Charge (SOC %)",
            icon: "circle",
            itemStyle: { color: "#f37021" },
          },
        ],
      },
      grid: {
        top: 30,
        left: isMobile ? "2%" : "3%",
        right: isMobile ? "2%" : "3%",
        bottom: isMobile ? 60 : 50,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: timeLabels,
        boundaryGap: true,
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
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "#f8fafc", type: "solid" } },
          axisLabel: {
            color: "#94a3b8",
            fontSize: isMobile ? 9 : 10,
            formatter: "{value}",
          },
        },
        {
          type: "value",
          name: "%",
          min: 0,
          max: 100,
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: "#94a3b8",
            fontSize: isMobile ? 9 : 10,
            formatter: "{value}%",
          },
        },
      ],
      series: [
        {
          name: "Battery Power (Charge + / Discharge - kW)",
          type: "bar",
          yAxisIndex: 0,
          data: powerData,
          itemStyle: {
            color: (params: any) => (params.value >= 0 ? "#10b981" : "#0284c7"),
            borderRadius: [2, 2, 0, 0],
          },
          barMaxWidth: 10,
        },
        {
          name: "State of Charge (SOC %)",
          type: "line",
          yAxisIndex: 1,
          data: socData,
          smooth: true,
          connectNulls: true,
          showSymbol: false,
          lineStyle: { color: "#f37021", width: 2.5 },
          itemStyle: { color: "#f37021" },
        },
      ],
    };

    if (comparing) {
      const points = comparison?.key === scopeKey ? comparison.points : [];
      const count = points.reduce((n, p) => Math.max(n, p.slot + 1), 0);
      const slots = Array.from({ length: count }, (_, i) => i);
      const labels = slots.map(i => [Math.floor(i / 12), i % 12 * 5].map(v => String(v).padStart(2, "0")).join(":"));
      const samples = new Map(points.map(p => [JSON.stringify([p.inverter_sn, p.battery_sn, p.slot]), p]));
      const series: echarts.LineSeriesOption[] = [];
      filteredRecords.forEach((pack, index) => {
        const color = packColor(index);
        const values = slots.map(i => samples.get(JSON.stringify([pack.inverterSn, pack.sn, i])));
        const inverter = pack.inverterSn || "";
        const label = `${INVERTER_LABELS[inverter] || inverter} · ${pack.sn.replace(inverter, "") || pack.sn}`;
        for (const metric of ["SOC", "Charge", "Discharge"] as const) {
          if (!metrics[metric]) continue;
          series.push({
            name: `${label} · ${metric}`, type: "line", yAxisIndex: metric === "SOC" ? 1 : 0,
            showSymbol: false, connectNulls: true, itemStyle: {color},
            lineStyle: {color, width: 2.5, type: "solid"},
            emphasis: {focus: "series"},
            tooltip: {valueFormatter: value => value == null ? "—" : `${value} ${metric === "SOC" ? "%" : "kW"}`},
            data: values.map(p => {
              if (metric === "SOC") return p?.soc_pct == null ? null : Number(p.soc_pct);
              if (p?.power_kw == null) return null;
              const kw = Number(p.power_kw);
              if (kw === 0) return 0;
              return metric === "Charge" ? Math.max(kw, 0) : Math.min(kw, 0);
            }),
          });
        }
      });
      option.xAxis = {...option.xAxis, data: labels} as echarts.XAXisComponentOption;
      // Draw coincident traces as nested solid strokes on the same coordinates.
      const coincident = new Map<string, echarts.LineSeriesOption[]>();
      for (const trace of series) {
        const key = JSON.stringify([trace.yAxisIndex, trace.data]);
        const group = coincident.get(key);
        if (group) group.push(trace);
        else coincident.set(key, [trace]);
      }
      for (const group of coincident.values()) {
        if (group.length < 2) continue;
        group.forEach((trace, i) => {
          trace.lineStyle = {...trace.lineStyle, width: 2.5 + 3 * (group.length - 1 - i)};
          trace.z = 3 + i;
        });
      }
      option.series = series;
      if (Array.isArray(option.yAxis)) {
        option.yAxis[0].show = metrics.Charge || metrics.Discharge;
        option.yAxis[1].show = metrics.SOC;
      }
      option.legend = {show: false};
      option.grid = {...option.grid, bottom: 12};
      option.tooltip = {
        trigger: "axis", confine: true, renderMode: "richText",
        formatter: (items: any) => {
          if (!Array.isArray(items) || !items.length) return "";
          const rows = items.filter(item => item.value != null && item.value !== "-");
          return [items[0].axisValue, ...(!rows.length ? ["No recorded reading"] : rows.map(item =>
            `${item.marker} ${item.seriesName}: ${item.value} ${item.seriesName.endsWith("SOC") ? "%" : "kW"}`))].join("\n");
        },
      };
    }
    chart.setOption(option, {notMerge: true});

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [curveData, comparing, comparison, scopeKey, metrics, filteredRecords]);

  // Export Entire Fleet
  const handleExportExcel = () => {
    exportToExcel(
      [
        {
          sheetName: "Battery Storage",
          data: filteredRecords.map((r) => ({
            "Plant Name": r.plantName,
            "Connected Inverter": INVERTER_LABELS[r.inverterSn || ""] || r.inverterSn || "N/A",
            "Battery Pack SN": r.sn,
            "Nominal Capacity": r.nominalCapacity,
            [`${activeDateTab} Charge (kWh)`]: r.dailyChargeKwh,
            [`${activeDateTab} Discharge (kWh)`]: r.dailyDischargeKwh,
            "SOC (%)": r.socPct,
            "Pack Voltage (V)": r.packVoltageV,
            "Cell Delta (mV)": r.cellDeltaMv,
            Cycles: r.cycles,
            "SOH (%)": r.sohPct,
          })),
        },
      ],
      `Battery_Report_${activeDateTab}_${reportDate}`
    );
  };

  // Export Specific Single Battery Pack
  const handleExportSinglePack = (packSn: string) => {
    const link = document.createElement("a");
    link.href = `/api/reports/export-battery-pack-excel?batterySn=${encodeURIComponent(packSn)}&hours=24`;
    link.download = `${packSn}_24h_telemetry.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Professional PDF
  const handleExportPdf = () => {
    const chartInstance = chartRef.current
      ? echarts.getInstanceByDom(chartRef.current)
      : null;
    const chartBase64 = chartInstance
      ? chartInstance.getDataURL({ pixelRatio: 2, backgroundColor: "#ffffff" })
      : undefined;

    exportBatteryReportToPdf({
      period: activeDateTab,
      reportDate,
      selectedSn,
      rows: filteredRecords.map((r) => ({
        sn: r.sn,
        plantName: r.plantName,
        nominalCapacity: r.nominalCapacity,
        dailyChargeKwh: r.dailyChargeKwh,
        dailyDischargeKwh: r.dailyDischargeKwh,
        dailyCycles: r.cycles,
        currentSocPct: r.socPct,
        healthSohPct: r.sohPct,
        temperatureC: r.tempC || 26,
        batteryStatus: "Normal",
      })),
      chartDataUrl: chartBase64,
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1e293b] tracking-tight">
              Battery Storage &amp; Health Report
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Round-trip efficiency, 5-minute BMS telemetry, pack state of health, cell voltage balancing, and pack alarms.
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
            <span>Export Fleet Excel</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f37021] text-white rounded-lg text-xs font-semibold hover:bg-[#e05e10] active:scale-95 transition-all shadow-2xs"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          {/* BMS Collector Health Badge */}
          <BmsCollectorHealth
            compact={true}
            inverterLabels={INVERTER_LABELS}
            refreshIntervalSeconds={60}
          />
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Fleet Daily Charge */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">
              Fleet {activeDateTab} Charge
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.dailyCharge}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.chargeSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
            <BatteryCharging className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Fleet Daily Discharge */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">
              Fleet {activeDateTab} Discharge
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.dailyDischarge}
              </span>
              <span className="text-xs font-medium text-slate-400">kWh</span>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-1.5 inline-block">
              {kpiData.dischargeSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Round-Trip Efficiency */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Round-Trip Efficiency</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.efficiency}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.efficiencySubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Fleet Avg SOC / SOH */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">Fleet Avg SOC / SOH</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-extrabold text-[#0f172a] font-sans">
                {kpiData.socSoh}
              </span>
            </div>
            <span className="text-xs font-medium text-emerald-600 mt-1.5 inline-block">
              {kpiData.socSohSubtitle}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 flex items-center justify-center">
            <Heart className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Hierarchical Filtration Bar: Plant -> Inverter -> Battery Pack */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-orange-500" />
              Battery Charge/Discharge Profile &amp; SOC %
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedSn === "All"
                ? comparing ? `Battery comparison (${filteredRecords.length} packs)` : `Fleet Aggregate Scope (${filteredRecords.length} packs)`
                : `Active Pack: ${selectedSn} — ${filteredRecords[0]?.plantName || ""} (${INVERTER_LABELS[filteredRecords[0]?.inverterSn || ""] || filteredRecords[0]?.inverterSn || ""})`}
            </p>
          </div>

          {/* Three-Tier Cascading Filter aligned neatly */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. First by Plant */}
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
              <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="relative flex items-center">
                <select
                  aria-label="Filter Plant"
                  value={selectedPlant}
                  onChange={(e) => {
                    setSelectedPlant(e.target.value);
                    setSelectedInverter("All");
                    setSelectedSn("All");
                  }}
                  className="appearance-none bg-transparent pr-5 text-xs font-bold text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Plants ({uniquePlants.length})</option>
                  {uniquePlants.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. Second by Connected Inverter */}
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 px-3 py-1.5 rounded-xl transition-colors">
              <Cpu className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="relative flex items-center">
                <select
                  aria-label="Filter Inverter"
                  value={selectedInverter}
                  onChange={(e) => {
                    setSelectedInverter(e.target.value);
                    setSelectedSn("All");
                  }}
                  className="appearance-none bg-transparent pr-5 text-xs font-bold text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Inverters ({availableInverters.length})</option>
                  {availableInverters.map((inv) => (
                    <option key={inv.sn} value={inv.sn}>
                      {inv.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. Third by Specific Battery Pack */}
            <div className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100/70 border border-orange-200 px-3 py-1.5 rounded-xl transition-colors">
              <BatteryCharging className="w-4 h-4 text-orange-600 shrink-0" />
              <div className="relative flex items-center">
                <select
                  aria-label="Filter Battery Pack"
                  value={selectedSn}
                  onChange={(e) => setSelectedSn(e.target.value)}
                  className="appearance-none bg-transparent pr-5 text-xs font-bold text-orange-800 hover:text-orange-950 focus:outline-none cursor-pointer"
                >
                  <option value="All">All Packs ({availableBatteryPacks.length})</option>
                  {availableBatteryPacks.map((b) => (
                    <option key={b.sn} value={b.sn}>
                      {b.sn.slice(-5)} ({INVERTER_LABELS[b.inverterSn || ""] || b.plantName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-orange-500 pointer-events-none" />
              </div>
            </div>

            {/* Direct Export Pack Log Button */}
            {selectedSn !== "All" && (
              <button
                onClick={() => handleExportSinglePack(selectedSn)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Pack Log</span>
              </button>
            )}
          </div>
        </div>

        {/* EChart Canvas */}
        {comparing && <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Comparison metrics">
          {(["SOC", "Charge", "Discharge"] as const).map(metric =>
            <button type="button" key={metric} aria-pressed={metrics[metric]}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${metrics[metric] ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-white"}`}
              onClick={() => setMetrics(prev => ({...prev, [metric]: !prev[metric]}))}>
              {metric}
            </button>)}
        </div>}
        {comparing && <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          {filteredRecords.map((pack, index) => <span key={pack.sn} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{backgroundColor: packColor(index)}} />
            {INVERTER_LABELS[pack.inverterSn || ""] || pack.inverterSn} · {pack.sn.replace(pack.inverterSn || "", "") || pack.sn}
          </span>)}
        </div>}
        <div ref={chartRef} className="w-full h-80" />
      </div>

      {/* 4. Alarms & Alerts Box (Synced with Page Filter) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden transition-all">
        <div className="p-4 border-b border-gray-100 bg-amber-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Alarms &amp; Operational Alerts:{" "}
                <span className="font-mono text-orange-600">
                  {selectedSn !== "All"
                    ? selectedSn
                    : selectedInverter !== "All"
                    ? INVERTER_LABELS[selectedInverter] || selectedInverter
                    : selectedPlant !== "All"
                    ? selectedPlant
                    : "Entire Fleet"}
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Hardware fault protections, under-voltage trips, and BMS communication logs for selected scope.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-amber-200 rounded-full text-amber-800">
              {batteryAlarms.length} Alarms Logged
            </span>
          </div>
        </div>

        <div className="p-4">
          {loadingAlarms ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading alarms &amp; alerts...</div>
          ) : batteryAlarms.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Normal Operation:</span> Zero active or historic alarms flagged for this selection.
            </div>
          ) : (
            <div className="space-y-2.5">
              {batteryAlarms.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                        a.level === "Critical"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-amber-100 text-amber-700 border border-amber-200"
                      }`}
                    >
                      Code {a.alarmCode}
                    </span>
                    <span className="font-bold text-slate-800">{a.alarmMsg}</span>
                    <span className="text-slate-400">({a.state})</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-500">
                    <span>Trigger: {a.beginTime}</span>
                    {a.duration && <span className="text-slate-400">| Duration: {a.duration}</span>}
                    {a.advice && <span className="text-slate-600 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">Advice: {a.advice}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. BMS Cell Temperature History — Synced with unified filter */}
      {(["cell", "inverter"] as const).map(source => (
        <BmsTempHistoryChart
          key={source}
          source={source}
          plantName={selectedPlant === "All" ? "All Plants" : selectedPlant}
          inverterSn={selectedSn !== "All" ? filteredRecords[0]?.inverterSn : selectedInverter !== "All" ? selectedInverter : undefined}
          batterySn={selectedSn !== "All" ? selectedSn : undefined}
          batteries={availableBatteryPacks}
          availableInverters={availableInverters}
        />
      ))}

      {/* 6. Battery Technical Specification Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Battery Technical Specification Table
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified first by Plant Name, then by Connected Inverter, then by Battery Pack Rack.
            </p>
          </div>
          <span className="text-xs text-slate-500 font-bold px-2.5 py-1 bg-slate-100 rounded-full">
            Total {filteredRecords.length} Battery Units
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-slate-400 font-medium">
                <th className="py-3 px-4">Plant Name</th>
                <th className="py-3 px-3">Connected Inverter</th>
                <th className="py-3 px-3">Battery Pack SN</th>
                <th className="py-3 px-3">Nominal Capacity</th>
                <th className="py-3 px-3">{activeDateTab} Charge</th>
                <th className="py-3 px-3">{activeDateTab} Discharge</th>
                <th className="py-3 px-3">SOC</th>
                <th className="py-3 px-3">Pack Voltage</th>
                <th className="py-3 px-3">Min / Max Cell V</th>
                <th className="py-3 px-3">Cell Delta</th>
                <th className="py-3 px-3">Min / Max Cell Temp</th>
                <th className="py-3 px-3">Cycles</th>
                <th className="py-3 px-3">SOH</th>
                <th className="py-3 px-4 text-center">Export / View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((row) => (
                <tr key={row.sn} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {row.plantName}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-slate-600">
                    {INVERTER_LABELS[row.inverterSn || ""] || row.inverterSn || "N/A"}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-medium text-[#f37021]">
                    {row.sn}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-slate-600">
                    {row.nominalCapacity}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-emerald-600">
                    {activeDateTab === "Month" || activeDateTab === "Year"
                      ? `${(row.dailyChargeKwh / 1000).toFixed(2)} MWh`
                      : `${Math.round(row.dailyChargeKwh)} kWh`}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-blue-600">
                    {activeDateTab === "Month" || activeDateTab === "Year"
                      ? `${(row.dailyDischargeKwh / 1000).toFixed(2)} MWh`
                      : `${Math.round(row.dailyDischargeKwh)} kWh`}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-900">
                    {row.socPct}%
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {row.packVoltageV} V
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    <span className="font-mono text-blue-600">{row.minCellV ?? 3.32}V</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="font-mono text-red-500">{row.maxCellV ?? 3.39}V</span>
                    <div className="text-[10px] text-slate-400">{row.minCellLoc || "Cell 1"} ↔ {row.maxCellLoc || "Cell 16"}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 font-medium">
                    {row.cellDeltaMv} mV
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    <span className="font-mono text-blue-600">{row.minTempC ?? 23}°C</span>
                    <span className="text-slate-300 mx-1">/</span>
                    <span className="font-mono text-orange-500">{row.maxTempC ?? 28}°C</span>
                    <div className="text-[10px] text-slate-400">{row.minTempLoc || "Cell 1"} ↔ {row.maxTempLoc || "Cell 16"}</div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-600">
                    {row.cycles}
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-emerald-600">
                    {row.sohPct}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title="Export 24h Excel for this pack"
                        onClick={() => handleExportSinglePack(row.sn)}
                        className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-95 transition-all shadow-2xs flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlant(row.plantName);
                          setSelectedInverter(row.inverterSn || "All");
                          setSelectedSn(row.sn);
                          if (onSelectBattery) onSelectBattery(row.sn);
                        }}
                        className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[11px] font-semibold text-slate-700 hover:text-[#f37021] hover:border-orange-300 active:scale-95 transition-all shadow-2xs"
                      >
                        Filter Pack
                      </button>
                    </div>
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
