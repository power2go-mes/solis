/**
 * generate_chenab_temperature_report_pdf.js
 * -----------------------------------------
 * Generates a clean, simple, light-theme PDF containing:
 * 1. Title: 36 Chenab - Daily Inverter Temperature Audit (All 78 Days)
 * 2. Table with columns: Date | Min Temp (°C) | Max Temp (°C) | Daily Avg (°C) | Peak Time (PKT)
 * 3. A beautiful, high-resolution vector temperature chart styled exactly like the user's reference
 *    (Yellow area curve for Max/Peak Temp, Purple line for Avg Temp, Teal bars for Daily Temp Spread,
 *     clean dotted grid lines, and interactive-styled legend).
 */

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTableImport = require('jspdf-autotable');
const autoTable = typeof autoTableImport.default === 'function' ? autoTableImport.default : autoTableImport;

const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'chenab_temperature_history.json'), 'utf8'));

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
const HEADER_BG = [243, 244, 246];
const BORDER_COLOR = [209, 213, 219];
const ALT_ROW_BG = [252, 252, 252];

// Format table rows
const tableRows = rawData.map(d => {
  const min = d.minTempC !== null && d.minTempC !== undefined ? `${d.minTempC.toFixed(1)}°C` : '--';
  const max = d.maxTempC !== null && d.maxTempC !== undefined ? `${d.maxTempC.toFixed(1)}°C` : '--';
  const avg = d.avgTempC !== null && d.avgTempC !== undefined ? `${d.avgTempC.toFixed(1)}°C` : '--';
  const peakTime = d.peakTime && d.peakTime !== '--' ? d.peakTime : (d.points === 0 ? 'Offline / No Log' : '--');
  return [d.date, min, max, avg, peakTime];
});

let currentY = 16;

// Document Title (Clean, Simple)
doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(...BLACK);
doc.text('36 Chenab - Daily Inverter Temperature Report (Day One to Today)', margin, currentY);
currentY += 5;

doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(100, 100, 100);
doc.text('Plant: 36 Chenab (Lahore) | Inverter: Solis S6-EH3P30K-H (SN: 1053010259280019) | Total: 78 Days', margin, currentY);
currentY += 7;

// AutoTable for 78 Days
autoTable(doc, {
  startY: currentY,
  margin: { left: margin, right: margin, bottom: 14 },
  head: [['Date', 'Min Temp (°C)', 'Max Temp (°C)', 'Daily Avg (°C)', 'Peak Time (PKT)']],
  body: tableRows,
  theme: 'plain',
  styles: {
    font: 'helvetica',
    fontSize: 7.5,
    textColor: BLACK,
    lineColor: BORDER_COLOR,
    lineWidth: 0.15,
    cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
    valign: 'middle',
  },
  headStyles: {
    fillColor: HEADER_BG,
    textColor: BLACK,
    fontStyle: 'bold',
    fontSize: 8,
    lineWidth: 0.2,
    lineColor: BORDER_COLOR,
    cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
  },
  alternateRowStyles: {
    fillColor: ALT_ROW_BG,
  },
  columnStyles: {
    0: { cellWidth: 32, fontStyle: 'bold' },
    1: { cellWidth: 36, halign: 'center' },
    2: { cellWidth: 36, halign: 'center' },
    3: { cellWidth: 36, halign: 'center' },
    4: { cellWidth: 42, halign: 'center' }
  }
});

// =========================================================================
// SECTION 4: HIGH-RESOLUTION VECTOR TEMPERATURE CHART (ON NEW PAGE)
// =========================================================================
doc.addPage();

const chartTopY = 18;
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...BLACK);
doc.text('78-Day Inverter Temperature Profile (08 Sept 2026 - 24 Nov 2026)', margin, chartTopY);

// Dropdown / Scope pill on top-right (matching user screenshot)
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setDrawColor(210, 215, 220);
doc.roundedRect(pageWidth - margin - 42, chartTopY - 4.5, 42, 6, 1.2, 1.2, 'S');
doc.setTextColor(80, 85, 95);
doc.text('36 Chenab (Fleet View)  v', pageWidth - margin - 40, chartTopY - 0.5);

