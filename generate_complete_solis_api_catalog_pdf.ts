import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import fs from "fs";
import path from "path";

function generateCompleteSolisApiCatalogPdf() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const BLACK: [number, number, number] = [20, 20, 20];
  const GRAY: [number, number, number] = [90, 95, 105];
  const BORDER_COLOR: [number, number, number] = [215, 220, 228];
  const HEAD_BG: [number, number, number] = [243, 245, 248];

  const tableTheme = {
    theme: "plain" as const,
    styles: {
      font: "helvetica" as const,
      fontSize: 7.2,
      textColor: BLACK,
      lineColor: BORDER_COLOR,
      lineWidth: 0.18,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      valign: "middle" as const,
    },
    headStyles: {
      fillColor: HEAD_BG,
      textColor: BLACK,
      fontStyle: "bold" as const,
      fontSize: 7.5,
      lineWidth: 0.22,
      lineColor: [200, 205, 212] as [number, number, number],
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 },
      valign: "middle" as const,
    },
    alternateRowStyles: {
      fillColor: [252, 253, 254] as [number, number, number],
    },
  };

  let currentY = 14;

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("SolisCloud Platform Comprehensive API & Parameter Master Directory", margin, currentY);
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
  doc.text("Complete Inventory of All SolisCloud APIs, Data Classification (Live vs. Historical), and Full Parameter Breakdown", margin, currentY);
  currentY += 4.5;
  doc.text(`Generated: ${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} PKT | Scope: Inverter, Battery, BMS, Station, Collector, Alarm & Chart APIs`, margin, currentY);
  currentY += 6;

  // Overview Note Box
  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(margin, currentY, contentWidth, 12, 1.2, 1.2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
  doc.text("Technical Telemetry Notice:", margin + 3, currentY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.0);
  doc.setTextColor(60, 65, 75);
  doc.text(
    "SolisCloud categorizes API endpoints into Live Real-Time Snapshots (instantaneous status) and Historical Time-Series Curves (5-minute logs).",
    margin + 3,
    currentY + 7.5
  );
  doc.text(
    "Battery cell-level thermals (bmsMinTemp, bmsMaxTemp, cell locations) only exist in live endpoints. Time-series historical curves log inverter temp, battery power & SOC.",
    margin + 3,
    currentY + 10.5
  );
  currentY += 16;

  // Function to print section headers
  const printSection = (title: string) => {
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 14;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(title, margin, currentY);
    currentY += 4.2;
  };

  // ==========================================
  // SECTION 1: BATTERY & BMS SPECIFIC APIS
  // ==========================================
  printSection("1. Battery, Cell & BMS Dedicated APIs");
  const batteryApiRows = [
    [
      "/api/inverter/detail\n(/v1/api/inverterDetail)",
      "Live Snapshot\n(Real-Time)",
      "Returns complete inverter telemetry along with connected batteryList[] containing all live BMS cell and pack registers.",
      "• batteryList[].bmsTemp: Average pack temperature (°C)\n" +
      "• batteryList[].bmsMinTemp: Lowest cell temperature (°C)\n" +
      "• batteryList[].bmsMaxTemp: Highest cell temperature (°C)\n" +
      "• batteryList[].bmsMintempLocStr: Coordinate of min temp (e.g. 0-0-220)\n" +
      "• batteryList[].bmsMaxtempLocStr: Coordinate of max temp (e.g. 0-0-112)\n" +
      "• batteryList[].bmsMintempLoc1: Raw numeric index of min temp sensor\n" +
      "• batteryList[].bmsMaxtempLoc1: Raw numeric index of max temp sensor\n" +
      "• batteryList[].bmsMinU: Lowest individual cell voltage (V)\n" +
      "• batteryList[].bmsMaxU: Highest individual cell voltage (V)\n" +
      "• batteryList[].bmsMinuLocStr: Coordinate of min voltage cell (e.g. 0-0-14)\n" +
      "• batteryList[].bmsMaxuLocStr: Coordinate of max voltage cell (e.g. 0-0-1)\n" +
      "• batteryList[].batteryCapacitySoc: State of Charge (0-100%)\n" +
      "• batteryList[].batteryHealthSoh: State of Health (0-100%)\n" +
      "• batteryList[].storageBatteryVoltage: Internal pack series voltage (V)\n" +
      "• batteryList[].bstteryCurrent: Live charge/discharge current (A)\n" +
      "• batteryList[].batteryPowerBms: Instantaneous battery throughput (W)\n" +
      "• batteryList[].bmsLoopNum: Total lifetime completed cycle count\n" +
      "• batteryList[].bmsMNum: Number of stacked hardware modules (e.g. 9)\n" +
      "• batteryList[].bmsStrNum: Number of series cells per module (e.g. 24)\n" +
      "• batteryList[].batteryChargingVoltage: BMS max target voltage (V)\n" +
      "• batteryList[].batteryChargingCurrent: BMS charge current limit (A)\n" +
      "• batteryList[].batteryDischargeLimiting: BMS discharge current limit (A)\n" +
      "• batteryList[].bmsDischargeU: Deep discharge cutoff voltage limit (V)\n" +
      "• batteryList[].batteryUvpSet / batteryOvpSet: Under/Over voltage trip points (V)\n" +
      "• batteryList[].batteryAlarm / failureInfo: Live BMS error & fault codes."
    ],
    [
      "/api/battery/detail\n(/v1/api/batteryDetail)",
      "Live Snapshot\n(Device Lookup)",
      "Dedicated query for individual battery serial number.",
      "• sn: Battery serial identifier\n" +
      "• capacity: Rated energy capacity (kWh / Ah)\n" +
      "• voltage / current: Instantaneous electrical bus state\n" +
      "• soc: Current state of charge (%)\n" +
      "• state: Operational state machine flag (1 = Active, 0 = Offline)\n" +
      "• Note: If BMS CAN is unmapped, returns B0124 (unsupported by sub-collector)."
    ],
    [
      "/api/battery/detailList\n(/v1/api/batteryDetailList)",
      "Live Snapshot\n(Fleet Query)",
      "Queries list of all battery packs associated with a station or inverter.",
      "• page.records[].sn: Battery hardware serial\n" +
      "• page.records[].type: Chemistry type (0 = Lithium, 256 = Pylontech HV)\n" +
      "• page.records[].soc: Current battery charge percentage\n" +
      "• page.records[].voltage / current: Electrical bus telemetry\n" +
      "• page.records[].dayChargeEnergy: Energy ingested today (kWh)\n" +
      "• page.records[].dayDischargeEnergy: Energy delivered today (kWh)."
    ]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["API Endpoint", "Data Scope", "Functional Purpose", "Detailed Parameters Returned"]],
    body: batteryApiRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 46 },
      3: { cellWidth: 72 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // SECTION 2: HISTORICAL TIME-SERIES APIS
  // ==========================================
  printSection("2. Historical Daily & Monthly Time-Series Telemetry APIs");
  const historicalApiRows = [
    [
      "/api/chart/inverter/day\n(/v1/api/inverterDay)",
      "Historical Daily\n(5-Min Resolution)",
      "Returns 288 chronological records per day for any target calendar date from Day 1 to present.",
      "• inverterTemperature: Internal IGBT heat sink operating temp (°C)\n" +
      "• batteryCapacitySoc: 5-minute historical Battery SOC (%)\n" +
      "• batteryPower: 5-minute battery charge (-) / discharge (+) watts\n" +
      "• batteryVoltage / storageBatteryVoltage: DC bus potential (V)\n" +
      "• bstteryCurrent / storageBatteryCurrent: Active battery current (A)\n" +
      "• batteryChargingCurrent: Dynamic BMS charge limit (A)\n" +
      "• batteryDischargeLimiting: Dynamic BMS discharge limit (A)\n" +
      "• batteryTodayChargeEnergy: Cumulative kWh charged today\n" +
      "• batteryTodayDischargeEnergy: Cumulative kWh discharged today\n" +
      "• batteryTotalChargeEnergy: Cumulative lifetime kWh charged\n" +
      "• batteryTotalDischargeEnergy: Cumulative lifetime kWh discharged\n" +
      "• pac: Inverter active AC output power (kW)\n" +
      "• eToday / eTotal: Daily & lifetime energy generation (kWh)\n" +
      "• uPv1..uPv4 / iPv1..iPv4: DC string voltages & MPPT currents\n" +
      "• uAc1..uAc3 / iAc1..iAc3: Grid phase voltages & output currents\n" +
      "• fac: Utility grid frequency (Hz)\n" +
      "• familyLoadPower / bypassLoadPower: Facility consumption (W)\n" +
      "• Note: bmsTemp and cell coordinates are NOT included in this time-series."
    ],
    [
      "/api/chart/station/day/v2\n(/v1/api/stationDay)",
      "Historical Daily\n(5-Min Resolution)",
      "Plant-wide historical power distribution and battery energy profile.",
      "• batteryPower: Plant-level battery power flow curve (kW)\n" +
      "• batteryCapacitySocList: Chronological SOC curve across the day\n" +
      "• produceEnergy / consumeEnergy: Solar generated vs. load consumed\n" +
      "• familyLoadPowerList: Facility load profile\n" +
      "• psum / directRPowerList: Grid export/import power curve\n" +
      "• backup2PowerList: Backup / critical load delivery curve\n" +
      "• pvAndAcCoupledPowerList: Total solar array throughput."
    ],
    [
      "/api/chart/station/month\n(/v1/api/stationMonth)",
      "Historical Monthly\n(Daily Totals)",
      "Day-by-day aggregated energy production and storage utilization.",
      "• energy: Daily solar energy generated (kWh)\n" +
      "• batteryChargeEnergy: Daily battery energy stored (kWh)\n" +
      "• batteryDischargeEnergy: Daily battery energy delivered (kWh)\n" +
      "• homeLoadEnergy: Daily facility consumption (kWh)\n" +
      "• gridPurchasedEnergy: Daily utility electricity purchased (kWh)\n" +
      "• gridSellEnergy: Daily solar energy exported to utility grid (kWh)."
    ],
    [
      "/api/chart/station/year\n(/v1/api/stationYear)",
      "Historical Annual\n(Monthly Totals)",
      "Month-by-month aggregated energy generation across calendar years.",
      "• energy: Total monthly solar production (kWh / MWh)\n" +
      "• batteryChargeEnergy: Monthly battery charge throughput (kWh)\n" +
      "• batteryDischargeEnergy: Monthly battery discharge delivery (kWh)\n" +
      "• homeLoadEnergy: Total monthly domestic / facility load (kWh)\n" +
      "• peakPower: Maximum recorded solar power peak in month (kW)."
    ]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["API Endpoint", "Data Scope", "Functional Purpose", "Detailed Parameters Returned"]],
    body: historicalApiRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 46 },
      3: { cellWidth: 72 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // SECTION 3: INVERTER & COLLECTOR STATUS APIS
  // ==========================================
  printSection("3. Inverter, Collector & Station Status APIs");
  const hardwareApiRows = [
    [
      "/api/station/detailMix\n(/v1/api/stationDetail)",
      "Live Snapshot\n(Plant Level)",
      "Plant overview, live meteorological data, and cumulative lifetime totals.",
      "• stationName: Configured plant name\n" +
      "• capacity: Total installed PV capacity (kWp)\n" +
      "• power: Real-time solar generating power (kW)\n" +
      "• allEnergy / allEnergyStr: Lifetime total solar production (kWh / MWh)\n" +
      "• batteryTotalChargeEnergy: Total lifetime battery charge (kWh)\n" +
      "• batteryTotalDischargeEnergy: Total lifetime battery discharge (kWh)\n" +
      "• gridPurchasedTotalEnergy: Total lifetime grid energy bought (kWh)\n" +
      "• gridSellTotalEnergy: Total lifetime green energy exported (kWh)\n" +
      "• homeLoadTotalEnergy: Total lifetime facility consumption (kWh)\n" +
      "• fisGenerateTimeStr: Certified day-one commissioning date\n" +
      "• generateDays: Total active operating days logged."
    ],
    [
      "/api/collector/list\n(/v1/api/collectorList)",
      "System Config\n(Hardware Inventory)",
      "Enumerates data logging sticks (GPRS / WiFi / LAN) and associated inverters.",
      "• page.records[].sn: Data logger stick serial number\n" +
      "• page.records[].inverterSn: Connected solar/hybrid inverter serial\n" +
      "• page.records[].state: Online status (1 = Online, 2 = Offline)\n" +
      "• page.records[].model: Data logger hardware model\n" +
      "• page.records[].signal: Wireless RSSI signal strength."
    ],
    [
      "/api/alarm/list\n(/v1/api/alarmList)",
      "Historical Log\n(Event Driven)",
      "Chronological log of inverter and battery hardware alarms, faults, and grid trips.",
      "• alarmCode: Hardware error code (e.g. 1010, F01)\n" +
      "• alarmMessage: Textual fault description\n" +
      "• alarmLevel: Severity level (1 = Notice, 2 = Warning, 3 = Fault)\n" +
      "• deviceSn: Serial number of triggering device\n" +
      "• beginTime: Exact timestamp when alarm occurred\n" +
      "• endTime: Timestamp when fault cleared / auto-reset."
    ]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["API Endpoint", "Data Scope", "Functional Purpose", "Detailed Parameters Returned"]],
    body: hardwareApiRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 46 },
      3: { cellWidth: 72 },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ==========================================
  // SECTION 4: MASTER PARAMETER AVAILABILITY MATRIX
  // ==========================================
  printSection("4. Master Parameter Availability & Storage Summary Matrix");
  const matrixRows = [
    ["Inverter Temperature", "Inverter", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Inverter heat sink / IGBT thermistor."],
    ["Active Power (pac)", "Inverter", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Instantaneous AC generation output."],
    ["Daily Energy (eToday)", "Inverter", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Cumulative daily kWh generated."],
    ["PV Voltages / Currents", "Inverter", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Strings uPv1..uPv4 and iPv1..iPv4."],
    ["Grid Voltages / Currents", "Inverter", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Three-phase grid voltages and currents."],
    ["Battery SOC (%)", "Battery", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Battery percentage state of charge."],
    ["Battery Power (kW)", "Battery", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Active charging/discharging power."],
    ["Battery Voltage (V)", "Battery", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "High-voltage DC bus voltage."],
    ["Battery Current (A)", "Battery", "YES (/api/chart/inverter/day)", "YES (/api/inverter/detail)", "Active battery charge/discharge flow."],
    ["BMS Average Temp", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Average pack temperature across cells."],
    ["BMS Min Cell Temp", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Lowest recorded cell temperature."],
    ["BMS Max Cell Temp", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Highest recorded cell temperature."],
    ["Min Temp Location", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Sensor coordinate of min temp (e.g. 0-0-220)."],
    ["Max Temp Location", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Sensor coordinate of max temp (e.g. 0-0-112)."],
    ["Min Cell Voltage", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Lowest series cell voltage."],
    ["Max Cell Voltage", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Highest series cell voltage."],
    ["Cell Voltage Locations", "Battery", "NO (Not archived by Solis)", "YES (/api/inverter/detail)", "Sensor coordinates for min/max voltage cells."]
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Parameter Name", "System", "Historical Storage (Past Dates)?", "Live Availability (Real-Time)?", "Technical Specification"]],
    body: matrixRows,
    columnStyles: {
      0: { cellWidth: 42, fontStyle: "bold" },
      1: { cellWidth: 22, halign: "center" },
      2: { cellWidth: 42, halign: "center" },
      3: { cellWidth: 38, halign: "center" },
      4: { cellWidth: 42 },
    },
  });

  // Footer Page Numbers
  const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1;
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`SolisCloud API Master Directory & Parameter Specification • Page ${p} of ${totalPages}`, pageWidth - margin - 60, pageHeight - 8);
  }

  const outPath = path.join(process.cwd(), "SolisCloud_Complete_API_and_Parameters_Directory.pdf");
  fs.writeFileSync(outPath, Buffer.from(doc.output("arraybuffer")));
  console.log("Master PDF created successfully at:", outPath);
}

generateCompleteSolisApiCatalogPdf();
