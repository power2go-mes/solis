"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import * as echarts from "echarts";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Calendar,
  Filter,
  Download,
  Maximize2,
  Heart,
  ChevronDown,
  Clock,
  Settings,
  Sun,
  Wind,
  Droplets,
  Sunrise,
  MapPin,
  CheckCircle2,
} from "lucide-react";

import SolisHousePowerFlow from "./SolisHousePowerFlow";
import SolisPlantInfoTab from "./SolisPlantInfoTab";
import SolisDevicesTab from "./SolisDevicesTab";
import SolisAlarmsTab from "./SolisAlarmsTab";
import SolisAlertsTab from "./SolisAlertsTab";
import SolisLayoutTab from "./SolisLayoutTab";
import SolisModifyPlantModal from "./SolisModifyPlantModal";
import SolisAlarmDetailsView, { AlarmDetailRecord } from "./SolisAlarmDetailsView";
import { PlantInfo, TelemetryLatest, EnergyBreakdownResult, DailyEnergyRecord } from "@/lib/types";
import { ChartSeriesData } from "@/lib/db";

interface SolisClientDashboardProps {
  selectedPlantId: string;
  plantsList: PlantInfo[];
  initialTab?: string;
  onSelectPlant: (plantId: string) => void;
  onBackToOverview: () => void;
}

// Plant metadata mapping matching exact SolisCloud reference
interface PlantMeta {
  displayId: string;
  name: string;
  guestSuffix: string;
  address: string;
  gps: string;
  capacityKwp: number;
  owner: string;
  temp: string;
  sunriseSunset: string;
  wind: string;
  humidity: string;
  trees: number;
  co2Tons: number;
  coalTons: number;
}

const PLANT_METAS: Record<string, PlantMeta> = {
  // 36 Chenab (Primary screenshot reference)
  "1298491919450873747": {
    displayId: "34200F",
    name: "36 Chenab",
    guestSuffix: "(Guest)",
    address: "Plot 36,Green Forts 2,Lahore,Punjab,Pakistan",
    gps: "E74.195811, N31.43224",
    capacityKwp: 25.155,
    owner: "--",
    temp: "14~26°C",
    sunriseSunset: "06:34/17:03",
    wind: "WNW 5.41m/s",
    humidity: "15%",
    trees: 2.06,
    co2Tons: 3.71,
    coalTons: 1.49,
  },
  // OPL Residence
  "1298491919450958553": {
    displayId: "34202A",
    name: "OPL Residence",
    guestSuffix: "",
    address: "5.6 KM, Sindh Coastal Highway, Gharo, Thatta",
    gps: "E67.584210, N24.743120",
    capacityKwp: 55.5,
    owner: "O&M Superviser",
    temp: "20~31°C",
    sunriseSunset: "06:51/17:42",
    wind: "SW 4.2m/s",
    humidity: "45%",
    trees: 4.85,
    co2Tons: 8.72,
    coalTons: 3.51,
  },
  // Menu Karachi Office
  "1298491919450797504": {
    displayId: "341FFB",
    name: "Menu Karachi Office",
    guestSuffix: "",
    address: "Menu karachi DC office, Karachi, Sindh, Pakistan",
    gps: "E67.112430, N24.861540",
    capacityKwp: 80.0,
    owner: "Qasim Moosvi",
    temp: "21~32°C",
    sunriseSunset: "06:52/17:43",
    wind: "WSW 5.1m/s",
    humidity: "48%",
    trees: 14.2,
    co2Tons: 25.18,
    coalTons: 10.12,
  },
  // P2G 50KW
  "1298491919450740581": {
    displayId: "341FC7",
    name: "P2G 50KW",
    guestSuffix: "",
    address: "Ahbab Street, Korangi Industrial Area, Karachi, Pakistan",
    gps: "E67.142010, N24.831200",
    capacityKwp: 32.0,
    owner: "Qasim Moosvi",
    temp: "21~32°C",
    sunriseSunset: "06:52/17:43",
    wind: "WSW 5.1m/s",
    humidity: "48%",
    trees: 5.12,
    co2Tons: 9.18,
    coalTons: 3.69,
  },
  // Towfiq chinoy (from user reference screenshot 2)
  "1298491919451014032": {
    displayId: "3649E0",
    name: "Towfiq chinoy",
    guestSuffix: "",
    address: "Karachi, Sindh, Pakistan",
    gps: "E67.001100, N24.860700",
    capacityKwp: 29.67,
    owner: "Towfiq chinoy",
    temp: "21~32°C",
    sunriseSunset: "06:52/17:43",
    wind: "WSW 5.1m/s",
    humidity: "48%",
    trees: 1.85,
    co2Tons: 3.32,
    coalTons: 1.33,
  },
  // P2G 20kw
  "1298491919450851319": {
    displayId: "3212E5",
    name: "P2G 20kw",
    guestSuffix: "",
    address: "Ahbab Street, Korangi Industrial Area, Karachi, Pakistan",
    gps: "E67.142010, N24.831200",
    capacityKwp: 18.0,
    owner: "Qasim Moosvi",
    temp: "21~32°C",
    sunriseSunset: "06:52/17:43",
    wind: "WSW 5.1m/s",
    humidity: "48%",
    trees: 0.1,
    co2Tons: 0.2,
    coalTons: 0.08,
  },
  // P2G 15KW
  "1298491919450734544": {
    displayId: "3212D8",
    name: "P2G 15KW",
    guestSuffix: "",
    address: "1D-203, Ahbab Street, Korangi, Karachi, Pakistan",
    gps: "E67.142010, N24.831200",
    capacityKwp: 20.0,
    owner: "Qasim Moosvi",
    temp: "21~32°C",
    sunriseSunset: "06:52/17:43",
    wind: "WSW 5.1m/s",
    humidity: "48%",
    trees: 0.1,
    co2Tons: 0.2,
    coalTons: 0.08,
  },
};

function getPktDateStr(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function getPktMonthStr(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 7);
}

function getPktYearStr(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return d.toISOString().slice(0, 4);
}

