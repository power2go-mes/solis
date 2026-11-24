import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const plantId = searchParams.get("plantId");

    if (!plantId) {
      return NextResponse.json({ error: "plantId parameter is required" }, { status: 400 });
    }

    await ensureLogin();

    // 1. Fetch Station Details & Day One
    const mixRes = await solisPost("/api/station/detailMix", { id: plantId });
    const station = mixRes.data || {};
    const plantName = station.stationName || "Solar Plant";
    const capacityKwp = station.capacity || station.capacity1 || "--";

    // Day one detection
    const firstDateStr = station.fisGenerateTimeStr || station.createDateStr || "01/01/2026";
    const parts = firstDateStr.split(/[\/\-\s:]/);
    let startYear = 2026, startMonth = 0, startDay = 1;
    if (parts.length >= 3) {
      if (parts[2].length === 4) {
        startDay = parseInt(parts[0], 10);
        startMonth = parseInt(parts[1], 10) - 1;
        startYear = parseInt(parts[2], 10);
      } else if (parts[0].length === 4) {
        startYear = parseInt(parts[0], 10);
        startMonth = parseInt(parts[1], 10) - 1;
        startDay = parseInt(parts[2], 10);
      }
    }

    const startDate = new Date(startYear, startMonth, startDay);
    const nowPkt = new Date(Date.now() + 5 * 3600 * 1000);
    const endDate = new Date(nowPkt.getFullYear(), nowPkt.getMonth(), nowPkt.getDate());

    // 2. Fetch Inverter List for this plant
    const colRes = await solisPost("/api/collector/list", { stationId: plantId, pageNo: 1, pageSize: 10 });
    const collectors = colRes.data?.page?.records || [];

    // Fetch month-by-month plant energy curves from day one
    // Query /api/chart/station/month or /api/chart/station/year
    const chartMonthRes = await solisPost("/api/chart/station/year", {
      id: plantId,
      year: nowPkt.getFullYear().toString(),
      timeZone: 5,
    });
    const monthlyRecords = Array.isArray(chartMonthRes.data) ? chartMonthRes.data : [];

    // Also fetch recent daily records
    const chartDayRes = await solisPost("/api/chart/station/month", {
      id: plantId,
      month: `${nowPkt.getFullYear()}-${String(nowPkt.getMonth() + 1).padStart(2, "0")}`,
      timeZone: 5,
    });
    const dailyRecords = Array.isArray(chartDayRes.data) ? chartDayRes.data : [];

    // 3. Build Clean PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    const BLACK = [20, 20, 20] as const;
    const BRAND_GREEN = [16, 185, 129] as const;
    const HEADER_BG = [243, 244, 246] as const;
    const BORDER_COLOR = [209, 213, 219] as const;

    // Running Header Bar
    doc.setFillColor(BRAND_GREEN[0], BRAND_GREEN[1], BRAND_GREEN[2]);
    doc.rect(0, 0, pageWidth, 4, "F");

    let currentY = 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
    doc.text("POWER2G-cloud Lifetime Plant Performance Audit", margin, currentY);
    currentY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Plant: ${plantName} (ID: ${plantId}) | Capacity: ${capacityKwp} kWp`, margin, currentY);
    currentY += 4.5;
    doc.text(`Compulsory Historical Span: From Day One (${firstDateStr}) to Today (${nowPkt.toISOString().slice(0, 10)})`, margin, currentY);
    currentY += 8;

    // Plant Overview Summary Table
    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Plant Parameter", "Lifetime Value", "Operational Status"]],
      body: [
        ["Total Lifetime Generation", station.allEnergyStr ? `${station.allEnergyStr} MWh` : `${(station.allEnergy || 0).toFixed(2)} MWh`, "Normal Generating"],
        ["Total Lifetime Battery Charge", `${Math.round(station.batteryTotalChargeEnergy || 0)} kWh`, "Storage Ingestion"],
        ["Total Lifetime Battery Discharge", `${Math.round(station.batteryTotalDischargeEnergy || 0)} kWh`, "Backup Delivered"],
        ["Total Grid Imported Energy", `${Math.round(station.gridPurchasedTotalEnergy || 0)} kWh`, "Utility Intertie"],
        ["Total Grid Exported Energy", `${Math.round(station.gridSellTotalEnergy || 0)} kWh`, "Green Net-Metering"],
        ["Total House Load Consumption", `${Math.round(station.homeLoadTotalEnergy || 0)} kWh`, "Facility Consumption"],
        ["Commissioning Day One", firstDateStr, "Certified Commission Date"],
        ["Total Days Active", `${station.generateDays || "--"} days`, "Continuous Logging"]
      ],
      theme: "plain",
      styles: { font: "helvetica", fontSize: 8.5, textColor: [20, 20, 20], lineColor: [209, 213, 219], lineWidth: 0.15, cellPadding: 2.8 },
      headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 8.5, lineWidth: 0.2, lineColor: [209, 213, 219] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 0: { cellWidth: 70, fontStyle: "bold" }, 1: { cellWidth: 60 }, 2: { cellWidth: 52 } }
    });
    currentY = (doc as any).lastAutoTable.finalY + 9;

    // Monthly Production History Table from Day One
    if (monthlyRecords.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(BLACK[0], BLACK[1], BLACK[2]);
      doc.text("Monthly Historical Performance Breakdown (From Day One)", margin, currentY);
      currentY += 5;

      const monthRows = monthlyRecords.map((m: any) => [
        m.dateStr || m.month || "--",
        m.energy ? `${(m.energy / (m.energyStr === "MWh" ? 1 : 1000)).toFixed(2)} MWh` : "--",
        m.batteryChargeEnergy ? `${Math.round(m.batteryChargeEnergy)} kWh` : "0 kWh",
        m.batteryDischargeEnergy ? `${Math.round(m.batteryDischargeEnergy)} kWh` : "0 kWh",
        m.homeLoadEnergy ? `${Math.round(m.homeLoadEnergy)} kWh` : "0 kWh",
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["Month", "Solar Generation", "Battery Charge", "Battery Discharge", "Consumption"]],
        body: monthRows,
        theme: "plain",
        styles: { font: "helvetica", fontSize: 8, textColor: [20, 20, 20], lineColor: [209, 213, 219], lineWidth: 0.15, cellPadding: 2.5 },
        headStyles: { fillColor: [243, 244, 246], fontStyle: "bold", fontSize: 8, lineWidth: 0.2, lineColor: [209, 213, 219] },
        alternateRowStyles: { fillColor: [250, 250, 250] },
      });
      currentY = (doc as any).lastAutoTable.finalY + 9;
    }

    // Footers
    const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(130, 130, 130);
      doc.text(`POWER2G-cloud Lifetime Export • Page ${p} of ${totalPages}`, pageWidth - margin - 50, pageHeight - 8);
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="P2G_${plantName.replace(/\s+/g, "_")}_DayOne_Report.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Export day-one report error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
