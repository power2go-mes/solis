/**
 * generate_clean_3sections_audit_pdf.js
 * -------------------------------------
 * Refined simple, clean, light-theme forensic audit PDF:
 * - Removed 3.2 Cell Thermal Sensor Coordinates & PCB Temperatures
 * - Removed Required Field Service Action Checklist
 * - Removed 2.1 Battery Hardware, Identity & Physical Architecture
 * - Added generous cell padding, larger row heights, constant spacing, and clean alignment
 * - Plain white background, crisp black text & subtle gray borders
 */

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableImport = require('jspdf-autotable');
const autoTable = typeof autoTableImport.default === 'function' ? autoTableImport.default : autoTableImport;

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 14;
const contentWidth = pageWidth - (margin * 2);

const BLACK = [20, 20, 20];
const HEADER_BG = [243, 244, 246]; // Light soft gray
const BORDER_COLOR = [209, 213, 219]; // Clean crisp subtle border
const ALT_ROW_BG = [250, 250, 250];

// Spacious, non-congested table theme
const tableTheme = {
  theme: 'plain',
  styles: {
    font: 'helvetica',
    fontSize: 8.5,
    textColor: BLACK,
    lineColor: BORDER_COLOR,
    lineWidth: 0.2,
    cellPadding: { top: 3.2, bottom: 3.2, left: 3.5, right: 3.5 },
    valign: 'middle',
  },
  headStyles: {
    fillColor: HEADER_BG,
    textColor: BLACK,
    fontStyle: 'bold',
    fontSize: 8.5,
    lineWidth: 0.25,
    lineColor: BORDER_COLOR,
    cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 },
    valign: 'middle',
  },
  alternateRowStyles: {
    fillColor: ALT_ROW_BG,
  }
};

let currentY = 18;

function checkPageBreak(requiredHeight) {
  if (currentY + requiredHeight > pageHeight - 16) {
    doc.addPage();
    currentY = 18;
  }
}

function printSectionHeader(title) {
  checkPageBreak(18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.text(title, margin, currentY);
  currentY += 6.5;
}

function printSubHeader(subTitle) {
  checkPageBreak(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(50, 50, 50);
  doc.text(subTitle, margin, currentY);
  currentY += 5;
}

// Document Title (Clean, simple, well-spaced)
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.setTextColor(...BLACK);
doc.text('Menu Karachi Office - Plant Technical & Cell Forensic Audit', margin, currentY);
currentY += 6;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(100, 100, 100);
doc.text('Target Plant: Menu Karachi Office (ID: 32F429 / 1298491919450797504) | Date: 24/11/2026', margin, currentY);
currentY += 10;

// =========================================================================
// SECTION 1: INVERTER TECHNICAL TELEMETRY & OPERATIONAL METRICS
// =========================================================================
printSectionHeader('SECTION 1: Inverter Technical Telemetry & Operational Metrics');

// 1.1 Hardware, Identity & Communication Profile
printSubHeader('1.1 Hardware, Identity & Communication Profile');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Parameter / Field Name', 'Inverter 1 (Master / Primary)', 'Inverter 2 (Slave / Secondary)', 'Engineering Notes']],
  body: [
    ['Inverter Serial Number (sn)', '1053050258180057', '1053050258140015', 'S6-EH3P50K-H (50 kW each)'],
    ['Model Code (model)', '5305', '5305', '50 kW 3-Phase Hybrid Series'],
    ['Rated AC Capacity (pac)', '50,000 W (50 kW)', '50,000 W (50 kW)', '100 kW Total Plant Capacity'],
    ['RS485 Modbus Address (address)', '1', '2', 'Daisy-chained on Modbus RTU'],
    ['Datalogger Stick SN (collectorId)', '7A12570303D040F0', '5A1249020280457B', 'Separate WiFi/LAN Sticks'],
    ['Inverter Firmware Version', 'F5010A-550210', 'F5010A-550210', 'Identical Main Control Build'],
    ['HMI Screen Firmware', 'F555', 'F555', 'Touchscreen Controller Firmware'],
    ['DSP Master Core Firmware', '0A10', '0A10', 'Primary PWM/MPPT Core'],
    ['DSP Slave Core Firmware', '0102', '0102', 'Protection & Safety Core'],
    ['National Grid Standard', 'IEC61727L', 'IEC61727L', 'Pakistan/International Low Voltage Intertie'],
    ['G100 Export Limitation State', 'Compliant G100 Mode 4', '0 (Disabled / Standalone)', 'Inv 1 manages export limiter'],
    ['Automatic Bypass Switch', 'OFF (Normal Inverter Mode)', 'OFF (Normal Inverter Mode)', 'Bypass contactor open'],
    ['Operating State Machine (state)', '1 (Normal Operation)', '1 (Normal Operation)', 'Both reporting State 1']
  ],
  columnStyles: {
    0: { cellWidth: 52, fontStyle: 'bold' },
    1: { cellWidth: 43 },
    2: { cellWidth: 43 },
    3: { cellWidth: 44 }
  }
});
currentY = doc.lastAutoTable.finalY + 9;

