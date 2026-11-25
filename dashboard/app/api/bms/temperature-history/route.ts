import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");
    const inverterSn = searchParams.get("inverterSn");
    const dateFrom = searchParams.get("dateFrom"); // ISO date string, e.g. "2026-11-18"
    const dateTo = searchParams.get("dateTo");     // ISO date string, e.g. "2026-11-25"
    const granularity = searchParams.get("granularity") || "5min"; // "5min" | "hourly" | "daily"

    if (!stationId) {
      return NextResponse.json({ success: false, error: "stationId is required" }, { status: 400 });
    }

    const params: any[] = [stationId];
    const conditions: string[] = ["station_id = $1", "avg_temp_c IS NOT NULL"];

    if (inverterSn) {
      params.push(inverterSn);
      conditions.push(`inverter_sn = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`recorded_at >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      conditions.push(`recorded_at < ($${params.length}::date + interval '1 day')`);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    let sql: string;

    if (granularity === "daily") {
      sql = `
        SELECT
          date_trunc('day', recorded_at) AS bucket,
          inverter_sn,
          MIN(min_temp_c)::float  AS min_temp_c,
          AVG(avg_temp_c)::float  AS avg_temp_c,
          MAX(max_temp_c)::float  AS max_temp_c,
          COUNT(*)                AS sample_count
        FROM solis_bms_telemetry
        ${whereClause}
        GROUP BY bucket, inverter_sn
        ORDER BY bucket ASC, inverter_sn ASC
      `;
    } else if (granularity === "hourly") {
      sql = `
        SELECT
          date_trunc('hour', recorded_at) AS bucket,
          inverter_sn,
          MIN(min_temp_c)::float  AS min_temp_c,
          AVG(avg_temp_c)::float  AS avg_temp_c,
          MAX(max_temp_c)::float  AS max_temp_c,
          COUNT(*)                AS sample_count
        FROM solis_bms_telemetry
        ${whereClause}
        GROUP BY bucket, inverter_sn
        ORDER BY bucket ASC, inverter_sn ASC
      `;
    } else {
      // Raw 5-minute points
      sql = `
        SELECT
          recorded_at             AS bucket,
          inverter_sn,
          min_temp_c::float       AS min_temp_c,
          avg_temp_c::float       AS avg_temp_c,
          max_temp_c::float       AS max_temp_c,
          min_temp_location,
          max_temp_location,
          soc_percent::float      AS soc_percent
        FROM solis_bms_telemetry
        ${whereClause}
        ORDER BY recorded_at ASC, inverter_sn ASC
        LIMIT 2000
      `;
    }

    const result = await pool.query(sql, params);

    // Coverage stats
    const statsResult = await pool.query(
      `SELECT
        inverter_sn,
        COUNT(*)                        AS total_rows,
        MIN(recorded_at)                AS earliest,
        MAX(recorded_at)                AS latest,
        MIN(min_temp_c)::float          AS overall_min,
        AVG(avg_temp_c)::float          AS overall_avg,
        MAX(max_temp_c)::float          AS overall_max
      FROM solis_bms_telemetry
      ${whereClause}
      GROUP BY inverter_sn`,
      params
    );

    return NextResponse.json({
      success: true,
      stationId,
      inverterSn: inverterSn || "all",
      granularity,
      dateFrom,
      dateTo,
      rowCount: result.rows.length,
      coverage: statsResult.rows,
      data: result.rows,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });

  } catch (error: any) {
    console.error("BMS Temperature History API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
