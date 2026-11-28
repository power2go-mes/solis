import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get("stationId");
    const inverterSn = searchParams.get("inverterSn");
    const batterySn = searchParams.get("batterySn");
    const dateFrom = searchParams.get("dateFrom"); // ISO date string, e.g. "2026-11-18"
    const dateTo = searchParams.get("dateTo");     // ISO date string, e.g. "2026-11-25"
    const granularity = searchParams.get("granularity") || "5min"; // "5min" | "hourly" | "daily"

    const source = searchParams.get("source");
    if (source === "cell" || source === "inverter") {
      if (!dateFrom || !dateTo || dateFrom > dateTo) {
        return NextResponse.json({ success: false, error: "Invalid date range" }, { status: 400 });
      }
      const cell = source === "cell";
      const inverterScope = searchParams.getAll("sn");
      const input = cell ? `
        SELECT recorded_at AT TIME ZONE 'Asia/Karachi' AS local_time, inverter_sn, battery_sn,
               min_temp_c AS low, NULL::numeric AS typical, max_temp_c AS high, min_temp_location, max_temp_location
        FROM solis_bms_telemetry
        WHERE recorded_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Karachi')
          AND recorded_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Karachi')
          AND ($4::text IS NULL OR battery_sn = $4)
          AND (min_temp_c IS NOT NULL OR max_temp_c IS NOT NULL)
      ` : `
        SELECT curve_date + time_str::time AS local_time, inverter_sn,
               inverter_temp_c AS low, inverter_temp_c AS typical, inverter_temp_c AS high
        FROM solis_inverter_day_curve
        WHERE curve_date BETWEEN $1::date AND $2::date AND inverter_temp_c IS NOT NULL
      `;
      const bucket = granularity === "daily" ? "date_trunc('day', local_time)"
        : granularity === "hourly" ? "date_trunc('hour', local_time)"
        : "date_bin(interval '5 minutes', local_time, timestamp '2000-01-01')";
      const args = [dateFrom, dateTo, inverterScope, ...(cell ? [batterySn] : [])];
      const result = await pool.query(`
        WITH readings AS (${input})
        SELECT ${bucket} AT TIME ZONE 'Asia/Karachi' AS bucket, inverter_sn, ${cell ? "battery_sn," : ""}
               ${cell ? `
                 (array_agg(min_temp_location ORDER BY low ASC NULLS LAST, local_time DESC, min_temp_location)
                   FILTER (WHERE low IS NOT NULL))[1] AS min_temp_location,
                 (array_agg(max_temp_location ORDER BY high DESC NULLS LAST, local_time DESC, max_temp_location)
                   FILTER (WHERE high IS NOT NULL))[1] AS max_temp_location,
               ` : ""}
               MIN(low)::float AS min_temp_c, AVG(typical)::float AS avg_temp_c,
               MAX(high)::float AS max_temp_c, COUNT(*)::int AS sample_count
        FROM readings
        WHERE inverter_sn = ANY($3::text[]) AND local_time <= CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi'
        GROUP BY bucket, inverter_sn ${cell ? ", battery_sn" : ""} ORDER BY bucket, inverter_sn
      `, args);
      return NextResponse.json({success: true, data: result.rows});
    }

    const params: any[] = [];
    const conditions: string[] = ["avg_temp_c IS NOT NULL"];

    if (batterySn && batterySn !== "All" && batterySn !== "all") {
      params.push(batterySn);
      conditions.push(`battery_sn = $${params.length}`);
    } else if (inverterSn && inverterSn !== "All" && inverterSn !== "all") {
      params.push(inverterSn);
      conditions.push(`inverter_sn = $${params.length}`);
    } else if (stationId && stationId !== "All" && stationId !== "all") {
      params.push(stationId);
      conditions.push(`station_id = $${params.length}`);
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