// 1.2 High-Voltage DC Solar MPPT Channels
printSubHeader('1.2 High-Voltage DC Solar MPPT Channels (All 8 Strings)');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['DC PV String', 'Metric', 'Inverter 1', 'Inverter 2', 'Variance / Anomaly']],
  body: [
    ['String 1 (MPPT 1)', 'Voltage / Current / Power', '711.4 V / 6.5 A / 4,624 W', '806.3 V / 5.6 A / 4,515 W', 'Healthy string operations'],
    ['String 2 (MPPT 2)', 'Voltage / Current / Power', '703.6 V / 12.3 A / 8,654 W', '804.7 V / 5.5 A / 4,425 W', 'Inv 1 has parallel strings'],
    ['String 3 (MPPT 3)', 'Voltage / Current / Power', '709.9 V / 11.8 A / 8,376 W', '803.6 V / 5.6 A / 4,500 W', 'Inv 1 has parallel strings'],
    ['String 4 (MPPT 4)', 'Voltage / Current / Power', '660.5 V / 13.2 A / 8,718 W', '52.4 V / 0.0 A / 0 W', 'CRITICAL: Open Circuit / Blown Fuse'],
    ['TOTAL SOLAR DC INPUT', 'Current & Power', '43.8 A / 30,372 W (30.4 kW)', '16.7 A / 13,440 W (13.4 kW)', 'Inv 2 generates 56% less solar DC power']
  ],
  columnStyles: {
    0: { cellWidth: 38, fontStyle: 'bold' },
    1: { cellWidth: 38 },
    2: { cellWidth: 38 },
    3: { cellWidth: 35 },
    4: { cellWidth: 33 }
  }
});
currentY = doc.lastAutoTable.finalY + 9;

