import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * BMS Collector Health API
 * Returns:
 * - Last successful BMS collection time per inverter
 * - Minutes since last collection
 * - Stale flag (> 10 minutes = warning, > 15 minutes = critical)
 * - Total records collected today
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId") || null;

    const params: any[] = [];
    let stationFilter = "";
    if (stationId) {
      params.push(stationId);
      stationFilter = "WHERE station_id = $1";
    }

    const result = await pool.query(
      `SELECT
        station_id,
        inverter_sn,
        MAX(recorded_at)                                              AS last_collected_at,
        EXTRACT(EPOCH FROM (NOW() - MAX(recorded_at))) / 60.0        AS minutes_since_last,
        COUNT(*) FILTER (WHERE recorded_at > NOW() - INTERVAL '24h') AS records_last_24h,
        COUNT(*) FILTER (WHERE recorded_at > date_trunc('day', NOW() AT TIME ZONE 'Asia/Karachi'))
                                                                      AS records_today,
        MIN(recorded_at)                                              AS earliest_ever,
        COUNT(*)                                                      AS total_records
      FROM solis_bms_telemetry
      ${stationFilter}
      GROUP BY station_id, inverter_sn
      ORDER BY last_collected_at DESC NULLS LAST`,
      params
    );

    const health = result.rows.map((r) => {
      const minsSinceLast = parseFloat(r.minutes_since_last) || 9999;
      let status: "ok" | "warning" | "critical" | "never" = "ok";
      if (r.last_collected_at === null) status = "never";
      else if (minsSinceLast > 15) status = "critical";
      else if (minsSinceLast > 10) status = "warning";

      return {
        station_id: r.station_id,
        inverter_sn: r.inverter_sn,
        last_collected_at: r.last_collected_at,
        minutes_since_last: Math.round(minsSinceLast * 10) / 10,
        records_last_24h: parseInt(r.records_last_24h) || 0,
        records_today: parseInt(r.records_today) || 0,
        total_records: parseInt(r.total_records) || 0,
        earliest_ever: r.earliest_ever,
        status,
        stale: status !== "ok",
      };
    });

    // Overall system health
    const anyStale = health.some((h) => h.stale);
    const allCritical = health.length > 0 && health.every((h) => h.status === "critical" || h.status === "never");

    return NextResponse.json({
      success: true,
      systemStatus: allCritical ? "critical" : anyStale ? "warning" : "ok",
      inverterCount: health.length,
      health,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  } catch (error: any) {
    console.error("BMS Health API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
