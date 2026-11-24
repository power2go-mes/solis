/**
 * generate_simple_parameter_pdfs.js
 * Generates two clean, minimalist, decoration-free PDFs:
 * 1. Solis_Inverter_All_Parameters.pdf (one parameter per line, clean table/listing)
 * 2. Solis_Battery_All_Parameters.pdf (one parameter per line, clean table/listing)
 */

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableImport = require('jspdf-autotable');
const autoTable = typeof autoTableImport.default === 'function' ? autoTableImport.default : autoTableImport;

const deep = JSON.parse(fs.readFileSync(path.join(__dirname, 'menu_karachi_deep_cells.json'), 'utf8'));

// Common styling constants for clean, no-frills, plain white/black output
const BLACK = [0, 0, 0];
const DARK_GRAY = [60, 60, 60];
const LIGHT_GRAY = [240, 240, 240];
const BORDER_COLOR = [200, 200, 200];

// =========================================================================
// PDF 1: ALL INVERTER PARAMETERS
// =========================================================================
function generateInverterPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Simple title header (no decoration)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text('Solis Inverter - All Parameters List', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GRAY);
  doc.text('Plant: Menu Karachi Office | Inverter 1 (SN: 1053050258180057) vs Inverter 2 (SN: 1053050258140015)', margin, 20);
  doc.text('Format: One parameter per line | Total active parameters listed: ~815', margin, 25);

  // Extract all keys
  const inv1 = deep.inverter1 || {};
  const inv2 = deep.inverter2 || {};

  const allKeysSet = new Set([...Object.keys(inv1), ...Object.keys(inv2)]);
  // Exclude nested arrays/objects like batteryList
  const sortedKeys = Array.from(allKeysSet)
    .filter(k => k !== 'batteryList' && typeof inv1[k] !== 'object' && typeof inv2[k] !== 'object')
    .sort();

  const rows = sortedKeys.map((key, index) => {
    const val1 = inv1[key] !== undefined && inv1[key] !== null ? String(inv1[key]) : '-';
    const val2 = inv2[key] !== undefined && inv2[key] !== null ? String(inv2[key]) : '-';
    return [(index + 1).toString(), key, val1, val2];
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [['#', 'Parameter Name', 'Inverter 1 Value (SN: ...80057)', 'Inverter 2 Value (SN: ...40015)']],
    body: rows,
    theme: 'plain',
    headStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontSize: 8,
      fontStyle: 'bold',
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: BLACK,
      cellPadding: 1.6,
      lineColor: BORDER_COLOR,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 52 },
      3: { cellWidth: 52 }
    },
    didDrawPage: function(data) {
      // Simple page number footer
      const str = 'Page ' + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...DARK_GRAY);
      doc.text(str, pageWidth - margin - 15, pageHeight - 6);
    }
  });

  const outPathRoot = path.join(__dirname, 'Solis_Inverter_All_Parameters.pdf');
  const outPathPublic = path.join(__dirname, 'public', 'Solis_Inverter_All_Parameters.pdf');
  const buf = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outPathRoot, buf);
  fs.writeFileSync(outPathPublic, buf);
  console.log('Generated:', outPathRoot, '(' + doc.internal.getNumberOfPages() + ' pages)');
}

// =========================================================================
// PDF 2: ALL BATTERY PARAMETERS
// =========================================================================
function generateBatteryPdf() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Simple title header (no decoration)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.text('Solis Battery & BMS - All Parameters List', margin, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK_GRAY);
  doc.text('Plant: Menu Karachi Office | High-Voltage Pylontech Fleet (Rack 1, Rack 2, Rack 3)', margin, 20);
  doc.text('Format: One parameter per line | Total parameters per rack: ~62', margin, 25);

  const b1 = (deep.inverter1 && deep.inverter1.batteryList && deep.inverter1.batteryList[0]) || {};
  const b2 = (deep.inverter1 && deep.inverter1.batteryList && deep.inverter1.batteryList[1]) || {};
  const b3 = (deep.inverter2 && deep.inverter2.batteryList && deep.inverter2.batteryList[0]) || {};

  const allKeysSet = new Set([...Object.keys(b1), ...Object.keys(b2), ...Object.keys(b3)]);
  const sortedKeys = Array.from(allKeysSet)
    .filter(k => typeof b1[k] !== 'object' && typeof b2[k] !== 'object' && typeof b3[k] !== 'object')
    .sort();

  const rows = sortedKeys.map((key, index) => {
    const val1 = b1[key] !== undefined && b1[key] !== null ? String(b1[key]) : '-';
    const val2 = b2[key] !== undefined && b2[key] !== null ? String(b2[key]) : '-';
    const val3 = b3[key] !== undefined && b3[key] !== null ? String(b3[key]) : '-';
    return [(index + 1).toString(), key, val1, val2, val3];
  });

  autoTable(doc, {
    startY: 28,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [['#', 'Parameter Name', 'Rack 1 (Inv 1)', 'Rack 2 (Inv 1)', 'Rack 3 (Inv 2)']],
    body: rows,
    theme: 'plain',
    headStyles: {
      fillColor: LIGHT_GRAY,
      textColor: BLACK,
      fontSize: 8,
      fontStyle: 'bold',
      lineColor: BORDER_COLOR,
      lineWidth: 0.2,
      cellPadding: 2.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: BLACK,
      cellPadding: 2,
      lineColor: BORDER_COLOR,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 66, fontStyle: 'bold' },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
      4: { cellWidth: 38 }
    },
    didDrawPage: function(data) {
      const str = 'Page ' + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(...DARK_GRAY);
      doc.text(str, pageWidth - margin - 15, pageHeight - 6);
    }
  });

  const outPathRoot = path.join(__dirname, 'Solis_Battery_All_Parameters.pdf');
  const outPathPublic = path.join(__dirname, 'public', 'Solis_Battery_All_Parameters.pdf');
  const buf = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync(outPathRoot, buf);
  fs.writeFileSync(outPathPublic, buf);
  console.log('Generated:', outPathRoot, '(' + doc.internal.getNumberOfPages() + ' pages)');
}

generateInverterPdf();
generateBatteryPdf();
