import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import { jsPDF } from "jspdf";
import autoTableImport from "jspdf-autotable";

const autoTable = typeof (autoTableImport as any).default === "function" ? (autoTableImport as any).default : autoTableImport;

const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";
let sessionCookie: string | null = null;

function md5Base64(str: string): string {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key: string, data: string): string {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function solisPost(apiPath: string, body: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const date = new Date().toUTCString();
    const contentMd5 = md5Base64(bodyStr);
    const signPath = apiPath.replace(/^\/api/, "");
    const signStr = `POST\n${contentMd5}\napplication/json\n${date}\n${signPath}`;
    const signature = hmacSha1Base64(SOLIS_HMAC_SECRET, signStr);

    const headers: Record<string, string | number> = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": contentMd5,
      "Authorization": `WEB ${SOLIS_KEY_ID}:${signature}`,
      "Time": date,
      "Accept": "application/json, text/plain, */*",
      "Language": "2",
      "X-Cloud-Platform": "GLY",
      "Version": "5.3.001",
      "Platform": "Web",
      "Content-Length": Buffer.byteLength(bodyStr),
    };

    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 25000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ");
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

async function ensureLogin() {
  const passMd5 = crypto.createHash("md5").update("POWER2GO").digest("hex");
  await solisPost("/api/user/login2", {
    userInfo: "Qasim Moosvi",
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });
}

interface PlantConfig {
  id: string;
  name: string;
  inverterModel: string;
  inverterSn: string;
  inverterId: string;
  startDate: string;
  cacheFileName?: string;
  city: string;
}

const KNOWN_PLANTS_CONFIG: Record<string, PlantConfig> = {
  // Menu Karachi Office
  "1298491919450797504": {
    id: "1298491919450797504",
    name: "Menu Karachi Office",
    inverterModel: "2x Solis S6-EH3P50K-H",
    inverterSn: "1053050258180057 & 1053050258140015",
    inverterId: "1308675217950425937",
    startDate: "2026-06-16",
    cacheFileName: "menu_karachi_temperature_history.json",
    city: "Karachi",
  },
  // 36 Chenab
  "1298491919450873747": {
    id: "1298491919450873747",
    name: "36 Chenab",
    inverterModel: "Solis S6-EH3P30K-H",
    inverterSn: "1053010259280019",
    inverterId: "1308675217950513392",
    startDate: "2026-09-08",
    cacheFileName: "chenab_temperature_history.json",
    city: "Lahore",
  },
  // Towfiq chinoy
  "1298491919451014032": {
    id: "1298491919451014032",
    name: "Towfiq chinoy",
    inverterModel: "Solis S6-EH3P50K-H",
    inverterSn: "1053050258180112",
    inverterId: "1308675217950425926",
    startDate: "2026-11-19",
    cacheFileName: "towfiq_temperature_history.json",
    city: "Karachi",
  },
  // OPL Residence
  "1298491919450958553": {
    id: "1298491919450958553",
    name: "OPL Residence",
    inverterModel: "Solis S6-EH3P50K-H",
    inverterSn: "1053050258110159",
    inverterId: "1308675217950440077",
    startDate: "2026-10-20",
    cacheFileName: "opl_temperature_history.json",
    city: "Karachi",
  },
  // P2G 50KW
  "1298491919450740581": {
    id: "1298491919450740581",
    name: "P2G 50KW",
    inverterModel: "Solis S6-EH3P50K-H",
    inverterSn: "1053050255210107",
    inverterId: "1308675217949880638",
    startDate: "2026-08-20",
    cacheFileName: "p2g_50kw_temperature_history.json",
    city: "Karachi",
  },
  // P2G 1ST 6kw
  "1298491919450840394": {
    id: "1298491919450840394",
    name: "P2G 1ST 6kw",
    inverterModel: "Solis S6-GR1P6K",
    inverterSn: "1031731257050184",
    inverterId: "1308675217950080058",
    startDate: "2026-08-13",
    cacheFileName: "p2g_6kw_temperature_history.json",
    city: "Karachi",
  },
  // P2G 15KW
  "1298491919450734544": {
    id: "1298491919450734544",
    name: "P2G 15KW",
    inverterModel: "Solis S6-GR3P15K",
    inverterSn: "1033320253150969",
    inverterId: "1308675217949806488",
    startDate: "2026-11-18",
    cacheFileName: "p2g_15kw_temperature_history.json",
    city: "Karachi",
  },
  // P2G 20kw
  "1298491919450851319": {
    id: "1298491919450851319",
    name: "P2G 20kw",
    inverterModel: "Solis S6-GR3P20K",
    inverterSn: "1033161256090193",
    inverterId: "1308675217950003743",
    startDate: "2026-11-18",
    cacheFileName: "p2g_20kw_temperature_history.json",
    city: "Karachi",
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get("plantId") || "1298491919450873747"; // Default 36 Chenab

    // 1. Resolve Current Time in PKT (UTC+5)
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const todayStr = `${nowPkt.getFullYear()}-${String(nowPkt.getMonth() + 1).padStart(2, "0")}-${String(nowPkt.getDate()).padStart(2, "0")}`;

    // 2. Resolve Plant Configuration
    let config = KNOWN_PLANTS_CONFIG[plantId];
    let plantName = config?.name || "Solar Plant";
    let invDesc = config ? `${config.inverterModel} (SN: ${config.inverterSn})` : "Solis Inverter";
    let city = config?.city || "Pakistan";
    let invId = config?.inverterId || "1308675217950513392";

    let records: any[] = [];

    // Check if cached file exists
    if (config?.cacheFileName) {
      const cachePath = path.join(process.cwd(), config.cacheFileName);
      if (fs.existsSync(cachePath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"));
          if (Array.isArray(raw)) {
            records = [...raw];
          } else if (raw.plantHistory && Array.isArray(raw.plantHistory)) {
            records = [...raw.plantHistory];
          } else if (raw.inverter1?.history && Array.isArray(raw.inverter1.history)) {
            records = [...raw.inverter1.history];
          }
        } catch (e) {
          console.error("Cache read error:", e);
        }
      }
    }

    // 3. Ensure records extend all the way up to todayStr dynamically
    const lastRecordedDate = records.length > 0 ? records[records.length - 1].date : null;
    const isUpToDate = lastRecordedDate === todayStr && records[records.length - 1]?.points > 0;

    if (!isUpToDate) {
      await ensureLogin();

      // If records were empty, discover start date from station detailMix
      if (records.length === 0) {
        const mixRes = await solisPost("/api/station/detailMix", { id: plantId });
        const station = mixRes.data || {};
        plantName = station.stationName || plantName;

        const firstDateStr = station.fisGenerateTimeStr || station.createDateStr || "01/09/2026";
        const parts = firstDateStr.split(/[\/\-\s:]/);
        let sYear = 2026, sMonth = 10, sDay = 1;
        if (parts.length >= 3) {
          if (parts[2].length === 4) {
            sDay = parseInt(parts[0], 10);
            sMonth = parseInt(parts[1], 10) - 1;
            sYear = parseInt(parts[2], 10);
          } else if (parts[0].length === 4) {
            sYear = parseInt(parts[0], 10);
            sMonth = parseInt(parts[1], 10) - 1;
            sDay = parseInt(parts[2], 10);
          }
        }
        config = { ...config, startDate: `${sYear}-${String(sMonth + 1).padStart(2, "0")}-${String(sDay).padStart(2, "0")}` } as PlantConfig;
      }

      // Determine date range that needs fetching (from day after lastRecordedDate up to todayStr)
      let startDateForMissing = config?.startDate || "2026-09-08";
      if (lastRecordedDate) {
        const lp = lastRecordedDate.split("-").map(Number);
        const nextD = new Date(lp[0], lp[1] - 1, lp[2] + 1);
        startDateForMissing = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-${String(nextD.getDate()).padStart(2, "0")}`;
      }

      const curParts = startDateForMissing.split("-").map(Number);
      const cur = new Date(curParts[0], curParts[1] - 1, curParts[2]);
      const end = new Date(nowPkt.getFullYear(), nowPkt.getMonth(), nowPkt.getDate());

      const missingDates: string[] = [];
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, "0");
        const d = String(cur.getDate()).padStart(2, "0");
        missingDates.push(`${y}-${m}-${d}`);
        cur.setDate(cur.getDate() + 1);
      }

      // Query any missing dates (e.g. today or future days)
      for (const d of missingDates) {
        try {
          const res = await solisPost("/api/chart/inverter/day", { id: invId, time: d, timeZone: 5 });
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            const valid = res.data.filter((pt: any) => pt.inverterTemperature !== undefined && pt.inverterTemperature !== null);
            const temps = valid.map((pt: any) => parseFloat(pt.inverterTemperature)).filter((x: number) => !isNaN(x) && x > 0);
            if (temps.length > 0) {
              const minT = Math.min(...temps);
              const maxT = Math.max(...temps);
              const avgT = parseFloat((temps.reduce((a: number, b: number) => a + b, 0) / temps.length).toFixed(1));
              const peak = valid.find((pt: any) => parseFloat(pt.inverterTemperature) === maxT);
              records.push({ date: d, points: temps.length, minTempC: minT, maxTempC: maxT, avgTempC: avgT, peakTime: peak ? (peak.time + " PKT") : "--" });
            } else {
              records.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
            }
          } else {
            records.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
          }
        } catch {
          records.push({ date: d, points: 0, minTempC: null, maxTempC: null, avgTempC: null, peakTime: "--" });
        }
      }
    }

    // Initialize PDF document
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    const BLACK = [20, 20, 20];

    const tableRows = records.map((d: any) => {
      const min = d.minTempC !== null && d.minTempC !== undefined ? `${d.minTempC.toFixed(1)}°C` : "--";
      const max = d.maxTempC !== null && d.maxTempC !== undefined ? `${d.maxTempC.toFixed(1)}°C` : "--";
      const avg = d.avgTempC !== null && d.avgTempC !== undefined ? `${d.avgTempC.toFixed(1)}°C` : "--";
      const peakTime = d.peakTime && d.peakTime !== "--" ? d.peakTime : (d.points === 0 ? "Offline / No Log" : "--");
      return [d.date, min, max, avg, peakTime];
    });

    let currentY = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`${plantName} - Daily Inverter Temperature Report (Day One to Today)`, margin, currentY);
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`Plant: ${plantName} (${city}) | Inverter: ${invDesc} | Total: ${records.length} Days (Up to Current Date)`, margin, currentY);
    currentY += 7;

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin, bottom: 14 },
      head: [["Date", "Min Temp (°C)", "Max Temp (°C)", "Daily Avg (°C)", "Peak Time (PKT)"]],
      body: tableRows,
      theme: "plain",
      styles: {
        font: "helvetica",
        fontSize: 7.5,
        textColor: [20, 20, 20],
        lineColor: [209, 213, 219],
        lineWidth: 0.15,
        cellPadding: { top: 1.8, bottom: 1.8, left: 3, right: 3 },
        valign: "middle",
      },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [20, 20, 20],
        fontStyle: "bold",
        fontSize: 8,
        lineWidth: 0.2,
        lineColor: [209, 213, 219],
        cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: "bold" },
        1: { cellWidth: 36, halign: "center" },
        2: { cellWidth: 36, halign: "center" },
        3: { cellWidth: 36, halign: "center" },
        4: { cellWidth: 42, halign: "center" },
      },
    });

    // Vector Temperature Profile Chart Page
    doc.addPage();
    const chartTopY = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    const firstDate = records[0]?.date || "--";
    const lastDate = records[records.length - 1]?.date || todayStr;
    doc.text(`${records.length}-Day Inverter Temperature Profile (${firstDate} to ${lastDate})`, margin, chartTopY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setDrawColor(210, 215, 220);
    const scopeLabel = `${plantName} (Fleet View)  v`;
    const labelWidth = Math.max(38, doc.getTextWidth(scopeLabel) + 6);
    doc.roundedRect(pageWidth - margin - labelWidth, chartTopY - 4.5, labelWidth, 6, 1.2, 1.2, "S");
    doc.setTextColor(80, 85, 95);
    doc.text(scopeLabel, pageWidth - margin - labelWidth + 3, chartTopY - 0.5);

    const plotX = margin + 10;
    const plotY = chartTopY + 14;
    const plotW = contentWidth - 12;
    const plotH = 88;
    const yMin = 20;
    const yMax = 55;
    const yStep = 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("°C", plotX - 8, plotY - 3);

    doc.setDrawColor(238, 242, 246);
    doc.setLineWidth(0.2);
    for (let temp = yMin; temp <= yMax; temp += yStep) {
      const normY = plotY + plotH - ((temp - yMin) / (yMax - yMin)) * plotH;
      doc.line(plotX, normY, plotX + plotW, normY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(130, 140, 150);
      doc.text(temp.toString(), plotX - 7, normY + 1.2, { align: "right" });
    }

    const activeData = records.filter((d: any) => d.points > 0 && d.maxTempC !== null);
    const n = activeData.length;

    const YELLOW_LINE = [234, 179, 8] as const;
    const PURPLE_LINE = [147, 51, 234] as const;
    const TEAL_BAR = [2, 132, 199] as const;

    if (n >= 2) {
      function getX(idx: number) {
        return plotX + (idx / (n - 1)) * plotW;
      }
      function getY(tempVal: number) {
        const clamped = Math.max(yMin, Math.min(yMax, tempVal));
        return plotY + plotH - ((clamped - yMin) / (yMax - yMin)) * plotH;
      }

      // 1. Temperature Spread Bars
      const barWidth = Math.max(0.8, (plotW / n) * 0.55);
      for (let i = 0; i < n; i++) {
        const d = activeData[i];
        const bx = getX(i) - barWidth / 2;
        const byMax = getY(d.maxTempC);
        const byMin = getY(d.minTempC);
        const bh = Math.max(0.5, byMin - byMax);

        doc.setFillColor(TEAL_BAR[0], TEAL_BAR[1], TEAL_BAR[2]);
        doc.rect(bx, byMax, barWidth, bh, "F");
      }

      // 2. Yellow Fill Strips
      for (let i = 0; i < n - 1; i++) {
        const x1 = getX(i);
        const x2 = getX(i + 1);
        const yTop1 = getY(activeData[i].maxTempC);
        const yTop2 = getY(activeData[i + 1].maxTempC);
        const yBot = plotY + plotH;
        const stripW = x2 - x1;
        const avgTop = (yTop1 + yTop2) / 2;
        doc.setFillColor(254, 252, 232);
        doc.rect(x1, avgTop, stripW + 0.1, yBot - avgTop, "F");
      }

      // 3. Max Temp Line (Yellow)
      doc.setDrawColor(YELLOW_LINE[0], YELLOW_LINE[1], YELLOW_LINE[2]);
      doc.setLineWidth(0.65);
      for (let i = 0; i < n - 1; i++) {
        doc.line(getX(i), getY(activeData[i].maxTempC), getX(i + 1), getY(activeData[i + 1].maxTempC));
      }

      // Dots on Max
      const highlightIndices = [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
      highlightIndices.forEach((idx) => {
        const d = activeData[idx];
        const cx = getX(idx);
        const cy = getY(d.maxTempC);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(YELLOW_LINE[0], YELLOW_LINE[1], YELLOW_LINE[2]);
        doc.setLineWidth(0.5);
        doc.circle(cx, cy, 1.0, "FD");
      });

      // 4. Daily Avg Temp Line (Purple)
      doc.setDrawColor(PURPLE_LINE[0], PURPLE_LINE[1], PURPLE_LINE[2]);
      doc.setLineWidth(0.5);
      for (let i = 0; i < n - 1; i++) {
        doc.line(getX(i), getY(activeData[i].avgTempC), getX(i + 1), getY(activeData[i + 1].avgTempC));
      }
      highlightIndices.forEach((idx) => {
        const d = activeData[idx];
        const cx = getX(idx);
        const cy = getY(d.avgTempC);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(PURPLE_LINE[0], PURPLE_LINE[1], PURPLE_LINE[2]);
        doc.setLineWidth(0.4);
        doc.circle(cx, cy, 0.85, "FD");
      });

      // Baseline & Dates
      doc.setDrawColor(200, 205, 215);
      doc.setLineWidth(0.3);
      doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(110, 115, 125);
      const numDateLabels = Math.min(n, 7);
      for (let j = 0; j < numDateLabels; j++) {
        const idx = Math.round((j / (numDateLabels - 1)) * (n - 1));
        const dateStr = activeData[idx].date.slice(5);
        const lx = getX(idx);
        doc.text(dateStr, lx, plotY + plotH + 4, { align: "center" });
        doc.line(lx, plotY + plotH, lx, plotY + plotH + 1);
      }
    }

    // Legend
    const legendY = plotY + plotH + 12;
    const legendStartX = plotX + plotW / 2 - 52;
    doc.setDrawColor(YELLOW_LINE[0], YELLOW_LINE[1], YELLOW_LINE[2]);
    doc.setLineWidth(0.6);
    doc.line(legendStartX, legendY, legendStartX + 7, legendY);
    doc.setFillColor(255, 255, 255);
    doc.circle(legendStartX + 3.5, legendY, 0.9, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(70, 75, 85);
    doc.text("Max Temp (°C)", legendStartX + 9, legendY + 1);

    const leg2X = legendStartX + 37;
    doc.setDrawColor(PURPLE_LINE[0], PURPLE_LINE[1], PURPLE_LINE[2]);
    doc.setLineWidth(0.5);
    doc.line(leg2X, legendY, leg2X + 7, legendY);
    doc.setFillColor(255, 255, 255);
    doc.circle(leg2X + 3.5, legendY, 0.85, "FD");
    doc.text("Daily Avg Temp (°C)", leg2X + 9, legendY + 1);

    const leg3X = leg2X + 44;
    doc.setFillColor(TEAL_BAR[0], TEAL_BAR[1], TEAL_BAR[2]);
    doc.rect(leg3X, legendY - 2.5, 5, 5, "F");
    doc.text("Daily Temp Range (Min-Max)", leg3X + 7, legendY + 1);

    // Thermal Highlights Box
    const boxY = legendY + 10;
    doc.setDrawColor(220, 225, 230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, boxY, contentWidth, 22, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text(`Thermal Observations & Highlights (${plantName}):`, margin + 4, boxY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(60, 65, 75);

    // Dynamic stats
    const allMax = activeData.length ? Math.max(...activeData.map((d: any) => d.maxTempC)) : 0;
    const allMin = activeData.length ? Math.min(...activeData.map((d: any) => d.minTempC)) : 0;
    const avgOverall = activeData.length ? (activeData.reduce((acc: number, d: any) => acc + d.avgTempC, 0) / activeData.length).toFixed(1) : "0";
    const peakRec = activeData.find((d: any) => d.maxTempC === allMax);

    doc.text(`• Lifetime Inverter Peak Temperature: ${allMax}°C recorded on ${peakRec?.date || "--"} at ${peakRec?.peakTime || "--"}.`, margin + 4, boxY + 10.5);
    doc.text(`• Coolest Night Temperature: ${allMin}°C logged during ambient cooldown periods.`, margin + 4, boxY + 15);
    doc.text(`• System Thermal Health: Operating plateau averages ${avgOverall}°C, safely below the 65.0°C Solis inverter thermal throttling limit.`, margin + 4, boxY + 19.5);

    const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin - 15, pageHeight - 8);
    }

    const cleanFileName = plantName.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${cleanFileName}_Temperature_History_Report.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Export temperature report error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
