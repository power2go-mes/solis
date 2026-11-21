"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Zap } from "lucide-react";

// SolisCloud Replicated Components
import SolisSidebar from "@/components/SolisSidebar";
import SolisTopNav from "@/components/SolisTopNav";
import SolisPageHeader from "@/components/SolisPageHeader";
import SolisKPICards from "@/components/SolisKPICards";
import SolisPlantTable from "@/components/SolisPlantTable";
import CreatePlantModal from "@/components/CreatePlantModal";
import SolisClientDashboard from "@/components/SolisClientDashboard";

// SolisCloud Mobile Replicated Components (100% Mobile Parity)
import SolisMobilePlantList from "@/components/mobile/SolisMobilePlantList";
import SolisMobilePlantDetail from "@/components/mobile/SolisMobilePlantDetail";
import SolisMobileBottomNav from "@/components/mobile/SolisMobileBottomNav";

// SolisCloud O&M & Reports Components
import SolisOMAlarmsPage from "@/components/SolisOMAlarmsPage";
import SolisPlantReportView from "@/components/reports/SolisPlantReportView";
import SolisInverterReportView from "@/components/reports/SolisInverterReportView";
import SolisBatteryReportView from "@/components/reports/SolisBatteryReportView";
import SolisDeviceOverviewPage from "@/components/SolisDeviceOverviewPage";
import SolisAlarmDetailsView, { AlarmDetailRecord } from "@/components/SolisAlarmDetailsView";
import { SidebarViewType } from "@/components/SolisSidebar";

// Client Detailed 4-Graph Components
import ClientTiles from "@/components/ClientTiles";
import DualPowerSOCCharts from "@/components/DualPowerSOCCharts";
import EnergyBreakdownCharts from "@/components/EnergyBreakdownCharts";

import {
  PlantInfo,
  TelemetryLatest,
  SolisOverviewSummary,
  SolisPlantOverviewItem,
} from "@/lib/types";

