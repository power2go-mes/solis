import { NextRequest, NextResponse } from "next/server";
import { getPlantPowerCurve, getDailyEnergy, getAlarmLogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || "1298491919450797504";

    // Specifically for Menu Karachi Office forensic audit window
    const auditDates = [
      {
        date: "2026-11-08",
        label: "Nov 08 (Normal Baseline)",
        integratedPv: 313.6,
        tablePv: 319.0,
        integratedCharge: 158.0,
        tableCharge: 159.0,
        integratedDischarge: 142.7,
        tableDischarge: 145.0,
        status: "Normal",
        notes: "Flawless baseline operation. Battery cycled 26% to 100%.",
      },
      {
        date: "2026-11-09",
        label: "Nov 09 (Comms Drops & Leakage)",
        integratedPv: 274.7,
        tablePv: 281.9,
        integratedCharge: 114.3,
        tableCharge: 114.7,
        integratedDischarge: 105.8,
        tableDischarge: 110.5,
        status: "Warning",
        notes: "25-min telemetry blackout at 06:48. Inverter 2 String 2 nocturnal reverse current (0.5A @ 170V).",
      },
      {
        date: "2026-11-10",
        label: "Nov 10 (Dual-Logger Desync)",
        integratedPv: 235.8,
        tablePv: 0.0,
        integratedCharge: 142.5,
        tableCharge: 0.0,
        integratedDischarge: 127.3,
        tableDischarge: 2.9,
        status: "Reporting Bug",
        notes: "FALSE ZERO: Generation normal (peaked at 64.3 kW). Dual loggers flooded packets every 17-54s, crashing daily accumulator.",
      },
      {
        date: "2026-11-11",
        label: "Nov 11 (Dual-Logger Desync)",
        integratedPv: 230.8,
        tablePv: 0.0,
        integratedCharge: 139.7,
        tableCharge: 0.0,
        integratedDischarge: 136.9,
        tableDischarge: 0.0,
        status: "Reporting Bug",
        notes: "FALSE ZERO: 230.8 kWh PV produced, 139.7 kWh battery charge. Cloud accumulator rejected interleaved packets.",
      },
      {
        date: "2026-11-12",
        label: "Nov 12 (Dual-Logger Desync)",
        integratedPv: 174.5,
        tablePv: 0.0,
        integratedCharge: 94.3,
        tableCharge: 0.0,
        integratedDischarge: 137.6,
        tableDischarge: 0.0,
        status: "Reporting Bug",
        notes: "FALSE ZERO: 174.5 kWh PV produced. Site ran off solar and battery seamlessly.",
      },
      {
        date: "2026-11-13",
        label: "Nov 13 (Partial Recovery)",
        integratedPv: 167.3,
        tablePv: 0.0,
        integratedCharge: 94.0,
        tableCharge: 0.0,
        integratedDischarge: 118.0,
        tableDischarge: 83.0,
        status: "Reporting Bug",
        notes: "Secondary logger stream stopped at 23:14. Partial battery discharge counter unfroze.",
      },
      {
        date: "2026-11-14",
        label: "Nov 14 (Grid Sag 1011)",
        integratedPv: 190.1,
        tablePv: 197.0,
        integratedCharge: 104.8,
        tableCharge: 106.0,
        integratedDischarge: 19.9,
        tableDischarge: 22.0,
        status: "Grid Fault",
        notes: "Grid Phase 3 undervoltage (1011 UN03-G-V) at 11:05. Inverter stack reboot resynced daily accumulator.",
      },
      {
        date: "2026-11-15",
        label: "Nov 15 (BMS Charge Lockout)",
        integratedPv: 189.8,
        tablePv: 196.0,
        integratedCharge: 0.0,
        tableCharge: 0.0,
        integratedDischarge: 6.8,
        tableDischarge: 4.0,
        status: "Hardware Fault",
        notes: "REAL HARDWARE STANDSTILL: BMS set Charge Limit to 0 A. Battery charge was 0.0 kWh all day, SOC frozen at 73%.",
      },
      {
        date: "2026-11-16",
        label: "Nov 16 (Battery Trip 1054)",
        integratedPv: 168.0,
        tablePv: 172.0,
        integratedCharge: 76.7,
        tableCharge: 78.0,
        integratedDischarge: 134.7,
        tableDischarge: 134.0,
        status: "Battery Fault",
        notes: "Night undervoltage trip at 20:38: 1054 UN-Vbatt & 1055 NO-Battery (Fault bit 0x0005).",
      },
      {
        date: "2026-11-17",
        label: "Nov 17 (Lockout & Blackouts)",
        integratedPv: 264.2,
        tablePv: 258.0,
        integratedCharge: 169.6,
        tableCharge: 161.0,
        integratedDischarge: 99.7,
        tableDischarge: 99.0,
        status: "Severe Faults",
        notes: "4h 15m overnight battery lockout (00:53-05:08). DC-INTF 1027 at 14:24. Two grid blackouts (1015 NO-Grid) at 15:00 & 17:44.",
      },
      {
        date: "2026-11-18",
        label: "Nov 18 (Active Trip State)",
        integratedPv: 120.5,
        tablePv: 125.0,
        integratedCharge: 8.0,
        tableCharge: 8.0,
        integratedDischarge: 30.1,
        tableDischarge: 30.1,
        status: "Active Emergency",
        notes: "CURRENT STATE: Both inverters locked in State 3 (Fault) with active 1054 UN-Vbatt & 1055 NO-Battery. Battery idle at 0 W.",
      },
    ];

    const alarms = await getAlarmLogs(stationId, { limit: 100 });

    return NextResponse.json({
      success: true,
      stationId,
      auditDates,
      alarmsCount: alarms.total,
      alarms: alarms.records,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
