import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
  ssl: { rejectUnauthorized: false },
});

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Up to 60s for serverless multi-plant sync

const SOLIS_API_BASE = "https://www.soliscloud.com";
const SOLIS_HMAC_SECRET = "5704383536604a8bb94c83ebc059aa8c";
const SOLIS_KEY_ID = "2424";

const PLANTS = [
  { id: "1298491919450797504", name: "P2G 20kw", capacityKwp: 18.0, location: "Ahbab Street, Korangi Industrial Area, Karachi" },
  { id: "1298491919450849994", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Ahbab Street, Korangi Industrial Area, Karachi" },
  { id: "1298491919450917639", name: "Menu Karachi Office", capacityKwp: 70.0, location: "Menu karachi DC office, Napier Quarter, Karachi" },
  { id: "1298491919450965315", name: "P2G 50KW", capacityKwp: 2.0, location: "Ahbab Street, Korangi Industrial Area, Karachi" },
  { id: "1298491919451014032", name: "Towfiq chinoy", capacityKwp: 29.67, location: "Karachi, Sindh, Pakistan" },
  { id: "1298491919451065126", name: "OPL Residence", capacityKwp: 20.0, location: "5.6 KM, Sindh Coastal Highway, Gadap Town, Karachi" },
  { id: "1298491919451108253", name: "36 Chenab", capacityKwp: 10.0, location: "Plot 36, Green Forts 2, Canal Road, Lahore" },
  { id: "1298491919451187428", name: "P2G 15KW", capacityKwp: 0.0, location: "10-203, Ahbab Street, Korangi, Karachi" },
];

function md5Base64(str: string) {
  return crypto.createHash("md5").update(str, "utf8").digest("base64");
}

function hmacSha1Base64(key: string, data: string) {
  return crypto.createHmac("sha1", key).update(data, "utf8").digest("base64");
}

async function solisPost(apiPath: string, body: any) {
  const bodyStr = JSON.stringify(body);
  const date = new Date().toUTCString();
  const contentMd5 = md5Base64(bodyStr);
  const signPath = apiPath.replace(/^\/api/, "");
  const signStr = `POST\n${contentMd5}\napplication/json\n${date}\n${signPath}`;
  const signature = hmacSha1Base64(SOLIS_HMAC_SECRET, signStr);

  const headers: Record<string, string> = {
    "Content-Type": "application/json;charset=UTF-8",
    "Content-MD5": contentMd5,
    "Authorization": `WEB ${SOLIS_KEY_ID}:${signature}`,
    "Time": date,
    "Accept": "application/json, text/plain, */*",
    "Language": "2",
    "X-Cloud-Platform": "GLY",
    "Version": "5.3.001",
    "Platform": "Web",
  };

  const res = await fetch(SOLIS_API_BASE + apiPath, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  return await res.json();
}

function getPktDateStr() {
  const pktDate = new Date(Date.now() + 5 * 3600 * 1000);
  return pktDate.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const todayDateStr = getPktDateStr();
    let updatedCount = 0;

    for (const p of PLANTS) {
      try {
        // 1. Fetch detailMix
        const mixRes = await solisPost("/api/station/detailMix", { id: p.id, timeZone: 5 });
        const mix = mixRes?.data || {};

        // 2. Fetch today's day curve
        const curveRes = await solisPost("/api/chart/station/day/v2", {
          id: p.id,
          time: todayDateStr,
          timeZone: 5,
        });

        let latestCurvePoint: any = null;
        if (curveRes?.success && curveRes.data) {
          const d = curveRes.data;
          const pvs = Array.isArray(d.pvPowerList) ? d.pvPowerList : [];
          const bats = Array.isArray(d.storagePowerList) ? d.storagePowerList : [];
          const grids = Array.isArray(d.gridPowerList) ? d.gridPowerList : [];
          const loads = Array.isArray(d.homeLoadPowerList) ? d.homeLoadPowerList : [];
          const socs = Array.isArray(d.batteryPercentList) ? d.batteryPercentList : [];

          // Find latest valid entry
          for (let i = pvs.length - 1; i >= 0; i--) {
            const pt = pvs[i];
            if (pt && pt.data !== null && pt.data !== undefined) {
              const bPt = bats[i] || {};
              const gPt = grids[i] || {};
              const lPt = loads[i] || {};
              const sPt = socs[i] || {};

              const bVal = bPt.data !== null && bPt.data !== undefined ? Number(bPt.data) : 0;
              const bState = bVal > 0.05 ? "Charging" : bVal < -0.05 ? "Discharging" : "Idle";

              latestCurvePoint = {
                timeStr: pt.timeStr || "",
                solarKw: Number(pt.data || 0),
                batKw: bVal,
                batState: bState,
                soc: Number(sPt.data || 0),
                gridKw: gPt.data !== null && gPt.data !== undefined ? Number(gPt.data) : 0,
                loadKw: lPt.data !== null && lPt.data !== undefined ? Number(lPt.data) : 0,
              };
              break;
            }
          }
        }

        const isOnline = latestCurvePoint !== null;
        const liveSolarKw = isOnline ? latestCurvePoint.solarKw : Number(mix.power || 0);
        let liveSoc = isOnline && latestCurvePoint.soc > 0 ? latestCurvePoint.soc : Number(mix.batteryCapacitySoc || mix.batteryPercent || 0);
        const liveBatKw = isOnline ? Math.abs(latestCurvePoint.batKw) : Number(mix.batteryPower || 0);
        const liveBatState = isOnline ? latestCurvePoint.batState : (mix.batteryState || "Idle");

        let liveGridKw = 0;
        if (isOnline && latestCurvePoint.gridKw !== 0) {
          liveGridKw = latestCurvePoint.gridKw;
        } else if (mix.gridPower !== undefined && Number(mix.gridPower) !== 0) {
          liveGridKw = Number(mix.gridPower);
        }

        const mixLoadKw = Number(mix.totalLoadPower || mix.familyLoadPower || 0);
        const liveLoadKw = mixLoadKw > 0
          ? mixLoadKw
          : (isOnline && latestCurvePoint.loadKw > 0
            ? latestCurvePoint.loadKw
            : Math.max(0, liveSolarKw + (liveBatState === "Discharging" ? liveBatKw : -liveBatKw) - liveGridKw));

        const summaryObj = {
          solar: { activePowerKw: liveSolarKw },
          battery: { socPercent: liveSoc, powerKw: liveBatKw, direction: liveBatState },
          grid: { activePowerKw: liveGridKw },
          load: { totalPowerKw: liveLoadKw },
          inverter: { state: liveSolarKw > 0.5 ? 1 : 2 },
        };

        await pool.query(
          `INSERT INTO solis_telemetry_latest (
            station_id, station_name, location, installed_capacity_kw,
            solar_power_kw, battery_soc, battery_power_kw, battery_direction,
            grid_power_kw, load_power_kw, summary, raw_data, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (station_id) DO UPDATE SET
            solar_power_kw = EXCLUDED.solar_power_kw,
            battery_soc = EXCLUDED.battery_soc,
            battery_power_kw = EXCLUDED.battery_power_kw,
            battery_direction = EXCLUDED.battery_direction,
            grid_power_kw = EXCLUDED.grid_power_kw,
            load_power_kw = EXCLUDED.load_power_kw,
            summary = EXCLUDED.summary,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW();`,
          [
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
          ]
        );

        updatedCount++;
      } catch (pErr) {
        console.error(`Error updating plant ${p.name}:`, pErr);
      }
    }

    return NextResponse.json({
      success: true,
      plantsUpdated: updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("24/7 Cloud Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
