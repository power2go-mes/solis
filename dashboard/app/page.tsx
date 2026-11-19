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
  const stationIdParam = searchParams.get("stationId") || "";

  // View Mode: "plant_overview" (default exact SolisCloud replication) or "plant_detail" / "device_overview"
  const [activeView, setActiveView] = useState<"plant_overview" | "device_overview">(
    stationIdParam ? "device_overview" : "plant_overview"
  );
  const [selectedPlantId, setSelectedPlantId] = useState<string>(
    stationIdParam || "1298491919450873747"
  );

  // Layout UI State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
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
    plantCounts: { total: 7, online: 5, alarm: 0, offline: 2 },
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

  // Periodic silent background refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadOverviewData();
      if (activeView === "device_overview" && selectedPlantId) {
        loadTelemetry(selectedPlantId);
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, [loadOverviewData, loadTelemetry, activeView, selectedPlantId]);

  // Handle Plant Row Click -> Navigate to detailed 4-graph view
  const handleSelectPlant = (plantId: string) => {
    setSelectedPlantId(plantId);
    loadTelemetry(plantId);
    setActiveView("device_overview");
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

      <div className="flex-1 flex overflow-hidden z-10">
        {/* Left Sidebar (Exact SolisCloud Navigation with Power2Go branding) */}
        <SolisSidebar
          activeView={activeView}
          onSelectView={(view) => setActiveView(view)}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Top Navigation Bar */}
          <SolisTopNav onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

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
            ) : (
              /* ============================================================== */
              /* EXACT SOLISCLOUD CLIENT DASHBOARD (MATCHING REFERENCE IMAGE 9) */
              /* ============================================================== */
              <div className="space-y-4 animate-in fade-in duration-200">
                <SolisClientDashboard
                  selectedPlantId={selectedPlantId}
                  plantsList={plantsList}
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
            <div className="w-8 h-8 border-3 border-[#f37021] border-t-transparent rounded-full animate-spin" />
            <span>Loading SolisCloud Plant Overview...</span>
          </div>
        </div>
      }
    >
      <SolisCloudDashboard />
    </Suspense>
  );
}
