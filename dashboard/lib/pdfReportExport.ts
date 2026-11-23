import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// -------------------------------------------------------------
// 1. PLANT REPORT TYPES & EXPORT
// -------------------------------------------------------------
export interface PlantPdfRow {
  id: string;
  name: string;
  capacityKwp: number;
  yieldKwh: number;
  chargeKwh: number;
  dischargeKwh: number;
  consumptionKwh: number;
  gridSoldKwh: number;
  gridPurchasedKwh: number;
  selfConsumptionPct?: number;
  specificYieldH?: number;
}

export interface ExportPlantReportPdfOptions {
  period: "Day" | "Month" | "Year";
  reportDate: string;
  selectedStationName: string;
  rows: PlantPdfRow[];
  chartDataUrl?: string | null;
}

export function exportPlantReportToPdf({
  period,
  reportDate,
  selectedStationName,
  rows,
  chartDataUrl,
}: ExportPlantReportPdfOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top header banner: Deep Emerald Green
  doc.setFillColor(16, 122, 67);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("P2G-CLOUD Plant Performance Report", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Automated Telemetry & Generation, Battery Storage, Consumption & Grid Energy Breakdown",
    14,
    17
  );

  // Metadata row
  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Filter Period:", 14, 30);
  doc.setFont("helvetica", "normal");
  doc.text(period.toUpperCase(), 38, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Report Date:", 75, 30);
  doc.setFont("helvetica", "normal");
  doc.text(reportDate, 98, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Station Scope:", 135, 30);
  doc.setFont("helvetica", "normal");
  doc.text(selectedStationName, 160, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Generated At:", 220, 30);
  doc.setFont("helvetica", "normal");
  const genTime = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(genTime, 245, 30);

  // Table Data (No duplicate green KPI box, no redundant total summary row)
  // Rule: kWh values have no decimals (Math.round), MWh values have required 2 decimal places
  const tableData = rows.map((r) => [
    r.name,
    `${r.capacityKwp} kWp`,
    period === "Month" || period === "Year"
      ? `${(r.yieldKwh / 1000).toFixed(2)} MWh`
      : `${Math.round(r.yieldKwh)} kWh`,
    `${Math.round(r.chargeKwh)} kWh`,
    `${Math.round(r.dischargeKwh)} kWh`,
    `${Math.round(r.consumptionKwh)} kWh`,
    `${Math.round(r.gridSoldKwh)} kWh`,
    `${Math.round(r.gridPurchasedKwh)} kWh`,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [
      [
        "Plant Name",
        "Capacity",
        `${period} Yield`,
        "Charge",
        "Discharge",
        "Consumption",
        "Grid Export",
        "Grid Import",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [16, 122, 67],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    columnStyles: {
      0: { cellWidth: 55, halign: "left", fontStyle: "bold" },
      1: { cellWidth: 28, halign: "center" },
      2: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 32, halign: "right" },
      6: { cellWidth: 31, halign: "right" },
      7: { cellWidth: 31, halign: "right" },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages
        ? (doc.internal as any).getNumberOfPages()
        : doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} | P2G-CLOUD Intelligent Energy Monitoring`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 7,
        { align: "center" }
      );
    },
  });

  // Embed chart image cleanly below table or on Page 2
  if (chartDataUrl) {
    try {
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      const chartWidth = pageWidth - 28;
      const chartHeight = 85;

      if (pageHeight - finalY < 95) {
        doc.addPage("a4", "landscape");
        doc.setFillColor(16, 122, 67);
        doc.rect(0, 0, pageWidth, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`P2G-CLOUD Plant Performance - ${period} Visual Curves & Timeline Chart`, 14, 10);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${period} Performance & Generation Curves (${selectedStationName})`, 14, 25);
        doc.addImage(chartDataUrl, "PNG", 14, 28, chartWidth, chartHeight);
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${period} Performance & Generation Curves (${selectedStationName})`, 14, finalY + 8);
        doc.addImage(chartDataUrl, "PNG", 14, finalY + 11, chartWidth, Math.min(chartHeight, pageHeight - finalY - 22));
      }
    } catch (chartErr) {
      console.warn("Could not embed chart image in PDF:", chartErr);
    }
  }

  const cleanDate = reportDate.replace(/[^0-9-]/g, "");
  doc.save(`P2G_CLOUD_Plant_Report_${period}_${cleanDate}.pdf`);
}

// -------------------------------------------------------------
// 2. INVERTER REPORT TYPES & EXPORT
// -------------------------------------------------------------
export interface InverterPdfRow {
  sn: string;
  plantName: string;
  model: string;
  ratedPowerKw: number;
  yieldKwh: number;
  pv1Voltage: number;
  pv2Voltage: number;
  temperatureC: number;
  efficiencyPct: number;
  status: string;
}

export interface ExportInverterReportPdfOptions {
  period: "Day" | "Month" | "Year";
  reportDate: string;
  selectedSn: string;
  rows: InverterPdfRow[];
  chartDataUrl?: string | null;
}

export function exportInverterReportToPdf({
  period,
  reportDate,
  selectedSn,
  rows,
  chartDataUrl,
}: ExportInverterReportPdfOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(16, 122, 67);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("P2G-CLOUD Inverter Performance & Telemetry Report", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("DC Bus Telemetry, Conversion Efficiency, Thermal Behavior & Uptime Metrics", 14, 17);

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Filter Period:", 14, 30);
  doc.setFont("helvetica", "normal");
  doc.text(period.toUpperCase(), 38, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Report Date:", 75, 30);
  doc.setFont("helvetica", "normal");
  doc.text(reportDate, 98, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Inverter Scope:", 135, 30);
  doc.setFont("helvetica", "normal");
  doc.text(selectedSn === "All" ? "All Inverters" : selectedSn, 160, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Generated At:", 220, 30);
  doc.setFont("helvetica", "normal");
  const genTime = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(genTime, 245, 30);

  const tableData = rows.map((r) => [
    r.sn,
    r.plantName,
    r.model,
    `${r.ratedPowerKw} kW`,
    period === "Month" || period === "Year"
      ? `${(r.yieldKwh / 1000).toFixed(2)} MWh`
      : `${Math.round(r.yieldKwh)} kWh`,
    `${r.pv1Voltage} V`,
    `${r.pv2Voltage} V`,
    `${r.temperatureC}°C`,
    `${r.efficiencyPct}%`,
    r.status,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [
      [
        "Inverter SN",
        "Plant Name",
        "Model",
        "Rated Power",
        `${period} Yield`,
        "PV1 Volts",
        "PV2 Volts",
        "Temp",
        "Efficiency",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [16, 122, 67],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 35, halign: "left", fontStyle: "bold" },
      1: { cellWidth: 42, halign: "left" },
      2: { cellWidth: 28, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 22, halign: "right" },
      9: { cellWidth: 22, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages
        ? (doc.internal as any).getNumberOfPages()
        : doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} | P2G-CLOUD Intelligent Inverter Monitoring`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 7,
        { align: "center" }
      );
    },
  });

  if (chartDataUrl) {
    try {
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      const chartWidth = pageWidth - 28;
      const chartHeight = 85;

      if (pageHeight - finalY < 95) {
        doc.addPage("a4", "landscape");
        doc.setFillColor(16, 122, 67);
        doc.rect(0, 0, pageWidth, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`P2G-CLOUD Inverter Performance - Output Power & Thermal Curve`, 14, 10);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Inverter AC Output Power & Temperature Profiles (${selectedSn})`, 14, 25);
        doc.addImage(chartDataUrl, "PNG", 14, 28, chartWidth, chartHeight);
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Inverter AC Output Power & Temperature Profiles (${selectedSn})`, 14, finalY + 8);
        doc.addImage(chartDataUrl, "PNG", 14, finalY + 11, chartWidth, Math.min(chartHeight, pageHeight - finalY - 22));
      }
    } catch (chartErr) {
      console.warn("Could not embed chart image in PDF:", chartErr);
    }
  }

  const cleanDate = reportDate.replace(/[^0-9-]/g, "");
  doc.save(`P2G_CLOUD_Inverter_Report_${period}_${cleanDate}.pdf`);
}

