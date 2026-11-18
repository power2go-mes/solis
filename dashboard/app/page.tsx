"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ClientTiles from "@/components/ClientTiles";
import DualPowerSOCCharts from "@/components/DualPowerSOCCharts";
import { PlantInfo, TelemetryLatest } from "@/lib/types";

function SinglePageDashboard() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [selectedStationId, setSelectedStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync state if URL param changes
  useEffect(() => {
    if (stationIdParam && stationIdParam !== selectedStationId) {
      setSelectedStationId(stationIdParam);
    }
  }, [stationIdParam]);

  // Load plants from database
  const loadPlants = useCallback(async () => {
    try {
      const res = await fetch("/api/plants", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.plants)) {
        setPlants(data.plants);
        const plantExists = data.plants.some((p: PlantInfo) => p.id === selectedStationId);
        if ((!selectedStationId || !plantExists) && data.plants.length > 0) {
          setSelectedStationId(data.plants[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading plants:", err);
    }
  }, [selectedStationId]);

  // Load latest telemetry for selected plant
  const loadTelemetry = useCallback(async (isInitial = false) => {
    if (!selectedStationId) return;
    if (isInitial) setLoading(true);
    try {
      const res = await fetch(`/api/telemetry/latest?stationId=${selectedStationId}`, {
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
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [selectedStationId]);

  // Initial load on mount or station selection change
  useEffect(() => {
    loadPlants();
    loadTelemetry(true);
  }, [loadPlants, loadTelemetry]);

  // 2-minute automated background refresh from database
  useEffect(() => {
    const interval = setInterval(() => {
      loadPlants();
      loadTelemetry(false); // silent background update without spinner
    }, 120_000);

    return () => clearInterval(interval);
  }, [loadPlants, loadTelemetry]);

  const currentPlant = plants.find((p) => p.id === selectedStationId);
  const plantName = currentPlant?.name || telemetry?.station_name || "Solis Client";

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      {/* Top Header */}
      <Header
        currentPlantName={plantName}
        telemetry={telemetry}
        onRefresh={() => {
          loadPlants();
          loadTelemetry(true);
        }}
        loading={loading}
      />

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Section 1: All Client Tiles */}
        <ClientTiles
          plants={plants}
          selectedPlantId={selectedStationId}
          onSelectPlant={(newId) => setSelectedStationId(newId)}
        />

        {/* Section 2: Selected Client Dual Power & SOC Charts */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{plantName}</span>
              <span className="text-xs font-normal text-slate-500">
                • {currentPlant?.location || "Pakistan"} ({currentPlant?.capacityKwp || 0} kWp)
              </span>
            </h2>
            <span className="text-xs font-medium text-slate-500">
              SolisCloud Telemetry & Battery Analytics • Auto-updates every 2m
            </span>
          </div>

          <DualPowerSOCCharts
            key={selectedStationId}
            stationId={selectedStationId}
            plantName={plantName}
          />
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
          Loading SolisCloud Clients...
        </div>
      }
    >
      <SinglePageDashboard />
    </Suspense>
  );
}