function SolisCloudDashboard() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || searchParams.get("plant") || "";
  const tabParam = searchParams.get("tab") || "Overview";
  const viewParam = (searchParams.get("view") as SidebarViewType) || "";

  // View Mode: "plant_overview", "device_overview", "plant_detail", "om_alarms", "om_alerts", "alarm_detail", "report_plant", "report_inverter", "report_battery"
  const [activeView, setActiveView] = useState<SidebarViewType | "plant_detail" | "alarm_detail">(
    (viewParam as any) || (stationIdParam ? "plant_detail" : "plant_overview")
  );
  const [selectedAlarmDetail, setSelectedAlarmDetail] = useState<AlarmDetailRecord | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Array<SidebarViewType | "plant_detail" | "alarm_detail">>([]);

  const navigateToView = (view: SidebarViewType | "plant_detail" | "alarm_detail") => {
    setNavigationHistory((prev) => [...prev, activeView]);
    setActiveView(view);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const handleGoBack = () => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((hist) => hist.slice(0, -1));
      setActiveView(prev);
    } else {
      setActiveView("plant_overview");
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    stationIdParam || "1298491919450873747"
  );

  // Layout UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [isCreatePlantOpen, setIsCreatePlantOpen] = useState<boolean>(false);

  // Overview Data State
  const [overviewSummary, setOverviewSummary] = useState<SolisOverviewSummary>({
    currentPowerKw: 0,
    installedCapacityKwp: 0,
    dailyChargeKwh: 0,
    dailyDischargeKwh: 0,
    monthlyChargeMwh: 0,
    monthlyDischargeMwh: 0,
    totalChargeMwh: 0,
    totalDischargeMwh: 0,
    plantCounts: { total: 8, online: 6, alarm: 0, offline: 2 },
  });
  const [overviewPlants, setOverviewPlants] = useState<SolisPlantOverviewItem[]>([]);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Detail View State (for 4 charts)
  const [plantsList, setPlantsList] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);

  // Load SolisCloud Overview Data
  const loadOverviewData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetch("/api/overview", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setOverviewSummary(data.summary);
        setOverviewPlants(data.plants);
      }
    } catch (err) {
      console.error("Error loading SolisCloud overview data:", err);
    } finally {
      setOverviewLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 400);
      }
    }
  }, []);

  // Load plants list for detail view
  const loadPlantsList = useCallback(async () => {
    try {
      const res = await fetch("/api/plants", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.plants)) {
        setPlantsList(data.plants);
      }
    } catch (err) {
      console.error("Error loading plants list:", err);
    }
  }, []);

  // Load telemetry for selected plant
  const loadTelemetry = useCallback(async (stationId: string) => {
    if (!stationId) return;
    try {
      const res = await fetch(`/api/telemetry/latest?stationId=${stationId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.telemetry) {
        setTelemetry(data.telemetry);
      } else {
        setTelemetry(null);
      }
    } catch (err) {
      console.error("Error loading telemetry:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOverviewData();
    loadPlantsList();
    if (selectedPlantId) {
      loadTelemetry(selectedPlantId);
    }
  }, [loadOverviewData, loadPlantsList, loadTelemetry, selectedPlantId]);

  // Periodic silent background refresh every 30 seconds for live data
  useEffect(() => {
    const interval = setInterval(() => {
      loadOverviewData();
      if ((activeView === "device_overview" || activeView === "plant_detail") && selectedPlantId) {
        loadTelemetry(selectedPlantId);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadOverviewData, loadTelemetry, activeView, selectedPlantId]);

  // Handle Plant Row Click -> Navigate to detailed plant dashboard
  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    loadTelemetry(plantId);
    navigateToView("plant_detail");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  const currentPlantInfo = plantsList.find((p) => p.id === selectedPlantId);
  const currentPlantName =
    overviewPlants.find((p) => p.id === selectedPlantId)?.name ||
    currentPlantInfo?.name ||
    telemetry?.station_name ||
    "Solis Client";

  return (
    <div className="min-h-screen bg-[#f7f9fa] font-sans text-slate-800 flex flex-col antialiased relative overflow-hidden">
      {/* Decorative Solis Faint Watermark at Top */}
      <div className="absolute top-0 left-0 right-0 h-72 pointer-events-none opacity-40 overflow-hidden z-0">
        <svg
          viewBox="0 0 1200 400"
          className="w-full h-full text-slate-200/50"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M200 0 C350 80, 500 220, 650 120 C800 20, 950 180, 1100 80"
            stroke="currentColor"
            strokeWidth="48"
            strokeLinecap="round"
            opacity="0.12"
          />
          <path
            d="M100 50 C250 140, 420 300, 600 180 C780 60, 920 220, 1150 100"
            stroke="currentColor"
            strokeWidth="32"
            strokeLinecap="round"
            opacity="0.08"
          />
        </svg>
      </div>

      {/* ============================================================== */}
      {/* 1. DESKTOP / TABLET VIEW (md: breakpoint >= 768px)             */}
      {/* ============================================================== */}
      <div className="hidden md:flex flex-1 overflow-hidden z-10">
        {/* Left Sidebar (Exact SolisCloud Navigation with Power2Go branding) */}
        <SolisSidebar
          activeView={activeView}
          onSelectView={(view) => navigateToView(view)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navigation Bar */}
          <SolisTopNav
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            canGoBack={activeView !== "plant_overview" || navigationHistory.length > 0}
            onGoBack={handleGoBack}
          />

          {/* Page Body */}
          <main className="flex-1 p-3.5 sm:p-5 lg:p-6 space-y-4 max-w-[1600px] w-full mx-auto">
            {activeView === "plant_overview" ? (
              /* ============================================================== */
              /* EXACT SOLISCLOUD PLANT OVERVIEW PAGE (PRIMARY VIEW)            */
              /* ============================================================== */
              <>
                {/* 1. Header: "Plant Overview" Title, Refresh Icon, "Create Plant" Button */}
                <SolisPageHeader
                  onRefresh={() => loadOverviewData(true)}
                  isRefreshing={isRefreshing}
                  onCreatePlant={() => setIsCreatePlantOpen(true)}
                />

                {/* 2. Four Large KPI Cards */}
                <SolisKPICards
                  summary={overviewSummary}
                  loading={overviewLoading}
                />

                {/* 3. Plant List Container & Table */}
                <SolisPlantTable
                  plants={overviewPlants}
                  loading={overviewLoading}
                  onSelectPlant={handleSelectPlant}
                />
              </>
            ) : activeView === "om_alarms" ? (
              /* ============================================================== */
              /* O&M ALARMS INFORMATION PAGE (EXACT MEDIA REFERENCE 1795173161)  */
              /* ============================================================== */
              <SolisOMAlarmsPage
                initialCategory="Alarm"
                onSelectPlant={(plantId) => {
                  setSelectedPlantId(plantId);
                  navigateToView("device_overview");
                }}
                onSelectDevice={(sn) => {
                  navigateToView("device_overview");
                }}
                onViewAlarmDetail={(alarm) => {
                  setSelectedAlarmDetail(alarm);
                  navigateToView("alarm_detail");
                }}
              />
            ) : activeView === "om_alerts" ? (
              /* ============================================================== */
              /* O&M ALERTS INFORMATION PAGE                                    */
              /* ============================================================== */
              <SolisOMAlarmsPage
                initialCategory="Alert"
                onSelectPlant={(plantId) => {
                  setSelectedPlantId(plantId);
                  navigateToView("device_overview");
                }}
                onSelectDevice={(sn) => {
                  navigateToView("device_overview");
                }}
                onViewAlarmDetail={(alarm) => {
                  setSelectedAlarmDetail(alarm);
                  navigateToView("alarm_detail");
                }}
              />
            ) : activeView === "alarm_detail" ? (
              /* ============================================================== */
              /* ALARM DETAILS PAGE (EXACT SCREENSHOT REFERENCE)                */
              /* ============================================================== */
              <SolisAlarmDetailsView
                alarm={selectedAlarmDetail}
                onBack={handleGoBack}
                onSelectPlantByName={(name) => {
                  const match = plantsList.find((p) =>
                    p.name.toLowerCase().includes(name.toLowerCase())
                  );
                  if (match) {
                    setSelectedPlantId(match.id);
                    loadTelemetry(match.id);
                    navigateToView("plant_detail");
                  }
                }}
                onSelectDevice={() => navigateToView("device_overview")}
              />
            ) : activeView === "report_plant" ? (
              /* ============================================================== */
              /* PLANT GENERATION & PERFORMANCE REPORT                          */
              /* ============================================================== */
              <SolisPlantReportView
                onSelectPlant={(plantId) => {
                  setSelectedPlantId(plantId);
                  setActiveView("device_overview");
                }}
              />
            ) : activeView === "report_inverter" ? (
              /* ============================================================== */
              /* INVERTER TELEMETRY & EFFICIENCY REPORT                         */
              /* ============================================================== */
              <SolisInverterReportView
                onSelectInverter={(sn) => {
                  setActiveView("device_overview");
                }}
              />
            ) : activeView === "report_battery" ? (
              /* ============================================================== */
              /* BATTERY STORAGE & HEALTH REPORT                                */
              /* ============================================================== */
              <SolisBatteryReportView
                onSelectBattery={(sn) => {
                  setActiveView("device_overview");
                }}
              />
            ) : activeView === "device_overview" ? (
              /* ============================================================== */
              /* EXACT SOLISCLOUD DEVICE OVERVIEW PAGE (MEDIA_1795195322999)     */
              /* ============================================================== */
              <SolisDeviceOverviewPage
                onSelectPlant={(plantId) => {
                  setSelectedPlantId(plantId);
                  loadTelemetry(plantId);
                  setActiveView("plant_detail");
                }}
                onSelectPlantByName={(name) => {
                  const match = plantsList.find((p) =>
                    p.name.toLowerCase().includes(name.toLowerCase())
                  );
                  if (match) {
                    setSelectedPlantId(match.id);
                    loadTelemetry(match.id);
                    setActiveView("plant_detail");
                  }
                  setActiveView("plant_detail");
                }}
              />
            ) : (
              /* ============================================================== */
              /* EXACT SOLISCLOUD CLIENT DASHBOARD (MATCHING REFERENCE IMAGE 9) */
              /* ============================================================== */
              <div className="space-y-4 animate-in fade-in duration-200">
                <SolisClientDashboard
                  selectedPlantId={selectedPlantId}
                  plantsList={plantsList}
                  initialTab={tabParam}
                  onSelectPlant={(newId) => {
                    setSelectedPlantId(newId);
                    loadTelemetry(newId);
                  }}
                  onBackToOverview={() => setActiveView("plant_overview")}
                />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. DEDICATED NATIVE MOBILE VIEW (< md breakpoint < 768px)      */}
      {/*    100% Strict Visual & Functional Parity with Mobile Images   */}
      {/* ============================================================== */}
      <div className="block md:hidden z-10 w-full min-h-screen">
        {activeView === "plant_overview" ? (
          <SolisMobilePlantList
            plants={overviewPlants}
            onSelectPlant={(plantId) => handleSelectPlant(plantId)}
            onCreatePlant={() => setIsCreatePlantOpen(true)}
            onNavigateTab={(tab) => navigateToView(tab as any)}
            activeView={activeView}
          />
        ) : activeView === "om_alarms" || activeView === "om_alerts" ? (
          <div className="p-3 bg-[#f7f9fa] min-h-screen pb-24">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => navigateToView("plant_overview")}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-gray-50 flex items-center gap-1.5"
              >
                ← Back to Overview
              </button>
            </div>
            <SolisOMAlarmsPage
              initialCategory={activeView === "om_alarms" ? "Alarm" : "Alert"}
              onSelectPlant={(plantId) => {
                setSelectedPlantId(plantId);
                navigateToView("device_overview");
              }}
            />
          </div>
        ) : activeView === "report_plant" ? (
          <div className="p-3 bg-[#f7f9fa] min-h-screen pb-24">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => navigateToView("plant_overview")}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-gray-50 flex items-center gap-1.5"
              >
                ← Back to Overview
              </button>
            </div>
            <SolisPlantReportView
              onSelectPlant={(plantId) => {
                setSelectedPlantId(plantId);
                navigateToView("device_overview");
              }}
            />
          </div>
        ) : activeView === "report_inverter" ? (
          <div className="p-3 bg-[#f7f9fa] min-h-screen pb-24">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => navigateToView("plant_overview")}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-gray-50 flex items-center gap-1.5"
              >
                ← Back to Overview
              </button>
            </div>
            <SolisInverterReportView
              onSelectInverter={() => navigateToView("device_overview")}
            />
          </div>
        ) : activeView === "report_battery" ? (
          <div className="p-3 bg-[#f7f9fa] min-h-screen pb-24">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => navigateToView("plant_overview")}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-gray-50 flex items-center gap-1.5"
              >
                ← Back to Overview
              </button>
            </div>
            <SolisBatteryReportView
              onSelectBattery={() => navigateToView("device_overview")}
            />
          </div>
        ) : activeView === "device_overview" ? (
          <div className="p-3 bg-[#f7f9fa] min-h-screen pb-24">
            <div className="mb-3 flex items-center justify-between">
              <button
                onClick={() => navigateToView("plant_overview")}
                className="px-3.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-gray-50 flex items-center gap-1.5"
              >
                ← Back to Overview
              </button>
            </div>
            <SolisDeviceOverviewPage
              onSelectPlant={(plantId) => {
                setSelectedPlantId(plantId);
                navigateToView("plant_detail");
              }}
              onSelectPlantByName={(name) => {
                const match = plantsList.find((p) =>
                  p.name.toLowerCase().includes(name.toLowerCase())
                );
                if (match) setSelectedPlantId(match.id);
                navigateToView("plant_detail");
              }}
            />
          </div>
        ) : (
          <SolisMobilePlantDetail
            selectedPlantId={selectedPlantId}
            plantsList={plantsList}
            initialTab={tabParam}
            onSelectPlant={(plantId) => handleSelectPlant(plantId)}
            onBack={() => navigateToView("plant_overview")}
          />
        )}

        {/* Global Floating Bottom Navbar for ALL Mobile Pages */}
        <SolisMobileBottomNav
          activeView={activeView}
          onNavigateTab={(tab) => navigateToView(tab as any)}
        />
      </div>

      {/* Create Plant Information Modal */}
      <CreatePlantModal
        isOpen={isCreatePlantOpen}
        onClose={() => setIsCreatePlantOpen(false)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa] text-slate-500 text-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading SolisCloud Plant Overview...</span>
          </div>
        </div>
      }
    >
      <SolisCloudDashboard />
    </Suspense>
  );
}