// -------------------------------------------------------------
// 3. BATTERY REPORT TYPES & EXPORT
// -------------------------------------------------------------
export interface BatteryPdfRow {
  sn: string;
  plantName: string;
  nominalCapacity: string;
  dailyChargeKwh: number;
  dailyDischargeKwh: number;
  dailyCycles: number;
  currentSocPct: number;
  healthSohPct: number;
  temperatureC: number;
  batteryStatus: string;
}

export interface ExportBatteryReportPdfOptions {
  period: "Day" | "Month" | "Year";
  reportDate: string;
  selectedSn: string;
  rows: BatteryPdfRow[];
  chartDataUrl?: string | null;
}

export function exportBatteryReportToPdf({
  period,
  reportDate,
  selectedSn,
  rows,
  chartDataUrl,
}: ExportBatteryReportPdfOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(16, 122, 67);
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("P2G-CLOUD Battery Storage & Health Report", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Energy Throughput, SOC Trajectory, Cycle Count, Thermal & SOH Diagnostics", 14, 17);

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Filter Period:", 14, 30);
  doc.setFont("helvetica", "normal");
  doc.text(period.toUpperCase(), 38, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Report Date:", 75, 30);
  doc.setFont("helvetica", "normal");
  doc.text(reportDate, 98, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Battery Scope:", 135, 30);
  doc.setFont("helvetica", "normal");
  doc.text(selectedSn === "All" ? "All Battery Packs" : selectedSn, 160, 30);

  doc.setFont("helvetica", "bold");
  doc.text("Generated At:", 220, 30);
  doc.setFont("helvetica", "normal");
  const genTime = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(genTime, 245, 30);

  const tableData = rows.map((r) => [
    r.sn,
    r.plantName,
    r.nominalCapacity,
    period === "Month" || period === "Year"
      ? `${(r.dailyChargeKwh / 1000).toFixed(2)} MWh`
      : `${Math.round(r.dailyChargeKwh)} kWh`,
    period === "Month" || period === "Year"
      ? `${(r.dailyDischargeKwh / 1000).toFixed(2)} MWh`
      : `${Math.round(r.dailyDischargeKwh)} kWh`,
    `${r.dailyCycles}`,
    `${Math.round(r.currentSocPct)}%`,
    `${Math.round(r.healthSohPct)}%`,
    `${Math.round(r.temperatureC)}°C`,
    r.batteryStatus,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [
      [
        "Battery SN",
        "Plant Name",
        "Capacity",
        "Charge",
        "Discharge",
        "Cycles",
        "SOC %",
        "SOH %",
        "Temp",
        "Status",
      ],
    ],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [16, 122, 67],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 42, halign: "left", fontStyle: "bold" },
      1: { cellWidth: 45, halign: "left" },
      2: { cellWidth: 26, halign: "center" },
      3: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 20, halign: "right" },
      7: { cellWidth: 20, halign: "right" },
      8: { cellWidth: 20, halign: "right" },
      9: { cellWidth: 20, halign: "center" },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as any).getNumberOfPages
        ? (doc.internal as any).getNumberOfPages()
        : doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} | P2G-CLOUD Intelligent Battery Diagnostics`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 7,
        { align: "center" }
      );
    },
  });

  if (chartDataUrl) {
    try {
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      const chartWidth = pageWidth - 28;
      const chartHeight = 85;

      if (pageHeight - finalY < 95) {
        doc.addPage("a4", "landscape");
        doc.setFillColor(16, 122, 67);
        doc.rect(0, 0, pageWidth, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`P2G-CLOUD Battery Performance - Power & SOC Trajectory`, 14, 10);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Battery Charge/Discharge Power & SOC Curve (${selectedSn})`, 14, 25);
        doc.addImage(chartDataUrl, "PNG", 14, 28, chartWidth, chartHeight);
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Battery Charge/Discharge Power & SOC Curve (${selectedSn})`, 14, finalY + 8);
        doc.addImage(chartDataUrl, "PNG", 14, finalY + 11, chartWidth, Math.min(chartHeight, pageHeight - finalY - 22));
      }
    } catch (chartErr) {
      console.warn("Could not embed chart image in PDF:", chartErr);
    }
  }

  const cleanDate = reportDate.replace(/[^0-9-]/g, "");
  doc.save(`P2G_CLOUD_Battery_Report_${period}_${cleanDate}.pdf`);
}
