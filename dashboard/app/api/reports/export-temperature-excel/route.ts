import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import https from "https";
import crypto from "crypto";
import * as XLSX from "xlsx";

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

    // 2. Resolve Configuration
    let config = KNOWN_PLANTS_CONFIG[plantId];
    let plantName = config?.name || "Solar Plant";
    let invDesc = config ? `${config.inverterModel} (SN: ${config.inverterSn})` : "Solis Inverter";
    let invId = config?.inverterId || "1308675217950513392";

    let records: any[] = [];

    // Check cached file
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

    // Build Excel Workbook
    const wb = XLSX.utils.book_new();

    // Summary metadata sheet
    const summaryData = [
      ["Plant Name", plantName],
      ["Plant ID", plantId],
      ["Inverter Specification", invDesc],
      ["Export Timestamp", new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }) + " PKT"],
      ["Total Recorded Days", records.length],
      ["Start Date", records[0]?.date || "--"],
      ["End Date (Current Horizon)", records[records.length - 1]?.date || todayStr],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 25 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Plant Summary");

    // Detail rows
    const excelRows = records.map((d: any) => ({
      "Date": d.date,
      "Min Temp (°C)": d.minTempC !== null && d.minTempC !== undefined ? Number(d.minTempC) : "--",
      "Max Temp (°C)": d.maxTempC !== null && d.maxTempC !== undefined ? Number(d.maxTempC) : "--",
      "Daily Avg (°C)": d.avgTempC !== null && d.avgTempC !== undefined ? Number(d.avgTempC) : "--",
      "Peak Time (PKT)": d.peakTime && d.peakTime !== "--" ? d.peakTime : (d.points === 0 ? "Offline / No Log" : "--"),
      "Telemetry Points": d.points || 0,
    }));

    const wsData = XLSX.utils.json_to_sheet(excelRows);
    wsData["!cols"] = [
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsData, "Daily Temperature");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const cleanFileName = plantName.replace(/[^a-zA-Z0-9_\-]/g, "_");

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${cleanFileName}_Temperature_History_Report.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export temperature Excel error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate Excel report" }, { status: 500 });
  }
}
