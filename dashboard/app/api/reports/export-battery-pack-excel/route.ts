import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batterySn = searchParams.get("batterySn");
    const hours = parseInt(searchParams.get("hours") || "24", 10);

    if (!batterySn) {
      return NextResponse.json({ success: false, error: "batterySn parameter is required" }, { status: 400 });
    }

    // Query BMS telemetry points for this battery
    const bmsRes = await pool.query(`
      SELECT 
        recorded_at AT TIME ZONE 'Asia/Karachi' as time_pkt,
        station_id,
        inverter_sn,
        battery_sn,
        soc_percent,
        soh_percent,
        battery_voltage,
        battery_current,
        bms_power_kw,
        avg_temp_c,
        min_temp_c,
        max_temp_c,
        min_temp_location,
        max_temp_location,
        cell_voltage_delta_mv,
        min_cell_voltage,
        max_cell_voltage,
        min_cell_location,
        max_cell_location,
        bms_state,
        bms_alarm,
        failure_info_01,
        failure_info_02,
        loop_cycles
      FROM solis_bms_telemetry
      WHERE battery_sn = $1
        AND recorded_at >= NOW() - ($2 || ' hours')::interval
      ORDER BY recorded_at DESC
    `, [batterySn, hours]);

    // Also get alarms for connected inverter or battery
    const alarmsRes = await pool.query(`
      SELECT 
        alarm_code,
        alarm_msg,
        alarm_level,
        alarm_begin_time AT TIME ZONE 'Asia/Karachi' as begin_pkt,
        alarm_end_time AT TIME ZONE 'Asia/Karachi' as end_pkt,
        alarm_duration_str,
        state_str,
        advice
      FROM solis_alarm_logs
      WHERE (device_sn = (SELECT inverter_sn FROM solis_bms_telemetry WHERE battery_sn = $1 LIMIT 1)
         OR concat_ws(' ', alarm_msg, protection_desc) ILIKE '%' || $1 || '%')
        AND alarm_begin_time >= NOW() - ($2 || ' hours')::interval
      ORDER BY alarm_begin_time DESC
    `, [batterySn, hours]);

    const wb = XLSX.utils.book_new();

    // Sheet 1: Telemetry (sampled up to 500 records)
    const telemetryRows = bmsRes.rows.map((r, i) => ({
      "Record #": i + 1,
      "Timestamp (PKT)": r.time_pkt ? new Date(r.time_pkt).toISOString().replace("T", " ").slice(0, 19) : "",
      "Battery Pack S/N": r.battery_sn,
      "Connected Inverter": r.inverter_sn,
      "SOC (%)": Number(r.soc_percent),
      "SOH (%)": Number(r.soh_percent),
      "Pack Voltage (V)": Number(r.battery_voltage),
      "Current (A)": Number(r.battery_current),
      "Power (kW)": Number(r.bms_power_kw),
      "Operating State": Number(r.battery_current) > 1 ? "Charging" : Number(r.battery_current) < -1 ? "Discharging" : "Standby / Float",
      "Avg Cell Temp (°C)": Number(r.avg_temp_c),
      "Min Cell Temp (°C)": Number(r.min_temp_c),
      "Max Cell Temp (°C)": Number(r.max_temp_c),
      "Min Temp Location": r.min_temp_location,
      "Max Temp Location": r.max_temp_location,
      "Cell Voltage Delta (mV)": Number(r.cell_voltage_delta_mv),
      "Min Cell Voltage (V)": Number(r.min_cell_voltage),
      "Min Cell Location": r.min_cell_location,
      "Max Cell Voltage (V)": Number(r.max_cell_voltage),
      "Max Cell Location": r.max_cell_location,
      "BMS Alarm Code": r.bms_alarm,
      "Cycle Count": r.loop_cycles
    }));

    const ws1 = XLSX.utils.json_to_sheet(telemetryRows);
    XLSX.utils.book_append_sheet(wb, ws1, "Telemetry_Logs");

    // Sheet 2: Alarms & Alerts
    const alarmRows = alarmsRes.rows.map((r, i) => ({
      "Index": i + 1,
      "Alarm Code": r.alarm_code,
      "Message": r.alarm_msg,
      "Severity Level": r.alarm_level,
      "Start Time (PKT)": r.begin_pkt ? new Date(r.begin_pkt).toISOString().replace("T", " ").slice(0, 19) : "",
      "Resolved Time (PKT)": r.end_pkt ? new Date(r.end_pkt).toISOString().replace("T", " ").slice(0, 19) : "",
      "Duration": r.alarm_duration_str,
      "Status": r.state_str,
      "Advice / Treatment": r.advice
    }));

    const ws2 = XLSX.utils.json_to_sheet(alarmRows.length > 0 ? alarmRows : [{
      "Status": "Normal / Clear",
      "Message": "No active or recorded alarms in the selected period for this battery pack."
    }]);
    XLSX.utils.book_append_sheet(wb, ws2, "Alarms_and_Alerts");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${batterySn}_${hours}h_report.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Export pack excel failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