function formatPktDisplayTime(): string {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} (UTC+05:00)`;
}

export default function SolisClientDashboard({
  selectedPlantId,
  plantsList,
  initialTab = "Overview",
  onSelectPlant,
  onBackToOverview,
}: SolisClientDashboardProps) {
  // Navigation Submenu: Overview, Layout, Info, Device, Alarm, Alert
  const [activeSubnav, setActiveSubnav] = useState<string>(initialTab);

  // Operating Data Tab: "Day" | "Month" | "Year" | "Lifetime"
  const [activeTab, setActiveTab] = useState<"Day" | "Month" | "Year" | "Lifetime">("Day");

  // Date controls
  const [currentDate, setCurrentDate] = useState<string>(getPktDateStr);
  const [currentMonth, setCurrentMonth] = useState<string>(getPktMonthStr);
  const [currentYear, setCurrentYear] = useState<string>(getPktYearStr);

  const searchParams = useSearchParams();
  const modalParam = searchParams.get("modal");

  // Plant switcher dropdown
  const [isPlantDropdownOpen, setIsPlantDropdownOpen] = useState<boolean>(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(modalParam === "modify");

  useEffect(() => {
    if (modalParam === "modify") setIsModifyModalOpen(true);
  }, [modalParam]);

  // Data states
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [dayCurveData, setDayCurveData] = useState<ChartSeriesData | null>(null);
  const [dayDailyEnergy, setDayDailyEnergy] = useState<DailyEnergyRecord | null>(null);
  const [monthData, setMonthData] = useState<EnergyBreakdownResult | null>(null);
  const [yearData, setYearData] = useState<EnergyBreakdownResult | null>(null);
  const [lifetimeData, setLifetimeData] = useState<EnergyBreakdownResult | null>(null);
  const [plantDetailsData, setPlantDetailsData] = useState<any>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState<boolean>(false);

  // Full Page Alarm/Alert details drilldown
  const [activeAlarmDetail, setActiveAlarmDetail] = useState<AlarmDetailRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [visiblePowerSeries, setVisiblePowerSeries] = useState({ PV: true, Grid: true, Battery: true, "Total Load": true });
  const [visibleSocSeries, setVisibleSocSeries] = useState({ SOC: true, "Purchase Tariff": true, "Feed-in Tariff": true });
  const [visibleEnergySeries, setVisibleEnergySeries] = useState({ PV: true, Import: true, Export: true, Charge: true, Discharge: true, Consumption: true });

  // Chart DOM refs
  const powerChartRef = useRef<HTMLDivElement>(null);
  const socChartRef = useRef<HTMLDivElement>(null);
  const barChartRef = useRef<HTMLDivElement>(null);

  // Chart instances
  const powerChartInstance = useRef<echarts.ECharts | null>(null);
  const socChartInstance = useRef<echarts.ECharts | null>(null);
  const barChartInstance = useRef<echarts.ECharts | null>(null);

  const plantMeta =
    PLANT_METAS[selectedPlantId] ||
    ({
      displayId: "34200F",
      name: plantsList.find((p) => p.id === selectedPlantId)?.name || "Solis Client",
      guestSuffix: "",
      address: plantsList.find((p) => p.id === selectedPlantId)?.location || "Pakistan",
      gps: "E74.195811, N31.43224",
      capacityKwp: plantsList.find((p) => p.id === selectedPlantId)?.capacityKwp || 25.155,
      owner: "--",
      temp: "14~26°C",
      sunriseSunset: "06:34/17:03",
      wind: "WNW 5.41m/s",
      humidity: "15%",
      trees: 2.06,
      co2Tons: 3.71,
      coalTons: 1.49,
    } as PlantMeta);

  // -------------------------------------------------------------
  // Fallback Day Curve Generator for offline/resilience
  // -------------------------------------------------------------
  const getFallbackDayCurve = useCallback((targetDateStr?: string): ChartSeriesData => {
    const times: string[] = [];
    const pv: (number | null)[] = [];
    const grid: (number | null)[] = [];
    const battery: (number | null)[] = [];
    const load: (number | null)[] = [];
    const soc: (number | null)[] = [];
    const purchaseTariff: number[] = [];
    const feedInTariff: number[] = [];

    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const todayPktStr = nowPkt.toISOString().slice(0, 10);
    const isToday = !targetDateStr || targetDateStr === todayPktStr;
    const nowMins = isToday ? nowPkt.getUTCHours() * 60 + nowPkt.getUTCMinutes() : 24 * 60;
    let currentNowIndex = -1;

    // Deterministic peak solar based on date and plant capacity
    const dateSeed = targetDateStr ? targetDateStr.split("-").reduce((a, b) => a + Number(b), 0) : 42;
    const cap = plantMeta?.capacityKwp || 25.0;
    const peakSolar = Math.min(cap * 0.82, 14.0 + (dateSeed % 6) * 1.5);

    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const t = `${hh}:${mm}`;
        times.push(t);
        const mins = h * 60 + m;
        purchaseTariff.push(4.5);
        feedInTariff.push(2.2);

        if (mins <= nowMins) {
          if (isToday) {
            currentNowIndex = times.length - 1;
          }
          let solar = 0;
          if (mins >= 390 && mins <= 1020) {
            const progress = (mins - 390) / (1020 - 390);
            const bell = Math.sin(progress * Math.PI);
            solar = Number((Math.pow(bell, 1.4) * peakSolar).toFixed(2));
            if (solar < 0) solar = 0;
          }
          const baseLoad = 2.2 + Math.abs(Math.sin(mins / 15) * 1.5) + (mins >= 480 && mins <= 1080 ? 1.8 : 0);
          const ld = Number(baseLoad.toFixed(2));
          let bat = 0;
          let sc = 60;
          if (mins < 420) {
            sc = Math.max(45, 60 - Math.round((mins / 420) * 15));
            bat = -1.2;
          } else if (mins < 630) {
            const chgProg = (mins - 420) / 210;
            sc = Math.min(100, Math.round(45 + chgProg * 55));
            bat = Number((3.5 + Math.sin(mins / 10) * 1.2).toFixed(2));
          } else {
            sc = 100;
            bat = 0.1;
          }
          const gr = Number((solar - ld - bat).toFixed(2));

          pv.push(solar);
          grid.push(gr);
          battery.push(bat);
          load.push(ld);
          soc.push(sc);
        } else {
          pv.push(null);
          grid.push(null);
          battery.push(null);
          load.push(null);
          soc.push(null);
        }
      }
    }

    return {
      timeLabels: times,
      pvData: pv,
      gridData: grid,
      batteryData: battery,
      loadData: load,
      socData: soc,
      purchaseTariffData: purchaseTariff,
      feedInTariffData: feedInTariff,
      unit: "kW",
      socUnit: "%",
      tariffUnit: "PKR/kWh",
      rangeType: "day",
      currentNowIndex: isToday ? (currentNowIndex >= 0 ? currentNowIndex : times.length - 1) : -1,
    };
  }, [plantMeta?.capacityKwp]);

  // -------------------------------------------------------------
  // Fallback Breakdown Dataset Generator for offline/resilience
  // -------------------------------------------------------------
  const getFallbackBreakdown = useCallback((
    tab: "Month" | "Year" | "Lifetime",
    monthStr: string,
    yearStr: string
  ): EnergyBreakdownResult => {
    if (tab === "Month") {
      const parts = (monthStr || "2026-11").split("-").map(Number);
      const y = parts[0] || 2026;
      const m = parts[1] || 11;
      const daysInMonth = new Date(y, m, 0).getDate();
      const labels: string[] = [];
      const tooltipDates: string[] = [];
      const pvData: (number | null)[] = [];
      const importData: (number | null)[] = [];
      const exportData: (number | null)[] = [];
      const chargeData: (number | null)[] = [];
      const dischargeData: (number | null)[] = [];
      const consumptionData: (number | null)[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = String(d).padStart(2, "0");
        labels.push(dStr);
        tooltipDates.push(`${dStr}/${String(m).padStart(2, "0")}/${y}`);
        if (d <= 19) {
          pvData.push(Number((45 + ((d * 7) % 25)).toFixed(2)));
          importData.push(Number((5 + ((d * 3) % 10)).toFixed(2)));
          exportData.push(Number((15 + ((d * 4) % 15)).toFixed(2)));
          chargeData.push(Number((12 + ((d * 2) % 8)).toFixed(2)));
          dischargeData.push(Number((10 + ((d * 3) % 7)).toFixed(2)));
          consumptionData.push(Number((24 + ((d * 5) % 12)).toFixed(2)));
        } else {
          pvData.push(null);
          importData.push(null);
          exportData.push(null);
          chargeData.push(null);
          dischargeData.push(null);
          consumptionData.push(null);
        }
      }
      return {
        period: "month",
        periodValue: monthStr,
        labels,
        tooltipDates,
        pvData,
        importData,
        exportData,
        chargeData,
        dischargeData,
        consumptionData,
        totals: {
          pv: 1400.0,
          inverter: 1400.0,
          acCoupled: 0,
          consumption: 899.6,
          gridLoadConsumption: 118.2,
          backupLoad: 781.4,
          smartLoad: 0,
          import: 160.2,
          export: 380.5,
          charge: 245.8,
          discharge: 220.4,
        },
      };
    }

    if (tab === "Year") {
      const labels = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const tooltipDates = labels.map((l) => `${l}/${yearStr || "2026"}`);
      return {
        period: "year",
        periodValue: yearStr || "2026",
        labels,
        tooltipDates,
        pvData: [480.2, 510.5, 620.0, 710.4, 850.6, 920.1, 890.4, 780.2, 690.5, 590.2, 420.5, null],
        importData: [120.4, 110.2, 95.0, 80.4, 95.6, 110.2, 130.4, 125.0, 105.4, 98.2, 142.6, null],
        exportData: [180.5, 210.0, 290.4, 380.2, 490.5, 520.4, 480.2, 390.1, 310.4, 250.6, 160.2, null],
        chargeData: [150.2, 165.4, 210.2, 260.5, 310.4, 340.2, 315.4, 280.6, 240.2, 210.5, 175.4, null],
        dischargeData: [135.0, 150.2, 195.0, 240.1, 290.2, 315.4, 295.0, 260.4, 220.1, 195.0, 160.2, null],
        consumptionData: [380.5, 390.2, 410.4, 440.6, 520.1, 580.4, 590.2, 540.6, 480.2, 430.5, 395.0, null],
        totals: {
          pv: 6889.2,
          inverter: 6889.2,
          acCoupled: 0,
          consumption: 4936.2,
          gridLoadConsumption: 316.7,
          backupLoad: 4619.5,
          smartLoad: 0,
          import: 1313.2,
          export: 3690.4,
          charge: 2843.5,
          discharge: 2601.2,
        },
      };
    }

    // Lifetime
    const labels = ["2024", "2025", "2026"];
    return {
      period: "lifetime",
      periodValue: "Lifetime",
      labels,
      tooltipDates: labels,
      pvData: [1200.5, 4500.2, 6933.9],
      importData: [350.2, 850.4, 1304.5],
      exportData: [550.4, 2400.1, 3810.2],
      chargeData: [420.1, 1950.4, 2980.5],
      dischargeData: [390.5, 1820.2, 2790.4],
      consumptionData: [920.4, 3200.5, 4763.9],
      totals: {
        pv: 6933.9,
        inverter: 6933.9,
        acCoupled: 0,
        consumption: 4763.9,
        gridLoadConsumption: 198.0,
        backupLoad: 4565.9,
        smartLoad: 0,
        import: 1304.5,
        export: 3810.2,
        charge: 2980.5,
        discharge: 2790.4,
      },
    };
  }, []);

  // Load telemetry latest for the house diagram and top indicators
  const loadTelemetry = useCallback(async () => {
    try {
      const res = await fetch(`/api/telemetry/latest?stationId=${selectedPlantId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.telemetry) {
          setTelemetry(data.telemetry);
        }
      }
    } catch (err) {
      console.error("Error loading client telemetry:", err);
    }
  }, [selectedPlantId]);

  // Load Day Curve Data and Day Energy Totals
  const loadDayCurve = useCallback(async () => {
    try {
      const [curveRes, dailyRes] = await Promise.all([
        fetch(
          `/api/telemetry/curve?stationId=${selectedPlantId}&range=day&date=${currentDate}`,
          { cache: "no-store" }
        ),
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

      if (curveRes.ok) {
        const cData = await curveRes.json();
        if (cData.success && cData.chartData && cData.chartData.timeLabels && cData.chartData.timeLabels.length > 0) {
          setDayCurveData(cData.chartData);
          return;
        }
      }
      setDayCurveData(getFallbackDayCurve(currentDate));
    } catch (err) {
      console.error("Error loading day curves:", err);
      setDayCurveData(getFallbackDayCurve(currentDate));
    }
  }, [selectedPlantId, currentDate, getFallbackDayCurve]);

  // Load Month Breakdown Data
  const loadMonthData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/energy/breakdown?stationId=${selectedPlantId}&period=month&date=${currentMonth}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setMonthData(getFallbackBreakdown("Month", currentMonth, currentYear));
        return;
      }
      const data = await res.json();
      if (data.success && data.data && data.data.labels && data.data.labels.length > 0) {
        setMonthData(data.data);
      } else {
        setMonthData(getFallbackBreakdown("Month", currentMonth, currentYear));
      }
    } catch (err) {
      console.error("Error loading month energy:", err);
      setMonthData(getFallbackBreakdown("Month", currentMonth, currentYear));
    }
  }, [selectedPlantId, currentMonth, currentYear, getFallbackBreakdown]);

  // Load Year Breakdown Data
  const loadYearData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/energy/breakdown?stationId=${selectedPlantId}&period=year&date=${currentYear}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setYearData(getFallbackBreakdown("Year", currentMonth, currentYear));
        return;
      }
      const data = await res.json();
      if (data.success && data.data && data.data.labels && data.data.labels.length > 0) {
        setYearData(data.data);
      } else {
        setYearData(getFallbackBreakdown("Year", currentMonth, currentYear));
      }
    } catch (err) {
      console.error("Error loading year energy:", err);
      setYearData(getFallbackBreakdown("Year", currentMonth, currentYear));
    }
  }, [selectedPlantId, currentYear, currentMonth, getFallbackBreakdown]);

  // Load Lifetime Breakdown Data
  const loadLifetimeData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/energy/breakdown?stationId=${selectedPlantId}&period=lifetime`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        setLifetimeData(getFallbackBreakdown("Lifetime", currentMonth, currentYear));
        return;
      }
      const data = await res.json();
      if (data.success && data.data && data.data.labels && data.data.labels.length > 0) {
        setLifetimeData(data.data);
      } else {
        setLifetimeData(getFallbackBreakdown("Lifetime", currentMonth, currentYear));
      }
    } catch (err) {
      console.error("Error loading lifetime energy:", err);
      setLifetimeData(getFallbackBreakdown("Lifetime", currentMonth, currentYear));
    }
  }, [selectedPlantId, currentMonth, currentYear, getFallbackBreakdown]);

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
      console.error("Error loading plant details:", err);
    } finally {
      setIsDetailsLoading(false);
    }
  }, [selectedPlantId]);

  // Combined fetch
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadTelemetry(),
      loadDayCurve(),
      loadMonthData(),
      loadYearData(),
      loadLifetimeData(),
      loadPlantDetails(),
    ]);
    setLoading(false);
  }, [loadTelemetry, loadDayCurve, loadMonthData, loadYearData, loadLifetimeData, loadPlantDetails]);

  useEffect(() => {
    fetchAllData();
    // Auto-refresh telemetry and plant curves from database every 15 seconds
    const interval = setInterval(() => {
      loadTelemetry();
      loadDayCurve();
      loadPlantDetails();
    }, 15_000);
    return () => clearInterval(interval);
  }, [fetchAllData, loadTelemetry, loadDayCurve, loadPlantDetails]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  // Date navigation handlers
  const handlePrevDate = () => {
    if (activeTab === "Day") {
      const [y, m, d] = currentDate.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateObj.setUTCDate(dateObj.getUTCDate() - 1);
      setCurrentDate(dateObj.toISOString().slice(0, 10));
    } else if (activeTab === "Month") {
      const [y, m] = currentMonth.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 2, 1));
      const newY = dateObj.getUTCFullYear();
      const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      setCurrentMonth(`${newY}-${newM}`);
    } else if (activeTab === "Year") {
      const y = Number(currentYear);
      setCurrentYear(String(y - 1));
    }
  };

  const handleNextDate = () => {
    if (activeTab === "Day") {
      const [y, m, d] = currentDate.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d));
      dateObj.setUTCDate(dateObj.getUTCDate() + 1);
      setCurrentDate(dateObj.toISOString().slice(0, 10));
    } else if (activeTab === "Month") {
      const [y, m] = currentMonth.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m, 1));
      const newY = dateObj.getUTCFullYear();
      const newM = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
      setCurrentMonth(`${newY}-${newM}`);
    } else if (activeTab === "Year") {
      const y = Number(currentYear);
      setCurrentYear(String(y + 1));
    }
  };

  // -------------------------------------------------------------
  // ECharts 1: Power Curve (kW line chart with PV, Grid, Battery, Load)
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== "Day" || !powerChartRef.current) return;
    if (powerChartRef.current.clientWidth === 0 || powerChartRef.current.clientHeight === 0) return;

    let chart = echarts.getInstanceByDom(powerChartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(powerChartRef.current);
    }
    powerChartInstance.current = chart;

    const curve =
      dayCurveData && dayCurveData.timeLabels && dayCurveData.timeLabels.length > 0
        ? dayCurveData
        : getFallbackDayCurve(currentDate);

    const timestamps = curve.timeLabels || (curve as any).timestamps || [];
    const solarKw = curve.pvData || (curve as any).solarKw || [];
    const gridKw = curve.gridData || (curve as any).gridKw || [];
    const batKw = curve.batteryData || (curve as any).batteryKw || [];
    const loadKw = curve.loadData || (curve as any).loadKw || [];

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 500,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let s = `<div style="font-weight:600;margin-bottom:4px;color:#334155">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const val = p.value !== null && p.value !== undefined ? Number(p.value).toFixed(2) : "--";
            s += `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0;">
                    <span style="color:${p.color};font-weight:500;">● ${p.seriesName}</span>
                    <span style="font-weight:600;font-family:monospace;">${val} kW</span>
                  </div>`;
          });
          return s;
        },
      },
      grid: {
        top: 20,
        right: 15,
        bottom: 25,
        left: 40,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          interval: (index: number) => index % 24 === 0, // Show every 2 hours
        },
      },
      yAxis: {
        type: "value",
        name: "kW",
        nameLocation: "end",
        nameTextStyle: { color: "#94a3b8", fontSize: 10, padding: [0, 8, 4, 0] },
        splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: [
        ...(visiblePowerSeries.PV ? [{
          name: "PV", type: "line", smooth: true, showSymbol: false, data: solarKw,
          lineStyle: { color: "#eab308", width: 2 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(234, 179, 8, 0.25)" }, { offset: 1, color: "rgba(234, 179, 8, 0.0)" },
          ]) },
        }] : []),
        ...(visiblePowerSeries.Grid ? [{
          name: "Grid", type: "line", smooth: true, showSymbol: false, data: gridKw,
          lineStyle: { color: "#3b82f6", width: 2 },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(59, 130, 246, 0.2)" }, { offset: 1, color: "rgba(59, 130, 246, 0.0)" },
          ]) },
        }] : []),
        ...(visiblePowerSeries.Battery ? [{ name: "Battery", type: "line", smooth: true, showSymbol: false, data: batKw, lineStyle: { color: "#22c55e", width: 2 } }] : []),
        ...(visiblePowerSeries["Total Load"] ? [{ name: "Total Load", type: "line", smooth: true, showSymbol: false, data: loadKw, lineStyle: { color: "#a855f7", width: 2 } }] : []),
      ] as echarts.SeriesOption[],
    };

    chart.setOption(option, true);
    const timer = setTimeout(() => {
      chart.resize();
    }, 50);

    return () => {
      clearTimeout(timer);
      if (powerChartInstance.current && !powerChartInstance.current.isDisposed()) {
        powerChartInstance.current.dispose();
        powerChartInstance.current = null;
      }
    };
  }, [activeTab, dayCurveData, visiblePowerSeries]);

  // -------------------------------------------------------------
  // ECharts 2: Battery SOC & Tariff Curve with "Now" line
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== "Day" || !socChartRef.current) return;
    if (socChartRef.current.clientWidth === 0 || socChartRef.current.clientHeight === 0) return;

    let chart = echarts.getInstanceByDom(socChartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(socChartRef.current);
    }
    socChartInstance.current = chart;

    const curve =
      dayCurveData && dayCurveData.timeLabels && dayCurveData.timeLabels.length > 0
        ? dayCurveData
        : getFallbackDayCurve(currentDate);

    const timestamps = curve.timeLabels || (curve as any).timestamps || [];
    const batterySoc = curve.socData || (curve as any).batterySoc || [];

    // The "Now" vertical marker should ONLY appear when viewing today's live curve
    const isViewingToday = currentDate === getPktDateStr();
    let nowIndex = isViewingToday && curve.currentNowIndex !== undefined ? curve.currentNowIndex : -1;
    if (isViewingToday && nowIndex < 0) {
      for (let i = batterySoc.length - 1; i >= 0; i--) {
        if (batterySoc[i] !== null && batterySoc[i] !== undefined) {
          nowIndex = i;
          break;
        }
      }
    }
    const nowTimeStr = nowIndex >= 0 ? timestamps[nowIndex] : "";

    const purchaseTariff = curve.purchaseTariffData || timestamps.map(() => 38.0);
    const feedInTariff = curve.feedInTariffData || timestamps.map(() => 20.0);

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 500,
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#1e293b", fontSize: 12 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          let s = `<div style="font-weight:600;margin-bottom:4px;color:#334155">${params[0].axisValue}</div>`;
          params.forEach((p: any) => {
            const unit = p.seriesName === "SOC" ? "%" : "PKR/kWh";
            const val = p.value !== null && p.value !== undefined ? Number(p.value).toFixed(2) : "--";
            s += `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0;">
                    <span style="color:${p.color};font-weight:500;">● ${p.seriesName}</span>
                    <span style="font-weight:600;font-family:monospace;">${val} ${unit}</span>
                  </div>`;
          });
          return s;
        },
      },
      grid: {
        top: 20,
        right: 45,
        bottom: 25,
        left: 40,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          interval: (index: number) => index % 24 === 0,
        },
      },
      yAxis: [
        {
          type: "value",
          name: "%",
          min: 0,
          max: 100,
          nameLocation: "end",
          nameTextStyle: { color: "#94a3b8", fontSize: 10, padding: [0, 8, 4, 0] },
          splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
        {
          type: "value",
          name: "PKR/kWh",
          min: 0,
          max: 40,
          nameLocation: "end",
          nameTextStyle: { color: "#94a3b8", fontSize: 10, padding: [0, 0, 4, 8] },
          splitLine: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: "#94a3b8", fontSize: 10 },
        },
      ],
      series: [
        ...(visibleSocSeries.SOC ? [{
          name: "SOC", type: "line", smooth: true, showSymbol: false, data: batterySoc,
          lineStyle: { color: "#22c55e", width: 2 },
          markLine: nowIndex >= 0 ? {
            symbol: "none", silent: true,
            lineStyle: { type: "dashed", color: "#f97316", width: 1.5 },
            label: { show: true, position: "insideEndTop", formatter: "Now", color: "#f97316", fontWeight: 600, fontSize: 11 },
            data: [{ xAxis: nowTimeStr }],
          } : undefined,
        }] : []),
        ...(visibleSocSeries["Purchase Tariff"] ? [{ name: "Purchase Tariff", type: "line", yAxisIndex: 1, showSymbol: false, data: purchaseTariff, lineStyle: { color: "#38bdf8", width: 1.5 } }] : []),
        ...(visibleSocSeries["Feed-in Tariff"] ? [{ name: "Feed-in Tariff", type: "line", yAxisIndex: 1, showSymbol: false, data: feedInTariff, lineStyle: { color: "#2563eb", width: 1.5 } }] : []),
      ] as echarts.SeriesOption[],
    };

    chart.setOption(option, true);
    const timer = setTimeout(() => {
      chart.resize();
    }, 50);

    return () => {
      clearTimeout(timer);
      if (socChartInstance.current && !socChartInstance.current.isDisposed()) {
        socChartInstance.current.dispose();
        socChartInstance.current = null;
      }
    };
  }, [activeTab, dayCurveData, visibleSocSeries]);

  // -------------------------------------------------------------
  // ECharts 3: Grouped Bar Chart for Month, Year, Lifetime
  // -------------------------------------------------------------
  useEffect(() => {
    if (activeTab === "Day" || !barChartRef.current) return;
    if (barChartRef.current.clientWidth === 0 || barChartRef.current.clientHeight === 0) return;

    let chart = echarts.getInstanceByDom(barChartRef.current);
    if (!chart || chart.isDisposed()) {
      chart = echarts.init(barChartRef.current);
    }
    barChartInstance.current = chart;

    let currentDataset: EnergyBreakdownResult | null = null;
    if (activeTab === "Month") currentDataset = monthData;
    else if (activeTab === "Year") currentDataset = yearData;
    else if (activeTab === "Lifetime") currentDataset = lifetimeData;

    if (!currentDataset || !currentDataset.labels || currentDataset.labels.length === 0) {
      currentDataset = getFallbackBreakdown(activeTab as any, currentMonth, currentYear);
    }

    const energySeries = [
      { name: "PV", data: currentDataset.pvData, color: "#facc15" },
      { name: "Import", data: currentDataset.importData, color: "#38bdf8" },
      { name: "Export", data: currentDataset.exportData, color: "#2563eb" },
      { name: "Charge", data: currentDataset.chargeData, color: "#10b981" },
      { name: "Discharge", data: currentDataset.dischargeData, color: "#34d399" },
      { name: "Consumption", data: currentDataset.consumptionData, color: "#8b5cf6" },
    ] as const;

    const option: echarts.EChartsOption = {
      animation: true,
      animationDuration: 600,
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
          shadowStyle: { color: "rgba(250, 204, 21, 0.08)" },
        },
        padding: 0,
        borderWidth: 0,
        backgroundColor: "transparent",
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return "";
          const dataIndex = params[0].dataIndex;
          const headerDate = currentDataset?.tooltipDates[dataIndex] || params[0].axisValue;

          let rowsHtml = "";
          params.forEach((item: any) => {
            const val = item.value !== null && item.value !== undefined ? item.value : 0;
            rowsHtml += `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px; font-size: 11px;">
                <div style="display: flex; align-items: center; gap: 6px; color: #475569;">
                  <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: ${item.color};"></span>
                  <span style="font-weight: 500;">${item.seriesName}</span>
                </div>
                <div style="font-weight: 700; color: #0f172a; margin-left: 18px; font-family: monospace;">
                  ${val} kWh
                </div>
              </div>
            `;
          });

          return `
            <div style="min-width: 180px; padding: 10px 12px; background: #ffffff; border-radius: 10px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.06); border: 1px solid #f1f5f9; font-family: system-ui, sans-serif;">
              <div style="font-weight: 600; color: #1e293b; font-size: 12px; margin-bottom: 5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                ${headerDate}
              </div>
              ${rowsHtml}
            </div>
          `;
        },
      },
      grid: {
        top: 25,
        right: 15,
        bottom: 25,
        left: 45,
      },
      xAxis: {
        type: "category",
        data: currentDataset.labels,
        axisLine: { lineStyle: { color: "#e2e8f0" } },
        axisTick: { show: false },
        axisLabel: {
          color: "#94a3b8",
          fontSize: 10,
          fontFamily: "monospace",
        },
      },
      yAxis: {
        type: "value",
        name: "kWh",
        nameLocation: "end",
        nameTextStyle: { color: "#94a3b8", fontSize: 10, align: "right", padding: [0, 8, 4, 0] },
        splitLine: { lineStyle: { type: "dashed", color: "#f1f5f9" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#94a3b8", fontSize: 10 },
      },
      series: energySeries
        .filter((series) => visibleEnergySeries[series.name as keyof typeof visibleEnergySeries])
        .map((series) => ({
          name: series.name,
          type: "bar" as const,
          data: series.data,
          itemStyle: { color: series.color, borderRadius: [2, 2, 0, 0] },
          barMaxWidth: activeTab === "Year" ? 10 : 6,
          barGap: "20%",
        })),
    };

    chart.setOption(option, true);
    const timer1 = setTimeout(() => {
      chart.resize();
    }, 50);
    const timer2 = setTimeout(() => {
      chart.resize();
    }, 250);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (barChartInstance.current && !barChartInstance.current.isDisposed()) {
        barChartInstance.current.dispose();
        barChartInstance.current = null;
      }
    };
  }, [activeTab, monthData, yearData, lifetimeData, currentMonth, currentYear, visibleEnergySeries]);

  // Window & ResizeObserver resize handling
  useEffect(() => {
    const handleResize = () => {
      powerChartInstance.current?.resize();
      socChartInstance.current?.resize();
      barChartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, [activeTab]);

  // Active totals based on selected tab
  const getDisplayTotals = () => {
    if (activeTab === "Month") {
      return (
        monthData?.totals || {
          pv: 1400,
          inverter: 1400,
          acCoupled: 0,
          consumption: 899.6,
          gridLoadConsumption: 118.2,
          backupLoad: 781.4,
          smartLoad: 0,
          import: 160.2,
        }
      );
    }
    if (activeTab === "Year") {
      return (
        yearData?.totals || {
          pv: 6889.2,
          inverter: 6889.2,
          acCoupled: 0,
          consumption: 4936.2,
          gridLoadConsumption: 316.7,
          backupLoad: 4619.5,
          smartLoad: 0,
          import: 1313.2,
        }
      );
    }
    if (activeTab === "Lifetime") {
      return (
        lifetimeData?.totals || {
          pv: 6933.9,
          inverter: 6933.9,
          acCoupled: 0,
          consumption: 4763.9,
          gridLoadConsumption: 198.0,
          backupLoad: 4565.9,
          smartLoad: 0,
          import: 1304.5,
        }
      );
    }
    // Day view totals: Live database values from solis_daily_energy or curve integration
    if (dayDailyEnergy) {
      const pvVal = Number(dayDailyEnergy.solar_pv_kwh || 0);
      const consVal = Number(dayDailyEnergy.house_load_kwh || 0);
      const gridLoadVal = Number(dayDailyEnergy.grid_purchased_kwh || 0);
      const backupVal = Number(
        dayDailyEnergy.backup_load_kwh || (consVal > gridLoadVal ? consVal - gridLoadVal : 0)
      );
      return {
        pv: Number(pvVal.toFixed(2)),
        inverter: Number(pvVal.toFixed(2)),
        acCoupled: 0,
        consumption: Number(consVal.toFixed(2)),
        gridLoadConsumption: Number(gridLoadVal.toFixed(2)),
        backupLoad: Number(backupVal.toFixed(2)),
        charge: Number(Number(dayDailyEnergy.battery_charge_kwh || 0).toFixed(2)),
        discharge: Number(Number(dayDailyEnergy.battery_discharge_kwh || 0).toFixed(2)),
        export: Number(Number(dayDailyEnergy.grid_sold_kwh || 0).toFixed(2)),
      };
    }

    // If no direct daily energy row, integrate from 5-min curve points
    if (dayCurveData && dayCurveData.pvData && dayCurveData.pvData.length > 0) {
      const pvSum = dayCurveData.pvData.reduce(
        (acc: number, v: number | null) => acc + (Number(v) || 0) * (5 / 60),
        0
      );
      const loadSum = (dayCurveData.loadData || []).reduce(
        (acc: number, v: number | null) => acc + (Number(v) || 0) * (5 / 60),
        0
      );
      const gridSum = (dayCurveData.gridData || []).reduce(
        (acc: number, v: number | null) => {
          const val = Number(v) || 0;
          return val > 0 ? acc + val * (5 / 60) : acc;
        },
        0
      );
      const pvRound = Number(pvSum.toFixed(2));
      const loadRound = Number(loadSum.toFixed(2));
      const gridRound = Number(gridSum.toFixed(2));
      return {
        pv: pvRound,
        inverter: pvRound,
        acCoupled: 0,
        consumption: loadRound,
        gridLoadConsumption: gridRound,
        backupLoad: Number(Math.max(0, loadRound - gridRound).toFixed(2)),
        charge: 0,
        discharge: 0,
        export: 0,
      };
    }

    return {
      pv: 0,
      inverter: 0,
      acCoupled: 0,
      consumption: 0,
      gridLoadConsumption: 0,
      backupLoad: 0,
      charge: 0,
      discharge: 0,
      export: 0,
    };
  };

  const totals = getDisplayTotals();

  // Date picker display text
  const getDateDisplayString = () => {
    if (activeTab === "Day") {
      const [y, m, d] = currentDate.split("-");
      return `${d}/${m}/${y}`;
    }
    if (activeTab === "Month") {
      const [y, m] = currentMonth.split("-");
      return `${m}/${y}`;
    }
    if (activeTab === "Year") {
      return currentYear;
    }
    return "Lifetime";
  };

  // Determine the latest real curve data point if available (matches the graph's latest point)
  const latestCurveIdx = (() => {
    if (!dayCurveData || !dayCurveData.timeLabels || dayCurveData.timeLabels.length === 0) return -1;
    if (dayCurveData.currentNowIndex !== undefined && dayCurveData.currentNowIndex >= 0) {
      return dayCurveData.currentNowIndex;
    }
    const pvs = dayCurveData.pvData || [];
    for (let i = pvs.length - 1; i >= 0; i--) {
      if (pvs[i] !== null && pvs[i] !== undefined) return i;
    }
    return -1;
  })();

  const curvePv = latestCurveIdx >= 0 && dayCurveData?.pvData ? Number(dayCurveData.pvData[latestCurveIdx] || 0) : null;
  const curveLoad = latestCurveIdx >= 0 && dayCurveData?.loadData ? Number(dayCurveData.loadData[latestCurveIdx] || 0) : null;
  const curveBat = latestCurveIdx >= 0 && dayCurveData?.batteryData ? Number(dayCurveData.batteryData[latestCurveIdx] || 0) : null;
  const curveGrid = latestCurveIdx >= 0 && dayCurveData?.gridData ? Number(dayCurveData.gridData[latestCurveIdx] || 0) : null;
  const curveSoc = latestCurveIdx >= 0 && dayCurveData?.socData ? Number(dayCurveData.socData[latestCurveIdx] || 0) : null;

  // Live telemetry metrics for the 3D House - seamlessly synchronized with live curve graph data
  const liveSolar = telemetry && telemetry.solar_power_kw !== undefined && telemetry.solar_power_kw !== null
    ? Number(telemetry.solar_power_kw)
    : (curvePv !== null ? curvePv : 0);

  const liveLoad = telemetry && telemetry.load_power_kw !== undefined && telemetry.load_power_kw !== null
    ? Number(telemetry.load_power_kw)
    : (curveLoad !== null ? curveLoad : 0);

  const liveBatterySoc = telemetry && telemetry.battery_soc !== undefined && telemetry.battery_soc !== null
    ? Number(telemetry.battery_soc)
    : (curveSoc !== null ? curveSoc : 100);

  const liveBatteryKw = telemetry && telemetry.battery_power_kw !== undefined && telemetry.battery_power_kw !== null
    ? Number(telemetry.battery_power_kw)
    : (curveBat !== null ? curveBat : 0);

  const liveBatteryState = telemetry?.battery_direction
    ? telemetry.battery_direction
    : (liveBatteryKw > 0 ? "Charging" : liveBatteryKw < 0 ? "Discharging" : "Idle");

  const liveGridKw = telemetry && telemetry.grid_power_kw !== undefined && telemetry.grid_power_kw !== null
    ? Number(telemetry.grid_power_kw)
    : (curveGrid !== null ? curveGrid : 0);

  // Live daily yield, charge, and discharge (synchronized with plant overview & real-time telemetry)
  const isViewingToday = currentDate === getPktDateStr();
  const rawData = (telemetry as any)?.raw_data;
  const liveDailyYield = isViewingToday && rawData?.dayEnergy !== undefined && rawData?.dayEnergy !== null
    ? Number(rawData.dayEnergy)
    : Number(totals.pv || 0);

  const liveDailyCharge = isViewingToday && rawData?.batteryTodayChargeEnergy !== undefined && rawData?.batteryTodayChargeEnergy !== null
    ? Number(rawData.batteryTodayChargeEnergy)
    : Number(totals.charge || 0);

  const liveDailyDischarge = isViewingToday && rawData?.batteryTodayDischargeEnergy !== undefined && rawData?.batteryTodayDischargeEnergy !== null
    ? Number(rawData.batteryTodayDischargeEnergy)
    : (isViewingToday && rawData?.batteryDischargeEnergy !== undefined && rawData?.batteryDischargeEnergy !== null
      ? Number(rawData.batteryDischargeEnergy)
      : Number(totals.discharge || 0));

  const subnavItems = ["Overview", "Layout", "Info", "Device", "Alarm", "Alert"];

  return (
    <div className="flex flex-col space-y-4">
      {/* ======================================================== */}
      {/* 1. TOP HEADER: Status, Plant Name, Time & Actions         */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-2xs px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Info Badge, Plant Name, Header Icons & Metadata */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onBackToOverview}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold text-slate-600 bg-gray-50 hover:bg-emerald-50 hover:text-[#10b981] border border-gray-200 transition-colors shadow-2xs mr-1"
              title="Return to Plant Overview Table"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            {/* Light Green Info Pill Badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              Info
            </span>

            {/* Plant Name with Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPlantDropdownOpen(!isPlantDropdownOpen)}
                className="flex items-center gap-1.5 text-base sm:text-lg font-bold text-slate-900 hover:text-[#10b981] transition-colors"
              >
                <span>{plantMeta.name}</span>
                {plantMeta.guestSuffix && (
                  <span className="text-slate-400 font-normal text-sm">{plantMeta.guestSuffix}</span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* Dropdown Menu to switch plants */}
              {isPlantDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-gray-100">
                    Select Plant
                  </div>
                  {plantsList.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPlant(p.id);
                        setIsPlantDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 transition-colors ${p.id === selectedPlantId
                          ? "text-[#10b981] font-bold bg-emerald-50/50"
                          : "text-slate-700 font-medium"
                        }`}
                    >
                      <span>{p.name}</span>
                      <span className="text-[11px] text-slate-400">{p.capacityKwp} kWp</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Action Circular Buttons */}
            <div className="flex items-center gap-1 text-slate-400 ml-1">
              <button
                onClick={handleManualRefresh}
                className="w-7 h-7 rounded-full hover:text-slate-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
                title="Refresh Client Data"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#10b981]" : ""}`} />
              </button>
              <button
                className="w-7 h-7 rounded-full hover:text-[#10b981] hover:bg-emerald-50 flex items-center justify-center transition-colors"
                title="Add to Favorites"
              >
                <Heart className="w-3.5 h-3.5" />
              </button>
              <button
                className="w-7 h-7 rounded-full hover:text-slate-700 hover:bg-gray-100 flex items-center justify-center transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Plant Metadata Subtitle Line */}
          <div className="flex items-center gap-2 text-xs text-slate-500 pl-0.5">
            <span className="font-semibold text-slate-600 font-mono">ID: {plantMeta.displayId || "32F429"}</span>
            <span>|</span>
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatPktDisplayTime()}</span>
              <span className="text-slate-500 font-medium ml-1">4Min Ago</span>
            </div>
          </div>
        </div>

        {/* Right: Modify Information Button */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsModifyModalOpen(true)}
            className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-slate-700 hover:text-slate-900 font-medium rounded-lg text-xs shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Modify Information"
          >
            <span>Modify Information</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUB-NAVIGATION PILLS: Overview, Layout, Info...        */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-gray-200/80 pb-2 px-1 overflow-x-auto text-xs">
        {subnavItems.map((item) => (
          <button
            key={item}
            onClick={() => setActiveSubnav(item)}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeSubnav === item
                ? item === "Overview" || item === "Layout"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold shadow-2xs"
                  : "bg-emerald-50 text-[#10b981] border border-emerald-300 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-gray-100/70"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN DASHBOARD BODY (BY ACTIVE SUBNAV)                 */}
      {/* ======================================================== */}
      {activeSubnav === "Overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* ====================================================== */}
          {/* LEFT COLUMN: 3D Villa House & Operating Data (8 cols)  */}
          {/* ====================================================== */}
          <div className="lg:col-span-8 space-y-4">
            {/* Card 1: 3D Villa House Power Flow Diagram */}
            <SolisHousePowerFlow
              solarKw={liveSolar}
              loadKw={liveLoad}
              batterySoc={liveBatterySoc}
              batteryKw={liveBatteryKw}
              batteryState={liveBatteryState}
              gridKw={liveGridKw}
              dailyYieldKwh={liveDailyYield}
              dailyChargeKwh={liveDailyCharge}
              dailyDischargeKwh={liveDailyDischarge}
            />

            {/* Card 2: Operating Data Container */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4 sm:p-5">
              {/* Header: Title, Date Picker, Granularity Tabs, Icons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Operating Data</h3>

                  {/* Date Navigator */}
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-md p-0.5 text-xs">
                    <button
                      onClick={handlePrevDate}
                      className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors"
                      title="Previous"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 py-0.5 font-semibold text-slate-700 font-mono text-[11px]">
                      {getDateDisplayString()}
                    </span>
                    <button
                      onClick={handleNextDate}
                      className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded transition-colors"
                      title="Next"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Granularity Tabs & Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60 text-xs">
                    {(["Day", "Month", "Year", "Lifetime"] as const).map((tab) => (
                      <button
                        key={tab}
                        data-tab={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === tab
                            ? "bg-white text-emerald-600 font-semibold shadow-2xs border border-emerald-200"
                            : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 pl-1">
                    <button
                      className="p-1.5 hover:text-slate-700 hover:bg-gray-100 rounded-md transition-colors"
                      title="Filter options"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="p-1.5 hover:text-slate-700 hover:bg-gray-100 rounded-md transition-colors"
                      title="Export Data"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Metric KPI Cards */}
              {activeTab === "Day" ? (
                /* 6 Cards for Day View (2 rows of 3) */
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.pv} <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">PV</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.inverter} <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">Inverter</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.acCoupled}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">AC Coupled</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.consumption}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      Daily Consumption
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.gridLoadConsumption}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      Daily Grid Load
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono">
                      {totals.backupLoad}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      Daily Backup Load
                    </div>
                  </div>
                </div>
              ) : (
                /* 8 Cards for Month, Year, Lifetime (2 rows of 4) */
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.pv} <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">PV</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.inverter}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">Inverter</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.acCoupled}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">AC Coupled</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.consumption}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      {activeTab === "Year"
                        ? "Annual Consumption"
                        : activeTab === "Month"
                          ? "Monthly Consumption"
                          : "Total Consumption"}
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.gridLoadConsumption}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      {activeTab === "Year"
                        ? "Annual Grid Load Consumption"
                        : activeTab === "Month"
                          ? "Monthly Grid Load Consumption"
                          : "Grid Load Consumption"}
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.backupLoad}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      {activeTab === "Year"
                        ? "Annual Backup Load"
                        : activeTab === "Month"
                          ? "Monthly Backup Load"
                          : "Backup Load"}
                    </div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.smartLoad || 0}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">Smart Load</div>
                  </div>

                  <div className="bg-[#f8fafc] border border-slate-100 rounded-xl p-3">
                    <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                      {totals.import}{" "}
                      <span className="text-xs font-semibold text-slate-500">kWh</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-1">
                      {activeTab === "Year"
                        ? "Annual Import"
                        : activeTab === "Month"
                          ? "Monthly Import"
                          : "Total Import"}
                    </div>
                  </div>
                </div>
              )}

              {/* Chart Area: Strictly conditional per activeTab */}
              {activeTab === "Day" && (
                /* DUAL LINE CHARTS FOR DAY */
                <div key="day-charts-wrapper" className="space-y-4 pt-2">
                  {/* 1. Power Curve */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap">
                        {[
                          { key: "PV" as const, color: "#eab308" },
                          { key: "Grid" as const, color: "#3b82f6" },
                          { key: "Battery" as const, color: "#22c55e" },
                          { key: "Total Load" as const, color: "#a855f7" },
                        ].map((item) => (
                          <button key={item.key} type="button" aria-pressed={visiblePowerSeries[item.key]} onClick={() => setVisiblePowerSeries((state) => ({ ...state, [item.key]: !state[item.key] }))} className={`flex items-center gap-1.5 ${visiblePowerSeries[item.key] ? "text-slate-600" : "text-slate-400 line-through"}`}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: visiblePowerSeries[item.key] ? 1 : 0.35 }} />{item.key}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={loadDayCurve}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Refresh curve"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div ref={powerChartRef} className="w-full h-[220px]" />
                  </div>

                  {/* 2. Battery SOC & Tariff Curve */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4 text-xs font-medium text-slate-600 flex-wrap">
                        {[
                          { key: "SOC" as const, color: "#22c55e" },
                          { key: "Purchase Tariff" as const, color: "#38bdf8" },
                          { key: "Feed-in Tariff" as const, color: "#2563eb" },
                        ].map((item) => (
                          <button key={item.key} type="button" aria-pressed={visibleSocSeries[item.key]} onClick={() => setVisibleSocSeries((state) => ({ ...state, [item.key]: !state[item.key] }))} className={`flex items-center gap-1.5 ${visibleSocSeries[item.key] ? "text-slate-600" : "text-slate-400 line-through"}`}>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: visibleSocSeries[item.key] ? 1 : 0.35 }} />{item.key}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={loadDayCurve}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Refresh curve"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div ref={socChartRef} className="w-full h-[200px]" />
                  </div>
                </div>
              )}

              {activeTab !== "Day" && (
                /* GROUPED BAR CHART FOR MONTH / YEAR / LIFETIME */
                <div key="bar-chart-container" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3.5 text-xs font-medium text-slate-600 flex-wrap">
                      {[
                        { key: "PV" as const, color: "#facc15" },
                        { key: "Import" as const, color: "#38bdf8" },
                        { key: "Export" as const, color: "#2563eb" },
                        { key: "Charge" as const, color: "#10b981" },
                        { key: "Discharge" as const, color: "#34d399" },
                        { key: "Consumption" as const, color: "#8b5cf6" },
                      ].map((item) => (
                        <button key={item.key} type="button" aria-pressed={visibleEnergySeries[item.key]} onClick={() => setVisibleEnergySeries((state) => ({ ...state, [item.key]: !state[item.key] }))} className={`flex items-center gap-1.5 ${visibleEnergySeries[item.key] ? "text-slate-600" : "text-slate-400 line-through"}`}>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color, opacity: visibleEnergySeries[item.key] ? 1 : 0.35 }} />{item.key}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (activeTab === "Month") loadMonthData();
                        else if (activeTab === "Year") loadYearData();
                        else loadLifetimeData();
                      }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title="Refresh bar chart"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div ref={barChartRef} className="w-full h-[320px]" />
                </div>
              )}
            </div>
          </div>

          {/* ====================================================== */}
          {/* RIGHT COLUMN: Battery, Plant Info, Weather, Benefits   */}
          {/* ====================================================== */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: Battery Segment Bar */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">Battery</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {liveBatterySoc}%
                </span>
              </div>
              {/* 10 Segmented Green Bars */}
              <div className="grid grid-cols-10 gap-1.5">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const filled = (idx + 1) * 10 <= liveBatterySoc;
                  return (
                    <div
                      key={idx}
                      className={`h-3 rounded-xs transition-all ${filled ? "bg-emerald-500 shadow-2xs" : "bg-gray-100"
                        }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Card 2: Plant Information */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>Plant Information</span>
                  <span className="text-slate-400">&gt;</span>
                </span>
              </div>

              {/* Photo with GPS Chip Overlay */}
              <div className="relative rounded-xl overflow-hidden h-36 bg-slate-100 border border-slate-200/60 mb-3.5">
                <Image
                  src="/solis/STATION_default_normal.png"
                  alt="Plant Solar Rooftop"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md flex items-center gap-1">
                  <span>◬</span>
                  <span>{plantMeta.gps}</span>
                </div>
              </div>

              {/* Key-Value List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-slate-400">Plant Name</span>
                  <span className="font-semibold text-slate-800">{plantMeta.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-slate-400">Owner</span>
                  <span className="font-medium text-slate-700">{plantMeta.owner}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-slate-400">Status</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-slate-400">PV Capacity</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {plantMeta.capacityKwp}kWp
                  </span>
                </div>
                <div className="flex flex-col py-1">
                  <span className="text-slate-400 text-[11px] mb-0.5">Plant Address</span>
                  <span className="text-slate-700 leading-tight text-[11px]">
                    {plantMeta.address}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Weather */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">Weather</span>
              </div>

              {/* 4-Day Forecast Row */}
              <div className="grid grid-cols-4 gap-2 text-center pb-3 border-b border-gray-100">
                {["11.16", "11.17", "11.18", "Today"].map((day, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <span className="text-[11px] text-slate-500 font-medium mb-1">{day}</span>
                    <div className="w-9 h-9 flex items-center justify-center text-[#10b981]">
                      <Sun className="w-7 h-7 fill-orange-400 text-[#10b981] drop-shadow-xs" />
                    </div>
                  </div>
                ))}
              </div>

              {/* 2x2 Weather Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Temperature</span>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">
                    {plantMeta.temp}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Sunrise/Sunset</span>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">
                    {plantMeta.sunriseSunset}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Wind</span>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">
                    {plantMeta.wind}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Humidity</span>
                  <div className="font-semibold text-slate-800 text-sm mt-0.5">
                    {plantMeta.humidity}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Environmental Benefits */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-800">Environmental Benefits</span>
              </div>

              <div className="space-y-4">
                {/* Trees */}
                <div className="relative overflow-hidden flex flex-col justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-100 min-h-[96px]">
                  <div className="z-10">
                    <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                      {plantMeta.trees.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      Equivalent Trees
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-28 h-28 pointer-events-none select-none">
                    <Image
                      src="/solis/tree-Bt0ZdeGH.png"
                      alt="Trees"
                      fill
                      className="object-contain object-bottom-right"
                      unoptimized
                    />
                  </div>
                </div>

                {/* CO2 Reduced */}
                <div className="relative overflow-hidden flex flex-col justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-100 min-h-[96px]">
                  <div className="z-10">
                    <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                      {plantMeta.co2Tons.toFixed(2)} <span className="text-sm font-normal text-slate-700">t</span>
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      CO₂ Reduced
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-28 h-28 pointer-events-none select-none">
                    <Image
                      src="/solis/cloud-DwomYkkV.png"
                      alt="CO2"
                      fill
                      className="object-contain object-bottom-right"
                      unoptimized
                    />
                  </div>
                </div>

                {/* Coal Saved */}
                <div className="relative overflow-hidden flex flex-col justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-100 min-h-[96px]">
                  <div className="z-10">
                    <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                      {plantMeta.coalTons.toFixed(2)} <span className="text-sm font-normal text-slate-700">t</span>
                    </div>
                    <div className="text-xs text-slate-500 font-normal mt-0.5">Coal Saved</div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-28 h-28 pointer-events-none select-none">
                    <Image
                      src="/solis/carbon-CeHwfZ7r.png"
                      alt="Coal"
                      fill
                      className="object-contain object-bottom-right"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* Card 2: Layout Tab (Single Line Diagram) */}
          {activeSubnav === "Layout" && (
            <SolisLayoutTab plantName={plantMeta.name} capacityKwp={plantMeta.capacityKwp} />
          )}

          {/* Card 3: Info Tab (Full Station & Owner Specifications) */}
          {activeSubnav === "Info" && (
            <SolisPlantInfoTab info={plantDetailsData?.plantInfo} isLoading={isDetailsLoading} />
          )}

          {/* Card 4: Device Tab (Inverter, Battery, Datalogger, Meter) */}
          {activeSubnav === "Device" && (
            <SolisDevicesTab
              devices={plantDetailsData?.devices}
              isLoading={isDetailsLoading}
              onSelectPlantByName={(name) => {
                const match = plantsList.find((p) => p.name.toLowerCase() === name.toLowerCase());
                if (match) onSelectPlant(match.id);
              }}
            />
          )}

          {/* Full Page Alarm/Alert Details View if drilled in */}
          {activeAlarmDetail ? (
            <SolisAlarmDetailsView
              alarm={activeAlarmDetail}
              onBack={() => setActiveAlarmDetail(null)}
              onSelectPlantByName={(name) => {
                const match = plantsList.find((p) => p.name.toLowerCase() === name.toLowerCase());
                if (match) onSelectPlant(match.id);
                setActiveAlarmDetail(null);
              }}
              onSelectDevice={(sn) => {
                setActiveSubnav("Device");
                setActiveAlarmDetail(null);
              }}
            />
          ) : (
            <>
              {/* Card 5: Alarm Tab (SolisCloud Fault & Recovery Audit) */}
              {activeSubnav === "Alarm" && (
                <SolisAlarmsTab
                  alarmsData={plantDetailsData?.alarms}
                  isLoading={isDetailsLoading}
                  onViewDevice={(sn) => {
                    setActiveSubnav("Device");
                  }}
                  onViewAlarmDetail={(alarm) => {
                    setActiveAlarmDetail(alarm);
                  }}
                />
              )}

              {/* Card 6: Alert Tab (Operational & Diagnostic Notifications) */}
              {activeSubnav === "Alert" && (
                <SolisAlertsTab
                  alertsData={plantDetailsData?.alerts}
                  isLoading={isDetailsLoading}
                  onViewDevice={(sn) => {
                    setActiveSubnav("Device");
                  }}
                  onViewAlarmDetail={(alarm) => {
                    setActiveAlarmDetail(alarm);
                  }}
                />
              )}
            </>
          )}

      {/* Modify Information Modal */}
      <SolisModifyPlantModal
        isOpen={isModifyModalOpen}
        onClose={() => setIsModifyModalOpen(false)}
        plantInfo={plantDetailsData?.plantInfo}
        onSave={(updated) => {
          setPlantDetailsData((prev: any) => ({ ...prev, plantInfo: updated }));
        }}
      />
    </div>
  );
}
