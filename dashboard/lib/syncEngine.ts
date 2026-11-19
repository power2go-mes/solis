import crypto from "crypto";
import https from "https";
import { Pool } from "pg";

let connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";

if (connectionString.includes("pooler.supabase.com:5432")) {
  connectionString = connectionString.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

const SOLIS_API_BASE = "https://www.soliscloud.com";
const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";

let sessionCookie: string | null = null;

function md5Base64(str: string) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key: string, data: string) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

function postRequest(apiPath: string, body: any): Promise<any> {
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

    if (sessionCookie) {
      headers["Cookie"] = sessionCookie;
    }

    const url = new URL(SOLIS_API_BASE + apiPath);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: apiPath,
      method: "POST",
      headers: headers,
      timeout: 15000,
    };

    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          const tokenCookie = setCookie.find((c) => c.startsWith("token="));
          if (tokenCookie) sessionCookie = tokenCookie.split(";")[0];
          const acwCookie = setCookie.find((c) => c.startsWith("acw_tc="));
          if (acwCookie) {
            const acwPart = acwCookie.split(";")[0];
            sessionCookie = sessionCookie ? `${sessionCookie}; ${acwPart}` : acwPart;
          }
        }
        try {
          resolve({ status: res.statusCode, json: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, rawText: raw.slice(0, 100) });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.write(bodyStr);
    req.end();
  });
}

const PLANTS = [
  { id: "1298491919450797504", name: "Menu Karachi Office", capacityKwp: 80.0, location: "Karachi, Pakistan" },
  { id: "1298491919450958553", name: "OPL Residence", capacityKwp: 55.5, location: "Gharo, Pakistan" },
  { id: "1298491919450873747", name: "36 Chenab", capacityKwp: 25.155, location: "Lahore, Pakistan" },
  { id: "1298491919450740581", name: "P2G 50KW", capacityKwp: 32.0, location: "Karachi, Pakistan" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Karachi, Pakistan" },
];

function numOrNull(val: any) {
  if (val === null || val === undefined || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function getPktDateStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(0, 10);
}

function getPktMonthStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(0, 7);
}

async function uploadCurveBatch(rows: any[]) {
  if (!rows || rows.length === 0) return 0;
  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const r of chunk) {
      valueClauses.push(
        `($${pIdx}, $${pIdx + 1}, $${pIdx + 2}, $${pIdx + 3}, $${pIdx + 4}, $${pIdx + 5}, $${pIdx + 6}, $${pIdx + 7}, $${pIdx + 8}, $${pIdx + 9}, $${pIdx + 10}, $${pIdx + 11}, $${pIdx + 12}, $${pIdx + 13})`
      );
      params.push(
        r.stationId,
        r.dateStr,
        r.epoch,
        r.tStr,
        r.bW,
        r.bKw,
        r.bState,
        r.soc,
        r.sW,
        r.sKw,
        r.gW,
        r.gKw,
        r.lW,
        r.lKw
      );
      pIdx += 14;
    }

    const batchSql = `
      INSERT INTO solis_battery_power_curve (
        station_id, curve_date, timestamp_epoch, time_str,
        battery_power_w, battery_power_kw, battery_state,
        battery_soc, solar_power_w, solar_power_kw,
        grid_power_w, grid_power_kw, load_power_w, load_power_kw
      ) VALUES ${valueClauses.join(", ")}
      ON CONFLICT (station_id, curve_date, time_str) DO UPDATE SET
        timestamp_epoch = EXCLUDED.timestamp_epoch,
        battery_power_w = EXCLUDED.battery_power_w,
        battery_power_kw = EXCLUDED.battery_power_kw,
        battery_state = EXCLUDED.battery_state,
        battery_soc = EXCLUDED.battery_soc,
        solar_power_w = EXCLUDED.solar_power_w,
        solar_power_kw = EXCLUDED.solar_power_kw,
        grid_power_w = EXCLUDED.grid_power_w,
        grid_power_kw = EXCLUDED.grid_power_kw,
        load_power_w = EXCLUDED.load_power_w,
        load_power_kw = EXCLUDED.load_power_kw
    `;

    await pool.query(batchSql, params);
  }
  return rows.length;
}

