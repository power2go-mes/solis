import crypto from "crypto";
import https from "https";
import { pool } from "./db";

const SOLIS_HMAC_SECRET = process.env.SOLIS_HMAC_SECRET || "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = process.env.SOLIS_KEY_ID || "2424";
let sessionCookie: string | null = null;

function md5Base64(str: string) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key: string, data: string) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

export function solisPost(apiPath: string, body: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const date = new Date().toUTCString();
    const contentMd5 = md5Base64(bodyStr);
    const signPath = apiPath.replace(/^\/api/, "");
    const signStr = `POST\n${contentMd5}\napplication/json\n${date}\n${signPath}`;
    const signature = hmacSha1Base64(SOLIS_HMAC_SECRET, signStr);

    const headers: Record<string, any> = {
      "Content-Type": "application/json;charset=UTF-8",
      "Content-MD5": contentMd5,
      Authorization: `WEB ${SOLIS_KEY_ID}:${signature}`,
      Time: date,
      Accept: "application/json, text/plain, */*",
      Language: "2",
      "X-Cloud-Platform": "GLY",
      Version: "5.3.001",
      Platform: "Web",
      "Content-Length": Buffer.byteLength(bodyStr),
    };
    if (sessionCookie) headers["Cookie"] = sessionCookie;

    const req = https.request(
      "https://www.soliscloud.com" + apiPath,
      { method: "POST", headers, timeout: 20000 },
      (res) => {
        if (res.headers["set-cookie"]) {
          sessionCookie = res.headers["set-cookie"].map((c: string) => c.split(";")[0]).join("; ");
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

export async function ensureSolisLogin() {
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

export const INVERTER_ID_MAP: Record<string, string> = {
  "1053050258180057": "1308675217950425937",
  "1053050258140015": "1308675217950425397",
  "1053050258110159": "1308675217950440077",
  "1053010259280019": "1308675217950513392",
  "1053050258180112": "1308675217950425926",
  "1053050255210107": "1308675217949880638",
  "1031731257050184": "1308675217950080058",
  "1033161256090193": "1308675217950003743",
  "1033320253150969": "1308675217949806488",
};

/**
 * Fetch and upsert 5-min inverter day curve on-demand for any given date & inverter
 */
export async function fetchAndSaveInverterDayCurve(invSn: string, dateStr: string) {
  let invId = INVERTER_ID_MAP[invSn];
  if (!invId) {
    // Dynamic detail lookup
    try {
      const d = await solisPost("/api/inverter/detail", { sn: invSn });
      invId = d.data?.id;
      if (invId) INVERTER_ID_MAP[invSn] = invId;
    } catch {}
  }
  if (!invId) return null;

  try {
    if (!sessionCookie) {
      await ensureSolisLogin();
    }

    let res = await solisPost("/api/chart/inverter/day", {
      id: invId,
      time: dateStr,
      timeZone: 5,
    });

    if (!res.success) {
      await ensureSolisLogin();
      res = await solisPost("/api/chart/inverter/day", {
        id: invId,
        time: dateStr,
        timeZone: 5,
      });
    }

    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      const rows = res.data;
      const values: string[] = [];
      const params: any[] = [];
      const seenTimes = new Set<string>();
      let pIdx = 1;

      // Clean up previous records for this inverter and date to prevent duplicate offsets
      await pool.query(
        `DELETE FROM solis_inverter_day_curve WHERE inverter_sn = $1 AND curve_date = $2::date`,
        [invSn, dateStr]
      );

      for (const item of rows) {
        // SolisCloud's internal chart API delivers timestamps and timeStr in China Standard Time (UTC+8).
        // Since Pakistan is UTC+5, there is a fixed 3-hour difference (UTC+8 -> UTC+5 = minus 3 hours).
        let timeStr = "00:00:00";
        if (item.time) {
          const parts = item.time.split(":");
          if (parts.length >= 2) {
            let h = parseInt(parts[0], 10) - 3;
            // If subtracting 3 hours rolls backward into yesterday (< 0), skip it for today's curve!
            if (h < 0) {
              continue;
            }
            const hh = String(h).padStart(2, "0");
            timeStr = `${hh}:${parts[1]}:${parts[2] || "00"}`;
          }
        } else if (item.dataTimestamp) {
          const ts = Number(item.dataTimestamp);
          if (!isNaN(ts) && ts > 0) {
            timeStr = new Date(ts).toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour12: false });
          }
        }

        if (seenTimes.has(timeStr)) continue;
        seenTimes.add(timeStr);

        const pacKw = Number((Number(item.pac || 0) / 1000).toFixed(2));
        const batPowerKw = Number((Number(item.batteryPower || 0) / 1000).toFixed(2));
        const soc = Math.round(Number(item.batteryCapacitySoc || 0));
        const batVolt = Number(item.batteryVoltage || item.storageBatteryVoltage || 0);
        const tempC = Number(item.inverterTemperature || 0);
        const eToday = Number(item.eToday || 0);

        values.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8})`);
        params.push(invSn, dateStr, timeStr, pacKw, batPowerKw, soc, batVolt, tempC, eToday);
        pIdx += 9;
      }

      if (values.length > 0) {
        await pool.query(
          `INSERT INTO solis_inverter_day_curve (
            inverter_sn, curve_date, time_str, pac_kw,
            battery_power_kw, battery_soc, battery_voltage,
            inverter_temp_c, e_today
          ) VALUES ${values.join(", ")}
          ON CONFLICT (inverter_sn, curve_date, time_str) DO UPDATE SET
            pac_kw = EXCLUDED.pac_kw,
            battery_power_kw = EXCLUDED.battery_power_kw,
            battery_soc = EXCLUDED.battery_soc,
            battery_voltage = EXCLUDED.battery_voltage,
            inverter_temp_c = EXCLUDED.inverter_temp_c,
            e_today = EXCLUDED.e_today`,
          params
        );
      }
      return rows;
    }
  } catch (err: any) {
    console.error(`[InverterCurve] Failed fetching curve for ${invSn} on ${dateStr}:`, err.message);
  }
  return null;
}
