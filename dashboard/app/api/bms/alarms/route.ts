import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batterySn = searchParams.get("batterySn");

    if (!batterySn) {
      return NextResponse.json({ success: false, error: "batterySn is required" }, { status: 400 });
    }

    // 1. Get connected inverter and station
    const bmsInfo = await pool.query(`
      SELECT inverter_sn, station_id FROM solis_bms_telemetry WHERE battery_sn = $1 LIMIT 1
    `, [batterySn]);

    const invSn = bmsInfo.rows[0]?.inverter_sn || "";
    const stId = bmsInfo.rows[0]?.station_id || "";

    // 2. Query alarms from solis_alarm_logs for this device or station mentioning battery
    const alarms = await pool.query(`
      SELECT 
        id,
        station_name,
        device_sn,
        alarm_code,
        alarm_msg,
        alarm_level,
        alarm_begin_time AT TIME ZONE 'Asia/Karachi' as begin_pkt,
        alarm_end_time AT TIME ZONE 'Asia/Karachi' as end_pkt,
        alarm_duration_str,
        state_str,
        advice,
        protection_category
      FROM solis_alarm_logs
      WHERE (device_sn = $1 OR station_id = $2)
        AND (
          device_sn = $1 
          OR concat_ws(' ', alarm_msg, protection_category, protection_desc) ILIKE '%battery%'
          OR alarm_code IN ('1054', '1055', '107D', '1056')
        )
      ORDER BY alarm_begin_time DESC
      LIMIT 100
    `, [invSn, stId]);

    // 3. Query NOC alerts for this station
    const incidents = await pool.query(`
      SELECT 
        id,
        station_name,
        category,
        severity,
        title,
        description,
        status,
        created_at AT TIME ZONE 'Asia/Karachi' as created_at_pkt,
        resolved_at AT TIME ZONE 'Asia/Karachi' as resolved_at_pkt
      FROM noc_incidents
      WHERE station_id = $1 AND (category ILIKE '%battery%' OR title ILIKE '%battery%' OR category ILIKE '%hardware%')
      ORDER BY created_at DESC
      LIMIT 20
    `, [stId]);

    return NextResponse.json({
      success: true,
      batterySn,
      inverterSn: invSn,
      alarms: alarms.rows.map(r => ({
        id: r.id,
        alarmCode: r.alarm_code,
        alarmMsg: r.alarm_msg,
        level: r.alarm_level === "2" || String(r.alarm_level).toLowerCase().includes("crit") ? "Critical" : "Warning",
        beginTime: r.begin_pkt ? new Date(r.begin_pkt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" }) : "",
        endTime: r.end_pkt ? new Date(r.end_pkt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" }) : "",
        duration: r.alarm_duration_str,
        state: r.state_str,
        advice: r.advice
      })),
      incidents: incidents.rows.map(r => ({
        id: r.id,
        severity: r.severity,
        category: r.category,
        title: r.title,
        description: r.description,
        status: r.status,
        createdAt: r.created_at_pkt ? new Date(r.created_at_pkt).toLocaleString("en-GB", { timeZone: "Asia/Karachi" }) : ""
      }))
    });
  } catch (err: any) {
    console.error("GET /api/bms/alarms failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