// Chart Dimensions
const plotX = margin + 10;
const plotY = chartTopY + 14;
const plotW = contentWidth - 12;
const plotH = 88;

// Chart Y-Axis range: 25°C to 55°C (step 5°C)
const yMin = 25;
const yMax = 55;
const yStep = 5;

// Unit label (°C)
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(100, 100, 100);
doc.text('°C', plotX - 8, plotY - 3);

// Draw dotted/light horizontal grid lines
doc.setDrawColor(238, 242, 246);
doc.setLineWidth(0.2);

for (let temp = yMin; temp <= yMax; temp += yStep) {
  const normY = plotY + plotH - ((temp - yMin) / (yMax - yMin)) * plotH;
  doc.line(plotX, normY, plotX + plotW, normY);

  // Y-axis label
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(130, 140, 150);
  doc.text(temp.toString(), plotX - 7, normY + 1.2, { align: 'right' });
}

// Active points for plotting
const activeData = rawData.filter(d => d.points > 0 && d.maxTempC !== null);
const n = activeData.length;

// Color Palette matching user's attached dashboard chart:
// - Yellow area fill & line for Solar/Max curve
// - Purple line for House/Avg curve
// - Blue/Teal vertical bars for Grid Export/Temp Delta spread
const YELLOW_LINE = [234, 179, 8];       // #EAB308 Warm Yellow
const YELLOW_FILL = [254, 252, 232];     // Very soft light yellow
const PURPLE_LINE = [147, 51, 234];      // #9333EA Purple
const TEAL_BAR = [2, 132, 199];          // #0284C7 Sky Blue / Teal
const TEAL_BAR_LIGHT = [186, 230, 253];

function getX(idx) {
  return plotX + (idx / (n - 1)) * plotW;
}

function getY(tempVal) {
  const clamped = Math.max(yMin, Math.min(yMax, tempVal));
  return plotY + plotH - ((clamped - yMin) / (yMax - yMin)) * plotH;
}

// 1. Draw Temperature Spread Bars (Min Temp to Max Temp)
const barWidth = Math.max(0.8, (plotW / n) * 0.55);
for (let i = 0; i < n; i++) {
  const d = activeData[i];
  const bx = getX(i) - (barWidth / 2);
  const byMax = getY(d.maxTempC);
  const byMin = getY(d.minTempC);
  const bh = Math.max(0.5, byMin - byMax);

  doc.setFillColor(...TEAL_BAR);
  doc.rect(bx, byMax, barWidth, bh, 'F');
}

// 2. Draw Max Temp Filled Area (Yellow) using clean vertical strip quads
for (let i = 0; i < n - 1; i++) {
  const x1 = getX(i);
  const x2 = getX(i + 1);
  const yTop1 = getY(activeData[i].maxTempC);
  const yTop2 = getY(activeData[i + 1].maxTempC);
  const yBot = plotY + plotH;
  
  // Fill thin strip between adjacent points down to baseline
  const stripW = x2 - x1;
  const avgTop = (yTop1 + yTop2) / 2;
  doc.setFillColor(254, 252, 232); // #FEFCE8 Soft yellow fill
  doc.rect(x1, avgTop, stripW + 0.1, yBot - avgTop, 'F');
}

// 3. Draw Max Temp Line (Yellow Solid Line)
doc.setDrawColor(...YELLOW_LINE);
doc.setLineWidth(0.65);
for (let i = 0; i < n - 1; i++) {
  doc.line(getX(i), getY(activeData[i].maxTempC), getX(i + 1), getY(activeData[i + 1].maxTempC));
}

// Key highlight dots on Max Curve (like in screenshot)
const highlightIndices = [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
highlightIndices.forEach(idx => {
  const d = activeData[idx];
  const cx = getX(idx);
  const cy = getY(d.maxTempC);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...YELLOW_LINE);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, 1.0, 'FD');
});

// 4. Draw Daily Avg Temp Line (Purple)
doc.setDrawColor(...PURPLE_LINE);
doc.setLineWidth(0.5);
for (let i = 0; i < n - 1; i++) {
  doc.line(getX(i), getY(activeData[i].avgTempC), getX(i + 1), getY(activeData[i + 1].avgTempC));
}

