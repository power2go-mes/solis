"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  RotateCcw,
  Search,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import SolisInverterDetailsView from "./SolisInverterDetailsView";
import SolisBatteryDetailsView from "./SolisBatteryDetailsView";
import SolisMeterDetailsView from "./SolisMeterDetailsView";

export interface DeviceInverterItem {
  status: "Online" | "Offline" | "Warning" | "Alarm";
  name: string;
  sn: string;
  ratedPowerKw: number;
  powerKw: number;
  dailyYieldKwh: number;
  totalYieldMwh: number;
  plantName: string;
  plantId: string;
  warrantyExpiry: string;
  updateTime: string;
  commissioningDate: string;
}

export interface DeviceBatteryItem {
  status: "Online" | "Offline";
  name: string;
  sn: string;
  model: string;
  capacityKwh: number;
  socPercent: number;
  powerKw: number;
  voltageV: number;
  temperatureC: number;
  plantName: string;
  plantId: string;
  warrantyExpiry: string;
}

export interface DeviceDataloggerItem {
  status: "Online" | "Offline";
  name: string;
  sn: string;
  model: string;
  signalStrength: string;
  plantName: string;
  plantId: string;
  updateTime: string;
}

export interface DeviceMeterItem {
  status: "Online" | "Offline";
  name: string;
  sn: string;
  model: string;
  dailyImportKwh: number;
  dailyExportKwh: number;
  powerKw: number;
  voltageV: number;
  currentA: number;
  plantName: string;
  plantId: string;
  updateTime: string;
}

interface SolisDeviceOverviewPageProps {
  onSelectPlant?: (plantId: string) => void;
  onSelectPlantByName?: (plantName: string) => void;
  onSelectInverter?: (sn: string) => void;
  onSelectBattery?: (sn: string) => void;
  onSelectMeter?: (sn: string) => void;
}

type DeviceCategoryTab =
  | "Inverter"
  | "Battery"
  | "Datalogger"
  | "EPM"
  | "Grid Cabinet"
  | "Weather Station"
  | "Meter";

// Exact inverters from SolisCloud reference UI (media_1795195322999_3fbd10a1.jpg)
const INITIAL_INVERTERS: DeviceInverterItem[] = [
  {
    status: "Online",
    name: "Inverter",
    sn: "1053050259280019",
    ratedPowerKw: 30,
    powerKw: 0,
    dailyYieldKwh: 97.6,
    totalYieldMwh: 3.839,
    plantName: "36 Chenab",
    plantId: "1298491919450873747",
    warrantyExpiry: "01/09/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "01/09/2023 12:00:00",
  },
  {
    status: "Online",
    name: "OPL Residence",
    sn: "1053050258110159",
    ratedPowerKw: 50,
    powerKw: 0,
    dailyYieldKwh: 235.4,
    totalYieldMwh: 7.542,
    plantName: "OPL Residence",
    plantId: "1298491919450958553",
    warrantyExpiry: "09/09/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "09/09/2023 12:00:00",
  },
  {
    status: "Online",
    name: "Inverter",
    sn: "1053050258180057",
    ratedPowerKw: 50,
    powerKw: 0,
    dailyYieldKwh: 242.3,
    totalYieldMwh: 25.492,
    plantName: "Menu Karachi Office",
    plantId: "1298491919450797504",
    warrantyExpiry: "15/06/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "15/06/2023 12:00:00",
  },
  {
    status: "Online",
    name: "Inverter",
    sn: "1053050258180112",
    ratedPowerKw: 50,
    powerKw: 0,
    dailyYieldKwh: 81.1,
    totalYieldMwh: 0.081,
    plantName: "Towfiq chinoy",
    plantId: "1298491919451014032",
    warrantyExpiry: "10/08/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "10/08/2023 12:00:00",
  },
  {
    status: "Online",
    name: "Inverter",
    sn: "1053050258140015",
    ratedPowerKw: 50,
    powerKw: 0,
    dailyYieldKwh: 106.6,
    totalYieldMwh: 4.674,
    plantName: "Menu Karachi Office",
    plantId: "1298491919450797504",
    warrantyExpiry: "10/08/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "10/08/2023 12:00:00",
  },
  {
    status: "Online",
    name: "Inverter",
    sn: "1031731257050184",
    ratedPowerKw: 6,
    powerKw: 0,
    dailyYieldKwh: 0,
    totalYieldMwh: 0,
    plantName: "P2G 1ST 6KW",
    plantId: "1298491919451014035",
    warrantyExpiry: "04/12/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "04/12/2023 12:00:00",
  },
  {
    status: "Offline",
    name: "Inverter",
    sn: "1033161256090193",
    ratedPowerKw: 20,
    powerKw: 0,
    dailyYieldKwh: 0,
    totalYieldMwh: 0,
    plantName: "P2G 20kW",
    plantId: "1298491919450851319",
    warrantyExpiry: "31/12/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "31/12/2023 12:00:00",
  },
  {
    status: "Warning",
    name: "Inverter",
    sn: "1053050255210107",
    ratedPowerKw: 50,
    powerKw: 0,
    dailyYieldKwh: 109.5,
    totalYieldMwh: 9.336,
    plantName: "P2G 50KW",
    plantId: "1298491919450740581",
    warrantyExpiry: "23/11/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "23/11/2023 12:00:00",
  },
  {
    status: "Offline",
    name: "Solis 15kw",
    sn: "1033320253150969",
    ratedPowerKw: 15,
    powerKw: 0,
    dailyYieldKwh: 0,
    totalYieldMwh: 0,
    plantName: "P2G 15KW",
    plantId: "1298491919450734544",
    warrantyExpiry: "27/10/2028",
    updateTime: "20/11/2026 12:51:24 (UTC+05:00)",
    commissioningDate: "27/10/2023 12:00:00",
  },
];

