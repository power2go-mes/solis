import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

function generateSolisApiCatalogPdf() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const BLACK: [number, number, number] = [20, 20, 20];
  const GRAY: [number, number, number] = [100, 100, 100];
  const BORDER_COLOR: [number, number, number] = [220, 224, 230];
  const HEAD_BG: [number, number, number] = [245, 247, 250];

  const tableTheme = {
    theme: "plain" as const,
    styles: {
      font: "helvetica" as const,
      fontSize: 7.8,
      textColor: BLACK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      cellPadding: { top: 2.8, bottom: 2.8, left: 3.0, right: 3.0 },
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: HEAD_BG,
      textColor: BLACK,
      fontStyle: "bold" as const,
      fontSize: 8.0,
      lineWidth: 0.25,
      lineColor: [200, 205, 212] as [number, number, number],
      cellPadding: { top: 3.2, bottom: 3.2, left: 3.0, right: 3.0 },
      valign: "middle" as const,
    },
    alternateRowStyles: {
      fillColor: [252, 253, 254] as [number, number, number],
    },
  };

  let currentY = 16;

  // Header Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("SolisCloud Platform API Telemetry & Parameter Specification", margin, currentY);
  currentY += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text("Official Technical Catalog of Endpoints, Data Scope (Live Snapshot vs. Historical), and Parameter Dictionary", margin, currentY);
  currentY += 4.5;
  doc.text(`Generated: ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} PKT | Scope: Ginlong Solis OpenAPI v2.0`, margin, currentY);
  currentY += 7;

  // Executive Note Box
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(margin, currentY, contentWidth, 14, 1.2, 1.2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.0);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("Executive Technical Finding:", margin + 3.5, currentY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 65, 75);
  doc.text(
    "SolisCloud historical time-series curves store inverter heat sink temperatures, generation, and battery power/SOC, but do NOT archive",
    margin + 3.5,
    currentY + 8.2
  );
  doc.text(
    "historical battery cell temperatures (bmsTemp, bmsMinTemp, bmsMintempLocStr). Those registers are live-broadcast-only in detail endpoints.",
    margin + 3.5,
    currentY + 11.5
  );
  currentY += 19;

  // SECTION 1: ENDPOINTS OVERVIEW & TEMPORAL SCOPE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("1. SolisCloud API Endpoints & Temporal Data Scope", margin, currentY);
  currentY += 4.5;

  const endpointOverviewRows = [
    [
      "/api/inverter/detail\n(/v1/api/inverterDetail)",
      "Live Snapshot (Real-Time Only)",
      "Instantaneous operational status of connected inverter and active battery racks.",
      "Live bmsTemp, bmsMinTemp, bmsMaxTemp, bmsMintempLocStr, bmsMaxtempLocStr, bmsMinU, bmsMaxU, live voltages & currents.",
      "NO past date support. Only current second status."
    ],
    [
      "/api/station/detailMix\n(/v1/api/stationDetail)",
      "Live Snapshot (Real-Time Only)",
      "Plant-level instantaneous operational summary, weather, and cumulative lifetime totals.",
      "Current solar power (kW), active power, lifetime generation (kWh), total battery charge/discharge, plant state.",
      "NO past date curves. Returns live status + lifetime totals."
    ],
    [
      "/api/chart/inverter/day\n(/v1/api/inverterDay)",
      "Historical Daily Time-Series (Past & Today)",
      "288 telemetry records per day (5-min intervals) for a selected calendar date.",
      "inverterTemperature (Heat Sink), batteryPower, batteryCapacitySoc, batteryVoltage, bstteryCurrent, uPv1..uPv4, iPv1..iPv4, pac.",
      "YES (Day 1 to Present). Battery cell temp (bmsTemp) is NOT included."
    ],
    [
      "/api/chart/station/day/v2\n(/v1/api/stationDay)",
      "Historical Daily Time-Series (Past & Today)",
      "5-minute resolution station generation, consumption, and battery power profile.",
      "batteryPower, batteryCapacitySocList, produceEnergy, consumeEnergy, familyLoadPowerList, psum, backupPower.",
      "YES (Day 1 to Present). Focuses on energy flow and power curves."
    ],
    [
      "/api/chart/station/month\n(/v1/api/stationMonth)",
      "Historical Monthly Aggregates (Day 1 to Present)",
      "Day-by-day energy totals across each calendar month.",
      "Daily generation (kWh), battery charge energy (kWh), battery discharge energy (kWh), grid import/export (kWh).",
      "YES (Full calendar month history from commissioning)."
    ],
    [
      "/api/chart/station/year\n(/v1/api/stationYear)",
      "Historical Annual Aggregates (Day 1 to Present)",
      "Month-by-month energy totals across a selected calendar year.",
      "Monthly solar energy (MWh), monthly battery charge (kWh), monthly consumption (kWh), peak power.",
      "YES (Multi-year historical records)."
    ],
    [
      "/api/alarm/list\n(/v1/api/alarmList)",
      "Historical Log / Event Driven",
      "Paginated list of inverter and BMS fault events, warnings, and recovery timestamps.",
      "alarmCode, alarmMessage, alarmLevel, beginTime, endTime, deviceSn, stationId.",
      "YES (Historical log of recorded alarms & clearances)."
    ]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["API Endpoint", "Temporal Scope", "Functional Purpose", "Key Parameters Returned", "Historical Past-Date Support?"]],
    body: endpointOverviewRows,
    columnStyles: {
      0: { cellWidth: 38, fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 42 },
      3: { cellWidth: 46 },
      4: { cellWidth: 26, halign: "center" },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // SECTION 2: PARAMETER INVENTORY (HISTORICAL VS. LIVE-ONLY)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("2. Complete Parameter Telemetry Dictionary", margin, currentY);
  currentY += 4.5;

  const parameterRows = [
    // Inverter Telemetry
    ["inverterTemperature", "Inverter", "Historical (5-min)", "Internal power electronics / IGBT heat sink temperature (°C).", "Archived from Day 1 in /api/chart/inverter/day."],
    ["pac / power", "Inverter", "Historical (5-min)", "Active instantaneous AC grid output power (kW).", "Archived from Day 1 in /api/chart/inverter/day."],
    ["eToday / eTotal", "Inverter", "Historical (Daily/Life)", "Daily cumulative generation and lifetime total generation (kWh).", "Available across all historical endpoints."],
    ["uPv1..uPv4 / iPv1..iPv4", "Inverter", "Historical (5-min)", "Individual DC string voltages and MPPT currents.", "Archived in 5-minute daily inverter curves."],
    ["uAc1..uAc3 / iAc1..iAc3", "Inverter", "Historical (5-min)", "Three-phase AC grid voltages and grid output currents.", "Archived in 5-minute daily inverter curves."],
    ["fac / powerFactor", "Inverter", "Historical (5-min)", "Grid frequency (Hz) and instantaneous operating power factor.", "Archived in 5-minute daily inverter curves."],
    
    // Battery Historical Parameters
    ["batteryCapacitySoc", "Battery", "Historical (5-min)", "Battery State of Charge percentage (0% to 100%).", "Archived from Day 1 in time-series daily curves."],
    ["batteryPower", "Battery", "Historical (5-min)", "Instantaneous battery throughput power in Watts / kW.", "Archived from Day 1 (+ = Discharge, - = Charge)."],
    ["storageBatteryVoltage", "Battery", "Historical (5-min)", "Internal high-voltage battery pack potential (V).", "Archived in 5-minute daily inverter curve."],
    ["storageBatteryCurrent", "Battery", "Historical (5-min)", "Battery pack active charging / discharging current (A).", "Archived in 5-minute daily inverter curve."],
    ["batteryTotalChargeEnergy", "Battery", "Historical (Cumulative)", "Lifetime total energy charged into battery storage (kWh).", "Archived as continuous counter."],
    ["batteryTodayChargeEnergy", "Battery", "Historical (Daily)", "Cumulative solar energy charged into battery today (kWh).", "Archived in daily and monthly endpoints."],
    ["batteryTodayDischargeEnergy", "Battery", "Historical (Daily)", "Cumulative energy discharged to backup / house today (kWh).", "Archived in daily and monthly endpoints."],
    ["batteryHealthSoh", "Battery", "Historical (5-min)", "Battery State of Health ratio (rated capacity retention %).", "Archived in daily inverter curve."],

    // Battery Parameters NOT Saved Historically
    ["bmsTemp", "Battery", "LIVE ONLY (Snapshot)", "Average overall BMS battery pack internal temperature (°C).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMinTemp", "Battery", "LIVE ONLY (Snapshot)", "Lowest cell / sensor temperature in rack (coldest spot).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMaxTemp", "Battery", "LIVE ONLY (Snapshot)", "Highest cell / sensor temperature in rack (hottest spot).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMintempLocStr", "Battery", "LIVE ONLY (Snapshot)", "Hardware coordinate of coldest spot (e.g. 0-0-220).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMaxtempLocStr", "Battery", "LIVE ONLY (Snapshot)", "Hardware coordinate of hottest spot (e.g. 0-0-112).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMinU / bmsMaxU", "Battery", "LIVE ONLY (Snapshot)", "Individual lowest and highest series cell voltages (V).", "DISCARDED by SolisCloud. Only available live."],
    ["bmsMinuLocStr / bmsMaxuLocStr", "Battery", "LIVE ONLY (Snapshot)", "Hardware coordinates of min and max voltage cells.", "DISCARDED by SolisCloud. Only available live."],
    ["batteryAlarm / failureInfo", "Battery", "LIVE ONLY (Snapshot)", "Live 16-bit BMS register fault and warning diagnostic flags.", "Only logged to alarms if threshold tripped."]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Parameter Key", "Subsystem", "Data Scope / Frequency", "Engineering Description", "Storage & Availability Status"]],
    body: parameterRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 48 },
      4: { cellWidth: 40 },
    },
  });

  // Footers
  const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`SolisCloud Technical Specification Catalog • Page ${p} of ${totalPages}`, pageWidth - margin - 55, pageHeight - 8);
  }

  const outPath = path.join(process.cwd(), "SolisCloud_API_Parameter_Specification_Report.pdf");
  fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
  console.log("PDF created successfully at:", outPath);
}

generateSolisApiCatalogPdf();
