"use client";

import React from "react";
import SolisHousePowerFlow from "../SolisHousePowerFlow";

interface SolisMobileCommercialPowerFlowProps {
  solarKw?: number;
  loadKw?: number;
  batterySoc?: number;
  batteryKw?: number;
  batteryState?: string;
  gridKw?: number;
  dailyYieldKwh?: number;
  dailyChargeKwh?: number;
  dailyDischargeKwh?: number;
}

export default function SolisMobileCommercialPowerFlow({
  solarKw = 61.2,
  loadKw = 8.6,
  batterySoc = 63,
  batteryKw = 51.3,
  batteryState = "Charging",
  gridKw = 0.0,
  dailyYieldKwh = 112.7,
  dailyChargeKwh = 80.4,
  dailyDischargeKwh = 53.0,
}: SolisMobileCommercialPowerFlowProps) {
  return (
    <SolisHousePowerFlow
      solarKw={solarKw}
      loadKw={loadKw}
      batterySoc={batterySoc}
      batteryKw={batteryKw}
      batteryState={batteryState}
      gridKw={gridKw}
      dailyYieldKwh={dailyYieldKwh}
      dailyChargeKwh={dailyChargeKwh}
      dailyDischargeKwh={dailyDischargeKwh}
      isMobile={true}
    />
  );
}