// 11 Batteries matching SolisCloud telemetry (8 Online, 0 Alarm, 3 Offline)
const INITIAL_BATTERIES: DeviceBatteryItem[] = [
  {
    status: "Online",
    name: "Battery (Master)",
    sn: "1053050255210107BAT01",
    model: "BYD B-Box Pro 13.8",
    capacityKwh: 50,
    socPercent: 100,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 25,
    plantName: "P2G 50KW",
    plantId: "1298491919450873747",
    warrantyExpiry: "23/11/2033",
  },
  {
    status: "Online",
    name: "Battery (Slave 1)",
    sn: "1053050255210107BAT02",
    model: "BYD B-Box Pro 13.8",
    capacityKwh: 50,
    socPercent: 100,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 24,
    plantName: "P2G 50KW",
    plantId: "1298491919450873747",
    warrantyExpiry: "23/11/2033",
  },
  {
    status: "Online",
    name: "Battery Pack A",
    sn: "1053050258110159BAT01",
    model: "Solis HV Storage Pack",
    capacityKwh: 50,
    socPercent: 100,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 26,
    plantName: "OPL Residence",
    plantId: "1298491919451014034",
    warrantyExpiry: "09/09/2033",
  },
  {
    status: "Online",
    name: "Battery Pack B",
    sn: "1053050258110159BAT02",
    model: "Solis HV Storage Pack",
    capacityKwh: 50,
    socPercent: 100,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 25,
    plantName: "OPL Residence",
    plantId: "1298491919451014034",
    warrantyExpiry: "09/09/2033",
  },
  {
    status: "Online",
    name: "Storage Battery",
    sn: "1053050258180112BAT01",
    model: "Solis Lithium LFP",
    capacityKwh: 50,
    socPercent: 98,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 27,
    plantName: "Towfiq chinoy",
    plantId: "1298491919451014030",
    warrantyExpiry: "10/08/2033",
  },
  {
    status: "Online",
    name: "Battery Tower 1",
    sn: "1053050258180057BAT01",
    model: "Solis Lithium LFP",
    capacityKwh: 50,
    socPercent: 95,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 28,
    plantName: "Menu Karachi Office",
    plantId: "1298491919451014033",
    warrantyExpiry: "15/06/2033",
  },
  {
    status: "Online",
    name: "Battery Tower 2",
    sn: "1053050258180057BAT02",
    model: "Solis Lithium LFP",
    capacityKwh: 50,
    socPercent: 95,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 27,
    plantName: "Menu Karachi Office",
    plantId: "1298491919451014033",
    warrantyExpiry: "15/06/2033",
  },
  {
    status: "Online",
    name: "Battery Bank",
    sn: "1053050259280019BAT01",
    model: "Solis High Voltage LFP",
    capacityKwh: 30,
    socPercent: 100,
    powerKw: 0,
    voltageV: 51.2,
    temperatureC: 23,
    plantName: "36 Chenab",
    plantId: "1298491919451014032",
    warrantyExpiry: "01/09/2033",
  },
  {
    status: "Offline",
    name: "Battery Reserve",
    sn: "1033161256090193BAT01",
    model: "Solis Lithium LFP",
    capacityKwh: 20,
    socPercent: 0,
    powerKw: 0,
    voltageV: 0,
    temperatureC: 0,
    plantName: "P2G 20kW",
    plantId: "1298491919451014036",
    warrantyExpiry: "31/12/2033",
  },
  {
    status: "Offline",
    name: "Battery Backup",
    sn: "1033320253150969BAT01",
    model: "Solis Lithium LFP",
    capacityKwh: 15,
    socPercent: 0,
    powerKw: 0,
    voltageV: 0,
    temperatureC: 0,
    plantName: "P2G 15KW",
    plantId: "1298491919451014037",
    warrantyExpiry: "27/10/2033",
  },
  {
    status: "Offline",
    name: "Battery Mini",
    sn: "1031731257050184BAT01",
    model: "Solis Lithium LFP",
    capacityKwh: 10,
    socPercent: 0,
    powerKw: 0,
    voltageV: 0,
    temperatureC: 0,
    plantName: "P2G 1ST 6KW",
    plantId: "1298491919451014035",
    warrantyExpiry: "04/12/2033",
  },
];