export async function executeLiveSync() {
  const solisUser = process.env.SOLIS_USERNAME || "power2go";
  const solisPass = process.env.SOLIS_PASSWORD || "Admin@1234";

  const todayDateStr = getPktDateStr();
  const todayMonthStr = getPktMonthStr();
  const startTime = Date.now();

  // Login
  const passMd5 = crypto.createHash("md5").update(solisPass, "utf8").digest("hex");
  const loginRes = await postRequest("/api/user/login2", {
    userInfo: solisUser,
    passWord: passMd5,
    yingZhenType: 1,
    localTime: Date.now(),
    localTimeZone: 5,
    language: "2",
  });

  if (!loginRes.json?.success) {
    throw new Error(`SolisCloud Login Failed: ${loginRes.json?.msg || "unknown"}`);
  }

  const results: any[] = [];

  for (let i = 0; i < PLANTS.length; i++) {
    const p = PLANTS[i];
    try {
      const mixRes = await postRequest("/api/station/detailMix", {
        id: p.id,
        localTime: Date.now(),
        localTimeZone: 5,
        language: "2",
      });
      const mix = mixRes.json?.data || {};

      const curveRes = await postRequest("/api/chart/station/day/v2", {
        id: p.id,
        time: todayDateStr,
        timeZone: 5,
      });
      const dayData = curveRes.json?.data || {};

      const timeArray = dayData.time || [];
      const timeStrArray = dayData.timeStr || [];
      const solarPowerArray = dayData.pvAndAcCoupledPowerList || dayData.powerList || [];
      const batteryPowerArray = dayData.batteryPower || [];
      const gridPowerArray = dayData.psum || dayData.gridPowerList || [];
      const loadPowerArray = dayData.familyLoadPowerList || dayData.bypassLoadPowerList || [];
      const socArray = dayData.batteryCapacitySocList || [];

      const curveRows: any[] = [];
      let latestCurvePoint: any = null;

      for (let idx = 0; idx < timeArray.length; idx++) {
        let epoch = Number(timeArray[idx]);
        if (epoch > 1000000000000) epoch = Math.floor(epoch / 1000);
        let tStr = timeStrArray[idx];
        if (!tStr && epoch) {
          tStr = new Date((epoch + 5 * 3600) * 1000).toISOString().slice(11, 19);
        }
        if (!tStr) continue;
        if (tStr.length === 5) tStr += ":00";

        const sW = Number(solarPowerArray[idx] || 0);
        const bW = Number(batteryPowerArray[idx] || 0);
        const gW = Number(gridPowerArray[idx] || 0);
        const lW = Number(loadPowerArray[idx] || 0);
        const sc = Number(socArray[idx] || 0);

        const sKw = Number((sW / 1000).toFixed(2));
        const bKw = Number((bW / 1000).toFixed(2));
        const gKw = Number((gW / 1000).toFixed(2));
        const lKw = Number((lW / 1000).toFixed(2));

        let bState = "Idle";
        if (bKw > 0.05) bState = "Discharging";
        else if (bKw < -0.05) bState = "Charging";

        curveRows.push({
          stationId: p.id,
          dateStr: todayDateStr,
          epoch,
          tStr,
          bW,
          bKw,
          bState,
          soc: sc,
          sW,
          sKw,
          gW,
          gKw,
          lW,
          lKw,
        });

        latestCurvePoint = {
          timeStr: tStr,
          solarKw: sKw,
          batKw: bKw,
          batState: bState,
          soc: sc,
          gridKw: gKw,
          loadKw: lKw,
        };
      }

      await uploadCurveBatch(curveRows);

      const liveSolarKw = latestCurvePoint ? latestCurvePoint.solarKw : Number(mix.power || 0);
      const liveSoc = latestCurvePoint ? latestCurvePoint.soc : Number(mix.batteryCapacitySoc || 0);
      const liveBatKw = latestCurvePoint ? Math.abs(latestCurvePoint.batKw) : Number(mix.batteryPower || 0);
      const liveBatState = latestCurvePoint ? latestCurvePoint.batState : (mix.batteryState || "Idle");
      const liveGridKw = latestCurvePoint ? latestCurvePoint.gridKw : Number(mix.gridPower || 0);
      const liveLoadKw = latestCurvePoint ? latestCurvePoint.loadKw : Number(mix.familyLoadPower || 0);

      const telemetryLatestUpsertSql = `
        INSERT INTO solis_telemetry_latest (
          station_id, station_name, location, installed_capacity_kw,
          solar_power_kw, battery_soc, battery_power_kw, battery_direction,
          grid_power_kw, load_power_kw, summary, raw_data, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
        ) ON CONFLICT (station_id) DO UPDATE SET
          station_name = EXCLUDED.station_name,
          location = EXCLUDED.location,
          installed_capacity_kw = EXCLUDED.installed_capacity_kw,
          solar_power_kw = EXCLUDED.solar_power_kw,
          battery_soc = EXCLUDED.battery_soc,
          battery_power_kw = EXCLUDED.battery_power_kw,
          battery_direction = EXCLUDED.battery_direction,
          grid_power_kw = EXCLUDED.grid_power_kw,
          load_power_kw = EXCLUDED.load_power_kw,
          summary = EXCLUDED.summary,
          raw_data = EXCLUDED.raw_data,
          updated_at = NOW();
      `;

      const summaryObj = {
        solar: { activePowerKw: liveSolarKw },
        battery: { socPercent: liveSoc, powerKw: liveBatKw, direction: liveBatState },
        grid: { activePowerKw: liveGridKw },
        load: { totalPowerKw: liveLoadKw },
        inverter: { state: liveSolarKw > 0.5 ? 1 : 2 },
      };

      await pool.query(telemetryLatestUpsertSql, [
        p.id,
        p.name,
        p.location,
        p.capacityKwp,
        liveSolarKw,
        liveSoc,
        liveBatKw,
        liveBatState,
        liveGridKw,
        liveLoadKw,
        summaryObj,
        JSON.stringify(mix),
      ]);

      // Daily energy today
      const monthRes = await postRequest("/api/chart/station/month", {
        id: p.id,
        time: todayMonthStr,
        month: todayMonthStr,
        timeZone: 5,
        money: "PKR",
      });
      const monthlyDays = monthRes.json?.data || [];
      const todayRecord = monthlyDays.find((d: any) => (d.dateStr || d.date) === todayDateStr);

      if (todayRecord) {
        const dailyUpsertSql = `
          INSERT INTO solis_daily_energy (
            station_id, energy_date, solar_pv_kwh, house_load_kwh,
            battery_charge_kwh, battery_discharge_kwh,
            grid_purchased_kwh, grid_sold_kwh, backup_load_kwh,
            self_consumption_kwh, peak_sun_hours, currency, raw, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
          ) ON CONFLICT (station_id, energy_date) DO UPDATE SET
            solar_pv_kwh = EXCLUDED.solar_pv_kwh,
            house_load_kwh = EXCLUDED.house_load_kwh,
            battery_charge_kwh = EXCLUDED.battery_charge_kwh,
            battery_discharge_kwh = EXCLUDED.battery_discharge_kwh,
            grid_purchased_kwh = EXCLUDED.grid_purchased_kwh,
            grid_sold_kwh = EXCLUDED.grid_sold_kwh,
            backup_load_kwh = EXCLUDED.backup_load_kwh,
            self_consumption_kwh = EXCLUDED.self_consumption_kwh,
            peak_sun_hours = EXCLUDED.peak_sun_hours,
            currency = EXCLUDED.currency,
            raw = EXCLUDED.raw,
            updated_at = NOW();
        `;
        await pool.query(dailyUpsertSql, [
          p.id,
          todayDateStr,
          numOrNull(todayRecord.produceEnergy ?? todayRecord.energy ?? todayRecord.pvAndAcCoupledEnergy),
          numOrNull(todayRecord.consumeEnergy ?? todayRecord.homeLoadEnergy),
          numOrNull(todayRecord.batteryChargeEnergy),
          numOrNull(todayRecord.batteryDischargeEnergy),
          numOrNull(todayRecord.gridPurchasedEnergy),
          numOrNull(todayRecord.gridSellEnergy),
          numOrNull(todayRecord.backUpEnergy),
          numOrNull(todayRecord.oneSelf),
          numOrNull(todayRecord.fullHour),
          String(todayRecord.moneyStr || "PKR"),
          JSON.stringify(todayRecord),
        ]);
      }

      results.push({
        stationId: p.id,
        name: p.name,
        curvePoints: curveRows.length,
        liveSolarKw,
        liveSoc,
        liveBatKw,
        liveBatState,
      });
    } catch (err: any) {
      console.error(`Error syncing plant ${p.name}:`, err.message);
      results.push({
        stationId: p.id,
        name: p.name,
        error: err.message,
      });
    }
  }

  return {
    success: true,
    syncDate: todayDateStr,
    durationMs: Date.now() - startTime,
    plants: results,
  };
}
