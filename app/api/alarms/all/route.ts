import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const status = params.get("status") || "All";
  const level = params.get("level") || "All";
  const deviceType = params.get("deviceType") || "All";
  const category = params.get("category") || "All";
  const plant = params.get("plant") || "All";
  const search = (params.get("search") || "").trim();
  try {
    const result = await pool.query(
      `SELECT a.id, a.station_id, a.station_name, a.device_sn, a.alarm_code,
              a.alarm_msg, a.alarm_level, a.alarm_begin_time, a.alarm_begin_time_str,
              a.alarm_end_time, a.alarm_end_time_str, a.alarm_duration_str,
              a.state, a.state_str, a.advice, a.protection_category
       FROM solis_alarm_logs a
       WHERE ($1 = 'All' OR a.station_id = $1 OR a.station_name = $1)
         AND ($2 = '' OR concat_ws(' ', a.device_sn, a.station_name, a.alarm_msg, a.alarm_code) ILIKE '%' || $2 || '%')
       ORDER BY a.alarm_begin_time DESC NULLS LAST, a.id DESC LIMIT 500`,
      [plant, search],
    );
    const allRecords = result.rows.map((row) => {
      const isRecovered = row.state === "2" || Boolean(row.alarm_end_time);
      const rawLevel = String(row.alarm_level ?? "").toLowerCase();
      const mappedLevel = rawLevel.includes("critical") || rawLevel === "2" ? "Critical" : rawLevel.includes("warn") || rawLevel === "1" ? "Warning" : "Info";
      const categoryValue = String(row.protection_category ?? "").toLowerCase();
      const isAlert = categoryValue.includes("alert") || ["107d", "1055"].includes(String(row.alarm_code ?? "").toLowerCase()) || String(row.alarm_msg ?? "").toLowerCase().includes("battery");
      return {
        id: String(row.id), deviceType: "Inverter", level: mappedLevel,
        status: isRecovered ? "Recovered" : "Active",
        plantName: row.station_name || "", plantId: row.station_id || "", sn: row.device_sn || "",
        alarmContent: row.alarm_msg || "", alarmCode: row.alarm_code || "",
        suggestedTreatment: row.advice || "", alarmDuration: row.alarm_duration_str || "",
        beginTimeStr: row.alarm_begin_time_str || (row.alarm_begin_time ? new Date(row.alarm_begin_time).toLocaleString("en-GB", { timeZone: "Asia/Karachi" }) : ""),
        category: isAlert ? "Alert" : "Alarm",
      };
    });
    const filtered = allRecords.filter((record) =>
      (status === "All" || record.status === status) &&
      (level === "All" || record.level.toLowerCase() === level.toLowerCase()) &&
      (category === "All" || record.category.toLowerCase() === category.toLowerCase()) &&
      (deviceType === "All" || record.deviceType.toLowerCase() === deviceType.toLowerCase())
    );
    return NextResponse.json({
      success: true, records: filtered, total: filtered.length,
      counts: {
        all: allRecords.length,
        alarms: allRecords.filter((r) => r.category === "Alarm").length,
        alerts: allRecords.filter((r) => r.category === "Alert").length,
        active: allRecords.filter((r) => r.status === "Active").length,
        recovered: allRecords.filter((r) => r.status === "Recovered").length,
      },
    });
  } catch (error) {
    console.error("GET /api/alarms/all failed", error);
    return NextResponse.json({ success: false, error: "Alarm data could not be loaded." }, { status: 500 });
  }
}