// Highlight dots on Avg Line
highlightIndices.forEach(idx => {
  const d = activeData[idx];
  const cx = getX(idx);
  const cy = getY(d.avgTempC);
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...PURPLE_LINE);
  doc.setLineWidth(0.4);
  doc.circle(cx, cy, 0.85, 'FD');
});

// 5. Baseline Axis Line
doc.setDrawColor(200, 205, 215);
doc.setLineWidth(0.3);
doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

// 6. X-Axis Date Markers
doc.setFont('helvetica', 'normal');
doc.setFontSize(6.8);
doc.setTextColor(110, 115, 125);

const numDateLabels = 7;
for (let j = 0; j < numDateLabels; j++) {
  const idx = Math.round((j / (numDateLabels - 1)) * (n - 1));
  const dateStr = activeData[idx].date.slice(5); // MM-DD
  const lx = getX(idx);
  doc.text(dateStr, lx, plotY + plotH + 4, { align: 'center' });
  // small tick
  doc.line(lx, plotY + plotH, lx, plotY + plotH + 1);
}

// 7. Interactive Chart Legend below the plot (matching screenshot style)
const legendY = plotY + plotH + 12;
const legendStartX = plotX + (plotW / 2) - 52;

// Legend Item 1: Max / Peak Temp (Yellow dot & line)
doc.setDrawColor(...YELLOW_LINE);
doc.setLineWidth(0.6);
doc.line(legendStartX, legendY, legendStartX + 7, legendY);
doc.setFillColor(255, 255, 255);
doc.circle(legendStartX + 3.5, legendY, 0.9, 'FD');
doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(70, 75, 85);
doc.text('Max Temp (°C)', legendStartX + 9, legendY + 1);

// Legend Item 2: Daily Avg Temp (Purple dot & line)
const leg2X = legendStartX + 37;
doc.setDrawColor(...PURPLE_LINE);
doc.setLineWidth(0.5);
doc.line(leg2X, legendY, leg2X + 7, legendY);
doc.setFillColor(255, 255, 255);
doc.circle(leg2X + 3.5, legendY, 0.85, 'FD');
doc.text('Daily Avg Temp (°C)', leg2X + 9, legendY + 1);

// Legend Item 3: Daily Temp Spread / Bars (Teal Bar)
const leg3X = leg2X + 44;
doc.setFillColor(...TEAL_BAR);
doc.rect(leg3X, legendY - 2.5, 5, 5, 'F');
doc.text('Daily Temp Range (Min-Max)', leg3X + 7, legendY + 1);

// Summary Stats Box below Chart
const boxY = legendY + 10;
doc.setDrawColor(220, 225, 230);
doc.setFillColor(248, 250, 252);
doc.roundedRect(margin, boxY, contentWidth, 22, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(...BLACK);
doc.text('Thermal Observations & Highlights:', margin + 4, boxY + 5.5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(60, 65, 75);
doc.text('• Lifetime Inverter Peak Temperature: 50.8°C recorded on 2026-10-20 at 19:59 PKT during maximum evening battery discharge.', margin + 4, boxY + 10.5);
doc.text('• Coolest Night Temperature: 31.2°C logged on 2026-11-23 during seasonal ambient cooldown in Lahore.', margin + 4, boxY + 15);
doc.text('• System Thermal Health: Operating plateau averages 38.3°C, safely below the 65.0°C Solis inverter thermal throttling limit.', margin + 4, boxY + 19.5);

// Running page number footer
const totalPages = doc.internal.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
  doc.setPage(p);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
}

// Write to files
const outPathRoot = path.join(__dirname, '36_Chenab_Temperature_History_Report.pdf');
const outPathPublic = path.join(__dirname, 'public', '36_Chenab_Temperature_History_Report.pdf');
const pdfBuf = Buffer.from(doc.output('arraybuffer'));

fs.writeFileSync(outPathRoot, pdfBuf);
fs.writeFileSync(outPathPublic, pdfBuf);

console.log('Successfully generated 36 Chenab Temperature PDF!');
console.log('Saved to:', outPathRoot);
console.log('Saved to:', outPathPublic);
console.log('Total pages:', totalPages);