// 1.3 3-Phase AC Grid Metrics & Power Quality
printSubHeader('1.3 3-Phase AC Grid Metrics & Power Quality');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Parameter / Field Name', 'Inverter 1 (Primary)', 'Inverter 2 (Secondary)', 'Units', 'Significance']],
  body: [
    ['Active AC Output Power (pac)', '30.1 kW', '13.1 kW', 'kW', 'Active power supplied'],
    ['Apparent Power (apparentPower)', '5.51 kVA', '13.45 kVA', 'kVA', 'Total vector load'],
    ['Reactive Power (reactivePower)', '+60.0 Var', '-190.0 Var', 'Var', 'Inductive (+) vs Capacitive (-)'],
    ['Power Factor (cos phi)', '0.99', '0.98', 'Ratio', 'High efficiency grid power factor'],
    ['AC Utility Frequency (fac)', '49.86 Hz', '49.98 Hz', 'Hz', 'Grid utility nominal 50 Hz'],
    ['Phase L1-N Voltage (uAc1)', '230.8 V', '229.5 V', 'V', 'Phase 1 potential'],
    ['Phase L2-N Voltage (uAc2)', '229.8 V', '229.5 V', 'V', 'Phase 2 potential'],
    ['Phase L3-N Voltage (uAc3)', '235.1 V', '234.9 V', 'V', 'Phase 3 potential'],
    ['Phase L1 Current (iAc1)', '7.6 A', '7.9 A', 'A', 'Phase 1 line current'],
    ['Phase L2 Current (iAc2)', '5.0 A', '6.1 A', 'A', 'Phase 2 line current'],
    ['Phase L3 Current (iAc3)', '11.1 A', '11.7 A', 'A', 'Phase 3 line current']
  ],
  columnStyles: {
    0: { cellWidth: 50, fontStyle: 'bold' },
    1: { cellWidth: 33 },
    2: { cellWidth: 33 },
    3: { cellWidth: 18, halign: 'center' },
    4: { cellWidth: 48 }
  }
});
currentY = doc.lastAutoTable.finalY + 9;

// 1.4 Thermal Profile & Cumulative Production Registers
printSubHeader('1.4 Thermal Profile & Cumulative Production Registers');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Telemetry Register', 'Inverter 1', 'Inverter 2', 'Variance Analysis']],
  body: [
    ['Internal Power Stage Temp (inverterTemperature)', '32.0°C', '40.1°C', '+8.1°C Hotter on Inverter 2'],
    ['Ambient / Auxiliary Temp (inverterTemperature2)', '0.0°C', '0.0°C', 'No external RTD sensor installed'],
    ['Today\'s PV Energy Yield (eToday)', '88 kWh', '33 kWh', 'Inv 2 produced 55 kWh less today'],
    ['Current Month Yield (eMonth)', '4.48 MWh', '1.92 MWh', 'Inv 2 runs at less than half monthly yield'],
    ['Current Year Yield (eYear)', '25.95 MWh', '4.57 MWh', 'Historical tracking'],
    ['Lifetime Total Production (eTotal)', '26.18 MWh', '4.95 MWh', 'Significant operational age difference'],
    ['Today\'s Battery Ingested Energy', '66 kWh', '0 kWh', 'Inv 2 stored 0 kWh into battery today'],
    ['Today\'s Battery Discharged Energy', '93 kWh', '28.7 kWh', 'Inv 2 battery was drained earlier & died']
  ],
  columnStyles: {
    0: { cellWidth: 56, fontStyle: 'bold' },
    1: { cellWidth: 30 },
    2: { cellWidth: 30 },
    3: { cellWidth: 66 }
  }
});
currentY = doc.lastAutoTable.finalY + 11;

// =========================================================================
// SECTION 2: HIGH-VOLTAGE BATTERY RACKS OVERVIEW
// =========================================================================
printSectionHeader('SECTION 2: High-Voltage Battery Racks Overview');

