import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  // Landscape orientation to comfortably fit all energy telemetry columns
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top header background banner: Deep Emerald Green
  doc.setFillColor(16, 122, 67); // #107a43 Rich Green
  doc.rect(0, 0, pageWidth, 22, "F");

  // Title & Subtitle in banner
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("POWER2G-cloud Fleet Plant Performance Report", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Automated Telemetry & Generation, Battery Storage, Consumption & Grid Energy Breakdown",
    14,
    17
  );

  // Filter & Generation metadata badge
  doc.setTextColor(51, 65, 85); // Slate 700
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Filter Period:`, 14, 30);
  doc.setFont("helvetica", "normal");
  doc.text(`${period.toUpperCase()}`, 38, 30);

  doc.setFont("helvetica", "bold");
  doc.text(`Report Date:`, 75, 30);
  doc.setFont("helvetica", "normal");
  doc.text(`${reportDate}`, 98, 30);

  doc.setFont("helvetica", "bold");
  doc.text(`Station Scope:`, 135, 30);
  doc.setFont("helvetica", "normal");
  doc.text(`${selectedStationName}`, 160, 30);

  doc.setFont("helvetica", "bold");
  doc.text(`Generated At:`, 220, 30);
  doc.setFont("helvetica", "normal");
  const genTime = new Intl.DateTimeFormat("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());
  doc.text(genTime, 245, 30);

  // Summary KPI Cards Box
  const totalCapacity = rows.reduce((acc, r) => acc + (r.capacityKwp || 0), 0);
  const totalYield = rows.reduce((acc, r) => acc + (r.yieldKwh || 0), 0);
  const totalCharge = rows.reduce((acc, r) => acc + (r.chargeKwh || 0), 0);
  const totalDischarge = rows.reduce((acc, r) => acc + (r.dischargeKwh || 0), 0);
  const totalConsumption = rows.reduce((acc, r) => acc + (r.consumptionKwh || 0), 0);
  const totalExport = rows.reduce((acc, r) => acc + (r.gridSoldKwh || 0), 0);
  const totalImport = rows.reduce((acc, r) => acc + (r.gridPurchasedKwh || 0), 0);

  // Border & background for KPIs: Clean light green tint
  doc.setDrawColor(187, 247, 208); // Emerald 200
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.roundedRect(14, 34, pageWidth - 28, 16, 2, 2, "FD");

  const kpis = [
    { label: "Plants Count", val: `${rows.length}` },
    { label: "Total Capacity", val: `${totalCapacity.toFixed(1)} kWp` },
    { label: "Total Yield (PV)", val: `${totalYield.toFixed(1)} kWh` },
    { label: "Total Charge", val: `${totalCharge.toFixed(1)} kWh` },
    { label: "Total Discharge", val: `${totalDischarge.toFixed(1)} kWh` },
    { label: "Total Consumption", val: `${totalConsumption.toFixed(1)} kWh` },
    { label: "Grid Export", val: `${totalExport.toFixed(1)} kWh` },
    { label: "Grid Import", val: `${totalImport.toFixed(1)} kWh` },
  ];

  const colWidth = (pageWidth - 28) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * colWidth + 2;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(kpi.label, x, 40);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 122, 67); // Deep Green
    doc.text(kpi.val, x, 46);
  });

  // Table Data (without Self-Cons. and Specific Yield)
  const tableData = rows.map((r) => [
    r.name,
    `${r.capacityKwp} kWp`,
    `${r.yieldKwh.toFixed(1)} kWh`,
    `${r.chargeKwh.toFixed(1)} kWh`,
    `${r.dischargeKwh.toFixed(1)} kWh`,
    `${r.consumptionKwh.toFixed(1)} kWh`,
    `${r.gridSoldKwh.toFixed(1)} kWh`,
    `${r.gridPurchasedKwh.toFixed(1)} kWh`,
  ]);

  // Add Summary row at bottom
  tableData.push([
    "Total / Fleet Summary",
    `${totalCapacity.toFixed(1)} kWp`,
    `${totalYield.toFixed(1)} kWh`,
    `${totalCharge.toFixed(1)} kWh`,
    `${totalDischarge.toFixed(1)} kWh`,
    `${totalConsumption.toFixed(1)} kWh`,
    `${totalExport.toFixed(1)} kWh`,
    `${totalImport.toFixed(1)} kWh`,
  ]);

  autoTable(doc, {
    startY: 54,
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
      fillColor: [16, 122, 67], // #107a43 Rich Green
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
      fillColor: [240, 253, 244], // Light green tint row
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
    didParseCell: (data) => {
      // Highlight summary row in green highlight
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 252, 231]; // Emerald 100
        data.cell.styles.textColor = [20, 83, 45]; // Emerald 900
      }
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageCount = (doc.internal as any).getNumberOfPages
        ? (doc.internal as any).getNumberOfPages()
        : doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount} | POWER2G-cloud Intelligent Energy Monitoring`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 7,
        { align: "center" }
      );
    },
  });

  // If a chart image was captured, embed it cleanly on the page or on page 2
  if (chartDataUrl) {
    try {
      const finalY = (doc as any).lastAutoTable?.finalY || 100;
      const chartWidth = pageWidth - 28;
      const chartHeight = 85;

      // If remaining height on page 1 is too small (< 95mm), add a fresh page
      if (pageHeight - finalY < 95) {
        doc.addPage("a4", "landscape");

        // Top header banner on Page 2
        doc.setFillColor(16, 122, 67);
        doc.rect(0, 0, pageWidth, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`POWER2G-cloud Plant Performance - ${period} Visual Curves & Timeline Chart`, 14, 10);

        // Section Title
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${period} Performance & Generation Curves (${selectedStationName})`, 14, 25);

        doc.addImage(chartDataUrl, "PNG", 14, 28, chartWidth, chartHeight);
      } else {
        // Draw chart directly below the table on page 1
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
  doc.save(`POWER2G_Plant_Report_${period}_${cleanDate}.pdf`);
}