// 9 Dataloggers (7 Online, 2 Offline)
const INITIAL_DATALOGGERS: DeviceDataloggerItem[] = [
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12580709004122",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "98% (Strong)",
    plantName: "Towfiq chinoy",
    plantId: "1298491919451014030",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F022F8",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "94% (Strong)",
    plantName: "P2G 50KW",
    plantId: "1298491919450873747",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F02201",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "99% (Strong)",
    plantName: "OPL Residence",
    plantId: "1298491919451014034",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F02202",
    model: "Solis DLS-G (Cellular 4G)",
    signalStrength: "90% (Good)",
    plantName: "36 Chenab",
    plantId: "1298491919451014032",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F02203",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "95% (Strong)",
    plantName: "Menu Karachi Office",
    plantId: "1298491919451014033",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F02204",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "96% (Strong)",
    plantName: "Menu Karachi Office",
    plantId: "1298491919451014033",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Online",
    name: "Datalogger",
    sn: "7A12551308F02205",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "88% (Good)",
    plantName: "P2G 1ST 6KW",
    plantId: "1298491919451014035",
    updateTime: "20/11/2026 12:51:24",
  },
  {
    status: "Offline",
    name: "Datalogger",
    sn: "7A12551308F02206",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "0% (No Link)",
    plantName: "P2G 20kW",
    plantId: "1298491919451014036",
    updateTime: "19/11/2026 18:20:00",
  },
  {
    status: "Offline",
    name: "Datalogger",
    sn: "7A12551308F02207",
    model: "Solis DLS-W (Wi-Fi)",
    signalStrength: "0% (No Link)",
    plantName: "P2G 15KW",
    plantId: "1298491919451014037",
    updateTime: "18/11/2026 09:15:00",
  },
];

// Meters
const INITIAL_METERS: DeviceMeterItem[] = [
  {
    status: "Online",
    name: "Smart Meter",
    sn: "1053050258180112MTR01",
    model: "Acrel ACR10R-D16TE",
    dailyImportKwh: 28.72,
    dailyExportKwh: 0,
    powerKw: 0,
    voltageV: 236.3,
    currentA: 4.3,
    plantName: "Towfiq chinoy",
    plantId: "1298491919451014030",
    updateTime: "20/11/2026 13:31:36 (UTC+05:00)",
  },
  {
    status: "Online",
    name: "Bi-directional Meter",
    sn: "1053050255210107MTR01",
    model: "Acrel ACR10R-D16TE",
    dailyImportKwh: 45.1,
    dailyExportKwh: 12.4,
    powerKw: 0,
    voltageV: 235.1,
    currentA: 9.1,
    plantName: "P2G 50KW",
    plantId: "1298491919450873747",
    updateTime: "20/11/2026 13:31:36 (UTC+05:00)",
  },
  {
    status: "Online",
    name: "Feed-in Meter",
    sn: "1053050258110159MTR01",
    model: "Acrel ACR10R-D16TE",
    dailyImportKwh: 32.5,
    dailyExportKwh: 33.0,
    powerKw: 33.0,
    voltageV: 237.0,
    currentA: 5.6,
    plantName: "OPL Residence",
    plantId: "1298491919451014034",
    updateTime: "20/11/2026 13:31:36 (UTC+05:00)",
  },
];