// 2.1 Live State of Charge, Electrical Telemetry & BMS Power
printSubHeader('2.1 Live State of Charge, Electrical Telemetry & BMS Power');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Electrical Telemetry Parameter', 'Rack 1', 'Rack 2', 'Rack 3']],
  body: [
    ['State of Charge (batteryCapacitySoc)', '74%', '73%', '33% (Critical 41% Deficit)'],
    ['State of Health (batteryHealthSoh)', '100%', '100%', '100%'],
    ['Life Cycle Counter (bmsLoopNum)', '96 cycles', '100 cycles', '37 cycles (Stalled / Underused)'],
    ['Inverter Terminal Voltage (batteryVoltage)', '728.9 V', '725.1 V', '703.8 V (25.1 V Lower)'],
    ['Internal BMS Bus Voltage (storageBatteryVoltage)', '731.0 V', '725.1 V', '701.2 V'],
    ['Live Battery Current (bstteryCurrent)', '+23.8 A (Charging)', '+23.5 A (Charging)', '0.0 A (Zero Flow)'],
    ['BMS Computed Power (batteryPowerBms)', '17,348 W (17.3 kW)', '17,028 W (17.0 kW)', '0 W (Standby Locked)'],
    ['Inverter DC-DC Stage Power (batteryPower)', '17,400 W (17.4 kW)', '17,100 W (17.1 kW)', '0 W (Standby Locked)'],
    ['BMS State Machine Code (bmsState)', '0 (Normal Active)', '0 (Normal Active)', '0 (Safety Standby Locked)'],
    ['Internal Hardware Fault Register 01', '0 (No Bit Errors)', '0 (No Bit Errors)', '0 (No Bit Errors)'],
    ['Internal Hardware Fault Register 02', '0 (No Bit Errors)', '0 (No Bit Errors)', '0 (No Bit Errors)']
  ],
  columnStyles: {
    0: { cellWidth: 56, fontStyle: 'bold' },
    1: { cellWidth: 40 },
    2: { cellWidth: 40 },
    3: { cellWidth: 46 }
  }
});
currentY = doc.lastAutoTable.finalY + 9;

// 2.2 BMS Dynamic Operational Limits & Protection Setpoints
printSubHeader('2.2 BMS Dynamic Operational Limits & Protection Setpoints');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Protection / Operational Parameter', 'Rack 1', 'Rack 2', 'Rack 3']],
  body: [
    ['Dynamic Max Charge Current (batteryChargingCurrent)', '68.0 A', '69.0 A', '0.0 A (BMS Hard Shutdown)'],
    ['Dynamic Max Discharge Current (batteryDischargeLimiting)', '68.0 A', '69.0 A', '0.0 A (BMS Hard Shutdown)'],
    ['BMS Charge Cutoff Voltage (batteryChargingVoltage)', '788.4 V', '788.4 V', '788.4 V'],
    ['BMS Discharge Cutoff Voltage (bmsDischargeU)', '583.2 V', '583.2 V', '583.2 V'],
    ['Over-Voltage Protection (batteryOvpSet)', '800.0 V', '800.0 V', '800.0 V'],
    ['Under-Voltage Protection (batteryUvpSet)', '150.0 V', '150.0 V', '150.0 V'],
    ['Float Charge Voltage (batteryFcvSet)', '590.0 V', '590.0 V', '580.0 V (10V offset)'],
    ['Absorption Charge Voltage (batteryAcvSet)', '800.0 V', '800.0 V', '535.0 V'],
    ['Force-Charge Lower SOC Target (socChargingSet)', '10%', '10%', '10%'],
    ['Discharge Lower Cutoff Reserve (socDischargeSet)', '25%', '25%', '25%'],
    ['Configured Max Charge Limit (batteryCMaxiSet)', '25.0 A', '25.0 A', '0.0 A'],
    ['Configured Max Discharge Limit (batteryDMaxiSet)', '50.0 A', '50.0 A', '0.0 A']
  ],
  columnStyles: {
    0: { cellWidth: 56, fontStyle: 'bold' },
    1: { cellWidth: 40 },
    2: { cellWidth: 40 },
    3: { cellWidth: 46 }
  }
});
currentY = doc.lastAutoTable.finalY + 11;

// =========================================================================
// SECTION 3: DEEP CELL-LEVEL FORENSIC ANALYSIS
// =========================================================================
printSectionHeader('SECTION 3: Deep Cell-Level Forensic Analysis (Min / Max Voltages & Locations)');