export default function SolisDeviceOverviewPage({
  onSelectPlant,
  onSelectPlantByName,
  onSelectInverter,
  onSelectBattery,
  onSelectMeter,
}: SolisDeviceOverviewPageProps) {
  // Active detail view mode: null (shows table) | "inverter" | "battery" | "meter"
  const [detailMode, setDetailMode] = useState<"inverter" | "battery" | "meter" | null>(null);
  const [activeSn, setActiveSn] = useState<string>("");
  const [activePlantName, setActivePlantName] = useState<string>("");

  // Subtab selection
  const [activeTab, setActiveTab] = useState<DeviceCategoryTab>("Inverter");

  // Status Filter: "Total" | "Online" | "Alarm" | "Offline"
  const [statusFilter, setStatusFilter] = useState<"Total" | "Online" | "Alarm" | "Offline">("Total");

  // Search and Filter form states
  const [searchSn, setSearchSn] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [isExpandedFilters, setIsExpandedFilters] = useState(false);

  // Sorting - default to natural order as in reference UI
  const [sortField, setSortField] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [goToPage, setGoToPage] = useState("1");

  // Refresh animation state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered inverters
  const filteredInverters = useMemo(() => {
    return INITIAL_INVERTERS.filter((inv) => {
      // Status filter
      if (statusFilter === "Online" && inv.status !== "Online") return false;
      if (statusFilter === "Alarm" && inv.status !== "Alarm" && inv.status !== "Warning") return false;
      if (statusFilter === "Offline" && inv.status !== "Offline") return false;

      // Search SN
      if (searchSn.trim()) {
        const q = searchSn.toLowerCase().trim();
        const matchesSn = inv.sn.toLowerCase().includes(q);
        const matchesPlant = inv.plantName.toLowerCase().includes(q);
        if (!matchesSn && !matchesPlant) return false;
      }

      // Series filter
      if (seriesFilter.trim()) {
        const s = seriesFilter.toLowerCase().trim();
        if (!inv.name.toLowerCase().includes(s)) return false;
      }

      // Model filter
      if (modelFilter.trim()) {
        const m = modelFilter.toLowerCase().trim();
        const matchModel = `${inv.ratedPowerKw}kW`.toLowerCase().includes(m);
        if (!matchModel) return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = (a as any)[sortField];
      let bVal = (b as any)[sortField];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [statusFilter, searchSn, seriesFilter, modelFilter, sortField, sortDir]);

  // Export CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "Inverter") {
      headers = ["Status", "Name", "Inverter SN", "Rated Power (kW)", "Power (kW)", "Daily Yield (kWh)", "Total Yield (MWh)", "Plant", "Warranty Expiry", "Update Time"];
      rows = filteredInverters.map(inv => [
        inv.status,
        inv.name,
        inv.sn,
        String(inv.ratedPowerKw),
        String(inv.powerKw),
        String(inv.dailyYieldKwh),
        String(inv.totalYieldMwh),
        inv.plantName,
        inv.warrantyExpiry,
        inv.updateTime,
      ]);
    } else if (activeTab === "Battery") {
      headers = ["Status", "Battery SN", "Model", "Capacity (kWh)", "SOC (%)", "Power (kW)", "Voltage (V)", "Temp (C)", "Plant"];
      rows = INITIAL_BATTERIES.map(bat => [
        bat.status,
        bat.sn,
        bat.model,
        String(bat.capacityKwh),
        String(bat.socPercent),
        String(bat.powerKw),
        String(bat.voltageV),
        String(bat.temperatureC),
        bat.plantName,
      ]);
    } else {
      headers = ["Status", "Device SN", "Model", "Plant", "Update Time"];
      rows = INITIAL_DATALOGGERS.map(d => [d.status, d.sn, d.model, d.plantName, d.updateTime]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(e => e.map(x => `"${x}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `solis_${activeTab.toLowerCase()}_overview.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If viewing Inverter Details
  if (detailMode === "inverter") {
    return (
      <SolisInverterDetailsView
        initialSn={activeSn || "1053050259280019"}
        onBackToDevices={() => setDetailMode(null)}
        onSelectPlantByName={onSelectPlantByName}
        onSelectBattery={() => setDetailMode("battery")}
        onSelectMeter={() => setDetailMode("meter")}
      />
    );
  }

  // If viewing Battery Details
  if (detailMode === "battery") {
    return (
      <SolisBatteryDetailsView
        batterySn={activeSn || "1053050255210107BAT01"}
        plantName={activePlantName || "P2G 50KW"}
        onBackToDevices={() => setDetailMode(null)}
        onSelectPlantByName={onSelectPlantByName}
      />
    );
  }

  // If viewing Meter Details
  if (detailMode === "meter") {
    return (
      <SolisMeterDetailsView
        meterSn={activeSn || "1053050258180112MTR01"}
        plantName={activePlantName || "Towfiq chinoy"}
        plantId="3649E0"
        dataloggerSn="7A12580709004122"
        onBackToDevices={() => setDetailMode(null)}
        onSelectPlantByName={onSelectPlantByName}
      />
    );
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: "Device Overview" Title & Refresh Button                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Device Overview</h1>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Refresh Device Overview"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-[#10b981]" : ""}`} />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP SUMMARY CARDS (Inverter, Battery, Datalogger, EPM)                 */}
      {/* Exactly replicating media_1795195322999_3fbd10a1.jpg                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Inverter */}
        <div
          onClick={() => {
            setActiveTab("Inverter");
            setStatusFilter("Total");
          }}
          className="bg-white rounded-2xl p-5 border border-slate-100 transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200"
        >
          <div className="text-sm font-semibold text-slate-700 mb-3">Inverter</div>
          <div className="flex items-center justify-between">
            {/* Left stacked vertical stats */}
            <div className="flex flex-col space-y-1.5">
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">9</div>
                <div className="text-[11px] text-slate-400 font-medium">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">6</div>
                <div className="text-[11px] text-slate-400 font-medium">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">1</div>
                <div className="text-[11px] text-slate-400 font-medium">Alarm</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">2</div>
                <div className="text-[11px] text-slate-400 font-medium">Offline</div>
              </div>
            </div>

            {/* Right side Solis Inverter illustration */}
            <div className="relative w-24 h-32 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/images/solis_inverter_card.jpg"
                alt="Solis Inverter"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Card 2: Battery */}
        <div
          onClick={() => {
            setActiveTab("Battery");
            setStatusFilter("Total");
          }}
          className="bg-white rounded-2xl p-5 border border-slate-100 transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200"
        >
          <div className="text-sm font-semibold text-slate-700 mb-3">Battery</div>
          <div className="flex items-center justify-between">
            {/* Left stacked vertical stats */}
            <div className="flex flex-col space-y-1.5">
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">11</div>
                <div className="text-[11px] text-slate-400 font-medium">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">8</div>
                <div className="text-[11px] text-slate-400 font-medium">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">Alarm</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">3</div>
                <div className="text-[11px] text-slate-400 font-medium">Offline</div>
              </div>
            </div>

            {/* Right side Solis Battery illustration */}
            <div className="relative w-24 h-32 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/images/solis_battery_card.jpg"
                alt="Solis Battery"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Card 3: Datalogger */}
        <div
          onClick={() => {
            setActiveTab("Datalogger");
            setStatusFilter("Total");
          }}
          className="bg-white rounded-2xl p-5 border border-slate-100 transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200"
        >
          <div className="text-sm font-semibold text-slate-700 mb-3">Datalogger</div>
          <div className="flex items-center justify-between">
            {/* Left stacked vertical stats */}
            <div className="flex flex-col space-y-1.5">
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">9</div>
                <div className="text-[11px] text-slate-400 font-medium">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">7</div>
                <div className="text-[11px] text-slate-400 font-medium">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">2</div>
                <div className="text-[11px] text-slate-400 font-medium">Offline</div>
              </div>
              <div className="opacity-0 select-none">
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">None</div>
              </div>
            </div>

            {/* Right side Solis Datalogger illustration */}
            <div className="relative w-24 h-32 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/images/solis_datalogger_card.jpg"
                alt="Solis Datalogger"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Card 4: EPM */}
        <div
          onClick={() => {
            setActiveTab("EPM");
            setStatusFilter("Total");
          }}
          className="bg-white rounded-2xl p-5 border border-slate-100 transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-slate-200"
        >
          <div className="text-sm font-semibold text-slate-700 mb-3">EPM</div>
          <div className="flex items-center justify-between">
            {/* Left stacked vertical stats */}
            <div className="flex flex-col space-y-1.5">
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">Offline</div>
              </div>
              <div className="opacity-0 select-none">
                <div className="text-2xl font-bold text-slate-900 leading-tight">0</div>
                <div className="text-[11px] text-slate-400 font-medium">None</div>
              </div>
            </div>

            {/* Right side Solis EPM / Meter illustration */}
            <div className="relative w-24 h-32 flex-shrink-0 flex items-center justify-center">
              <Image
                src="/images/solis_meter_card.jpg"
                alt="Solis EPM"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN TABLE CARD: Device Category Tabs, Status Filter, Search, Table     */}
      {/* Exactly replicating media_1795195322999_3fbd10a1.jpg                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-xs space-y-4">
        {/* Row A: Category Subtabs */}
        <div className="flex items-center gap-6 border-b border-gray-100 pb-3 overflow-x-auto no-scrollbar">
          {(
            [
              "Inverter",
              "Battery",
              "Datalogger",
              "EPM",
              "Grid Cabinet",
              "Weather Station",
              "Meter",
            ] as DeviceCategoryTab[]
          ).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setStatusFilter("Total");
                }}
                className={`text-sm whitespace-nowrap transition-all relative py-1 ${
                  isActive
                    ? "text-[#10b981] font-semibold"
                    : "text-slate-600 hover:text-slate-900 font-normal"
                }`}
              >
                {tab}
                {isActive && (
                  <span className="absolute bottom-[-13px] left-0 right-0 h-[2.5px] bg-[#10b981] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Row B: Status Filter Pills & Export Button */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Total */}
            <button
              onClick={() => setStatusFilter("Total")}
              className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                statusFilter === "Total"
                  ? "border border-orange-300 bg-orange-50/70 text-[#10b981] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              Total(
              {activeTab === "Inverter"
                ? "9"
                : activeTab === "Battery"
                ? "11"
                : activeTab === "Datalogger"
                ? "9"
                : activeTab === "Meter"
                ? "3"
                : "0"}
              )
            </button>

            {/* Online */}
            <button
              onClick={() => setStatusFilter("Online")}
              className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                statusFilter === "Online"
                  ? "border border-orange-300 bg-orange-50/70 text-[#10b981] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              Online(
              {activeTab === "Inverter"
                ? "6"
                : activeTab === "Battery"
                ? "8"
                : activeTab === "Datalogger"
                ? "7"
                : activeTab === "Meter"
                ? "3"
                : "0"}
              )
            </button>

            {/* Alarm */}
            <button
              onClick={() => setStatusFilter("Alarm")}
              className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                statusFilter === "Alarm"
                  ? "border border-orange-300 bg-orange-50/70 text-[#10b981] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              Alarm(
              {activeTab === "Inverter" ? "1" : "0"}
              )
            </button>

            {/* Offline */}
            <button
              onClick={() => setStatusFilter("Offline")}
              className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-medium flex items-center gap-1 ${
                statusFilter === "Offline"
                  ? "border border-orange-300 bg-orange-50/70 text-[#10b981] font-semibold shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span>
                Offline(
                {activeTab === "Inverter"
                  ? "2"
                  : activeTab === "Battery"
                  ? "3"
                  : activeTab === "Datalogger"
                  ? "2"
                  : "0"}
                )
              </span>
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl border border-gray-200 text-slate-500 hover:text-slate-800 hover:bg-gray-50 shadow-2xs transition-all"
            title="Export Devices to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Row C: Search & Filter Inputs Bar */}
        <div className="bg-[#fafbfc] rounded-2xl p-3.5 border border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Search</span>
              <input
                type="text"
                placeholder="Search SN"
                value={searchSn}
                onChange={(e) => setSearchSn(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 w-40 sm:w-48 focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-400"
              />
            </div>

            {/* Series Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Series</span>
              <input
                type="text"
                placeholder="Please Input"
                value={seriesFilter}
                onChange={(e) => setSeriesFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 w-36 sm:w-44 focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-400"
              />
            </div>

            {/* Model Number */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Model Number</span>
              <input
                type="text"
                placeholder="Input Model"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 w-36 sm:w-44 focus:outline-none focus:border-emerald-400 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {}}
              className="px-5 py-1.5 rounded-xl border border-orange-300 bg-[#fff8f2] text-[#10b981] font-medium text-xs hover:bg-orange-50 shadow-2xs transition-all"
            >
              Search
            </button>
            <button
              onClick={() => {
                setSearchSn("");
                setSeriesFilter("");
                setModelFilter("");
                setStatusFilter("Total");
              }}
              className="px-5 py-1.5 rounded-xl border border-gray-200 bg-white text-slate-600 font-medium text-xs hover:bg-gray-50 shadow-2xs transition-all"
            >
              Reset
            </button>
            <button
              onClick={() => setIsExpandedFilters(!isExpandedFilters)}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium px-1 transition-colors"
            >
              <span>Expand</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpandedFilters ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {/* Row D: Table Section */}
        {activeTab === "Inverter" ? (
          /* =================================================================== */
          /* INVERTERS TABLE: Matches media_1795195322999_3fbd10a1.jpg exactly   */
          /* =================================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-slate-500 font-medium">
                  <th className="py-3 px-3">Status</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Name</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Inverter SN</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("ratedPowerKw")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Rated Power</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("powerKw")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Power</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("dailyYieldKwh")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Daily Yield â“ </span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("totalYieldMwh")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Total Yield</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Plant</th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("warrantyExpiry")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Warranty Expiry Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3 cursor-pointer hover:text-slate-900 select-none"
                    onClick={() => toggleSort("updateTime")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Update Time</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">Commissioning Date</th>
                  <th className="py-3 px-3 text-center">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInverters.map((inv) => (
                  <tr
                    key={inv.sn}
                    className="hover:bg-slate-50/70 transition-colors group text-slate-700"
                  >
                    {/* Status */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            inv.status === "Online"
                              ? "bg-emerald-500"
                              : inv.status === "Warning" || inv.status === "Alarm"
                              ? "bg-[#10b981]"
                              : "bg-slate-400"
                          }`}
                        />
                        <span
                          className={`text-xs font-medium ${
                            inv.status === "Online"
                              ? "text-slate-700"
                              : inv.status === "Warning" || inv.status === "Alarm"
                              ? "text-[#10b981] font-semibold"
                              : "text-slate-500"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {inv.name}
                    </td>

                    {/* Inverter SN (Clickable -> Opens Inverter Details View) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setActiveSn(inv.sn);
                          setDetailMode("inverter");
                          if (onSelectInverter) onSelectInverter(inv.sn);
                        }}
                        className="text-[#10b981] hover:underline font-mono font-medium flex items-center gap-1 group-hover:text-orange-600 transition-colors"
                        title="Click to view full Inverter Telemetry & Charts"
                      >
                        <span>{inv.sn}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    {/* Rated Power */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-600">
                      {inv.ratedPowerKw}kW
                    </td>

                    {/* Power */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-700">
                      {inv.powerKw}kW
                    </td>

                    {/* Daily Yield */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">
                      {inv.dailyYieldKwh}kWh
                    </td>

                    {/* Total Yield */}
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">
                      {inv.totalYieldMwh >= 1 ? `${inv.totalYieldMwh}MWh` : `${inv.totalYieldMwh * 1000}kWh`}
                    </td>

                    {/* Plant (Clickable -> Navigates to Plant) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (onSelectPlant) onSelectPlant(inv.plantId);
                          else if (onSelectPlantByName) onSelectPlantByName(inv.plantName);
                        }}
                        className="text-[#10b981] hover:underline font-medium transition-colors"
                        title="Navigate to Plant Overview"
                      >
                        {inv.plantName}
                      </button>
                    </td>

                    {/* Warranty Expiry */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500">
                      {inv.warrantyExpiry}
                    </td>

                    {/* Update Time */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {inv.updateTime}
                    </td>

                    {/* Commissioning Date */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {inv.commissioningDate}
                    </td>

                    {/* Operation */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => {
                          setActiveSn(inv.sn);
                          setDetailMode("inverter");
                          if (onSelectInverter) onSelectInverter(inv.sn);
                        }}
                        className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-slate-600 font-medium text-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-[#10b981] shadow-2xs transition-all"
                      >
                        Operation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "Battery" ? (
          /* =================================================================== */
          /* BATTERIES TABLE                                                     */
          /* =================================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-slate-500 font-medium">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Battery SN</th>
                  <th className="py-3 px-3">Battery Model</th>
                  <th className="py-3 px-3">Capacity</th>
                  <th className="py-3 px-3">SOC (%)</th>
                  <th className="py-3 px-3">Power (kW)</th>
                  <th className="py-3 px-3">Voltage (V)</th>
                  <th className="py-3 px-3">Temp (Â°C)</th>
                  <th className="py-3 px-3">Plant</th>
                  <th className="py-3 px-3">Warranty Expiry</th>
                  <th className="py-3 px-3 text-center">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {INITIAL_BATTERIES.map((bat) => (
                  <tr key={bat.sn} className="hover:bg-slate-50/70 transition-colors group text-slate-700">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            bat.status === "Online" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span className="text-xs font-medium">{bat.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setActiveSn(bat.sn);
                          setActivePlantName(bat.plantName);
                          setDetailMode("battery");
                          if (onSelectBattery) onSelectBattery(bat.sn);
                        }}
                        className="text-[#10b981] hover:underline font-mono font-medium flex items-center gap-1"
                      >
                        <span>{bat.sn}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </button>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">{bat.model}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium text-slate-800">{bat.capacityKwh}kWh</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {bat.socPercent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-medium">{bat.powerKw}kW</td>
                    <td className="py-3.5 px-3 whitespace-nowrap font-mono">{bat.voltageV}V</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">{bat.temperatureC > 0 ? `${bat.temperatureC}Â°C` : "--"}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (onSelectPlant) onSelectPlant(bat.plantId);
                          else if (onSelectPlantByName) onSelectPlantByName(bat.plantName);
                        }}
                        className="text-[#10b981] hover:underline font-medium"
                      >
                        {bat.plantName}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500">{bat.warrantyExpiry}</td>
                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      <button
                        onClick={() => {
                          setActiveSn(bat.sn);
                          setActivePlantName(bat.plantName);
                          setDetailMode("battery");
                          if (onSelectBattery) onSelectBattery(bat.sn);
                        }}
                        className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-slate-600 font-medium text-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-[#10b981] shadow-2xs transition-all"
                      >
                        Operation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "Datalogger" ? (
          /* =================================================================== */
          /* DATALOGGERS TABLE                                                   */
          /* =================================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-slate-500 font-medium">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Datalogger SN</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Signal Quality</th>
                  <th className="py-3 px-3">Plant</th>
                  <th className="py-3 px-3">Update Time</th>
                  <th className="py-3 px-3 text-center">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {INITIAL_DATALOGGERS.map((d) => (
                  <tr key={d.sn} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            d.status === "Online" ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                        />
                        <span className="text-xs font-medium">{d.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium text-slate-800">{d.sn}</td>
                    <td className="py-3.5 px-3 text-slate-600">{d.model}</td>
                    <td className="py-3.5 px-3">
                      <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                        {d.signalStrength}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => {
                          if (onSelectPlant) onSelectPlant(d.plantId);
                          else if (onSelectPlantByName) onSelectPlantByName(d.plantName);
                        }}
                        className="text-[#10b981] hover:underline font-medium"
                      >
                        {d.plantName}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500">{d.updateTime}</td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => {
                          const isOnline = d.status === "Online";
                          const timeNow = new Date().toLocaleTimeString("en-US", { hour12: false });
                          alert(
                            isOnline
                              ? `Datalogger ${d.sn} Diagnostics [${timeNow}]: Heartbeat OK, Signal Strong (88%), Telemetry packets continuous.`
                              : `Datalogger ${d.sn} Diagnostics [${timeNow}]: Device Offline. No response from remote endpoint.`
                          );
                        }}
                        className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-slate-600 font-medium text-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-[#10b981] shadow-2xs transition-all cursor-pointer"
                      >
                        Operation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === "Meter" ? (
          /* =================================================================== */
          /* METERS TABLE                                                        */
          /* =================================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-slate-500 font-medium">
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Meter SN</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Daily Import (kWh)</th>
                  <th className="py-3 px-3">Daily Export (kWh)</th>
                  <th className="py-3 px-3">Voltage (V)</th>
                  <th className="py-3 px-3">Current (A)</th>
                  <th className="py-3 px-3">Plant</th>
                  <th className="py-3 px-3 text-center">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {INITIAL_METERS.map((m) => (
                  <tr key={m.sn} className="hover:bg-slate-50/70 transition-colors text-slate-700">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-medium">{m.status}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-medium">
                      <button
                        onClick={() => {
                          setActiveSn(m.sn);
                          setActivePlantName(m.plantName);
                          setDetailMode("meter");
                          if (onSelectMeter) onSelectMeter(m.sn);
                        }}
                        className="text-[#10b981] hover:underline"
                      >
                        {m.sn}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{m.model}</td>
                    <td className="py-3.5 px-3 font-medium text-slate-800">{m.dailyImportKwh} kWh</td>
                    <td className="py-3.5 px-3 font-medium text-slate-800">{m.dailyExportKwh} kWh</td>
                    <td className="py-3.5 px-3 font-mono">{m.voltageV} V</td>
                    <td className="py-3.5 px-3 font-mono">{m.currentA} A</td>
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => {
                          if (onSelectPlant) onSelectPlant(m.plantId);
                          else if (onSelectPlantByName) onSelectPlantByName(m.plantName);
                        }}
                        className="text-[#10b981] hover:underline font-medium"
                      >
                        {m.plantName}
                      </button>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        onClick={() => {
                          setActiveSn(m.sn);
                          setActivePlantName(m.plantName);
                          setDetailMode("meter");
                          if (onSelectMeter) onSelectMeter(m.sn);
                        }}
                        className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-slate-600 font-medium text-xs hover:border-orange-300 hover:bg-orange-50/50 hover:text-[#10b981] shadow-2xs transition-all"
                      >
                        Operation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty / Other Devices */
          <div className="py-12 text-center text-slate-400 text-xs">
            No {activeTab} devices registered across fleet plants.
          </div>
        )}

        {/* Row E: Pagination Bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-gray-100 flex-wrap gap-2">
          <div>
            Total {activeTab === "Inverter" ? filteredInverters.length : activeTab === "Battery" ? INITIAL_BATTERIES.length : INITIAL_DATALOGGERS.length}
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border border-gray-200 rounded-lg px-2 py-1 bg-white text-slate-700 text-xs focus:outline-none"
              defaultValue="10"
            >
              <option value="10">10/page</option>
              <option value="20">20/page</option>
              <option value="50">50/page</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                &lt;
              </button>
              <span className="w-7 h-7 rounded-lg border border-orange-300 bg-[#fff8f2] text-[#10b981] font-semibold flex items-center justify-center">
                1
              </span>
              <button
                disabled
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                &gt;
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span>Go to</span>
              <input
                type="text"
                value={goToPage}
                onChange={(e) => setGoToPage(e.target.value)}
                className="w-9 text-center border border-gray-200 rounded-lg py-1 bg-white text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