// 3.1 High-Resolution Cell Extremes & Hardware Coordinate Mapping
printSubHeader('3.1 High-Resolution Cell Extremes & Hardware Coordinate Mapping');
autoTable(doc, {
  ...tableTheme,
  startY: currentY,
  margin: { left: margin, right: margin },
  head: [['Forensic Cell Indicator', 'Rack 1 (...BAT01)', 'Rack 2 (...BAT02)', 'Rack 3 (...BAT01)']],
  body: [
    ['Lowest Cell Voltage (Vmin)', '3.353 V', '3.352 V', '3.019 V - 3.028 V'],
    ['Lowest Cell Coordinate (bmsMinuLocStr)', '0-0-103', '0-0-11', '0-0-117 (Fault Location)'],
    ['Min Cell Hardware Index Byte 1 / Byte 2', '103 / 0', '11 / 0', '117 / 0'],
    ['Physical Location in Battery Cabinet', 'Module #5, Cell #7', 'Module #1, Cell #11', 'Module #5, Cell #21'],
    ['Highest Cell Voltage (Vmax)', '3.363 V', '3.361 V', '3.357 V - 3.361 V'],
    ['Highest Cell Coordinate (bmsMaxuLocStr)', '0-0-169', '0-0-109', '0-0-118 (Adjacent Cell)'],
    ['Max Cell Hardware Index Byte 1 / Byte 2', '169 / 0', '109 / 0', '118 / 0'],
    ['Physical Location in Battery Cabinet', 'Module #8, Cell #1', 'Module #5, Cell #13', 'Module #5, Cell #22'],
    ['Calculated Cell Spread Delta (Delta V)', '10.0 mV (0.010 V)', '9.0 mV (0.009 V)', '329.0 mV - 342.0 mV (0.342 V)'],
    ['Industry Health Threshold', '< 15 - 20 mV (Healthy)', '< 15 - 20 mV (Healthy)', '>17x BEYOND TOLERANCE LIMIT']
  ],
  columnStyles: {
    0: { cellWidth: 54, fontStyle: 'bold' },
    1: { cellWidth: 40 },
    2: { cellWidth: 40 },
    3: { cellWidth: 48 }
  }
});
currentY = doc.lastAutoTable.finalY + 9;

// 3.2 Engineering Root-Cause Synthesis: Why Rack 3 is Locked Down
printSubHeader('3.2 Engineering Root-Cause Synthesis: Why Rack 3 is Locked Down');
checkPageBreak(30);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...BLACK);

const synthesis = [
  '• Cell Spread Imbalance: Inside Module #5 of Rack 3, Cell #21 (0-0-117) collapsed down to 3.019 V, while adjacent Cell #22 (0-0-118) is resting at 3.361 V, generating an extreme 342.0 mV delta (acceptable threshold is < 20 mV).',
  '',
  '• BMS Safety Tripping: Cell 0-0-117 reached the steep lower discharge curve knee (< 3.10 V). To protect against reverse polarity and irreversible cell damage, the internal BMS engaged Under-Voltage Protection and clamped both charge and discharge currents to 0.0 A.',
  '',
  '• Inverter 2 Operating Deficit: Rack 3 is completely locked out in Standby (0 W flow). Combined with PV String 4 generating 0 W (52.4 V open circuit), Inverter 2 is operating at a 56% generation loss and repeatedly logged historical alarms 1054 UN-Vbatt and 1055 NO-Battery.'
];

synthesis.forEach(line => {
  if (line === '') {
    currentY += 2;
  } else {
    const splitText = doc.splitTextToSize(line, contentWidth);
    doc.text(splitText, margin, currentY);
    currentY += (splitText.length * 4.5);
  }
});

// Running clean footer
const totalPages = doc.internal.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
  doc.setPage(p);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 10);
}

// Output paths
const outPathRoot = path.join(__dirname, 'Menu_Karachi_Plant_Technical_And_Cell_Forensic_Audit.pdf');
const outPathPublic = path.join(__dirname, 'public', 'Menu_Karachi_Plant_Technical_And_Cell_Forensic_Audit.pdf');
const buf = Buffer.from(doc.output('arraybuffer'));

fs.writeFileSync(outPathRoot, buf);
fs.writeFileSync(outPathPublic, buf);

console.log('Spacious, clean PDF generated successfully!');
console.log('Saved to:', outPathRoot);
console.log('Saved to:', outPathPublic);
console.log('Total pages:', totalPages);
