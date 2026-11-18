import { Pool } from "pg";
import {
  PlantInfo,
  TelemetryLatest,
  PowerCurvePoint,
  DailyEnergyRecord,
  AlarmRecord,
  BmsTelemetry,
  InverterTelemetry,
} from "./types";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.jimlvgbbgomrhaqrzllx:Abdul1367453390@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

// Global database pool for Next.js server runtime
declare global {
  var _solisDbPool: Pool | undefined;
}

const pool =
  global._solisDbPool ||
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
  });

if (process.env.NODE_ENV !== "production") {
  global._solisDbPool = pool;
}

// 7 Authorized SolisCloud Plants Registry (Discovered dynamically)
export const AUTHORIZED_PLANTS: PlantInfo[] = [
  {
    id: "1298491919450797504",
    name: "Menu Karachi Office",
    location: "Karachi, Pakistan",
    capacityKwp: 80.0,
    inverterCount: 2,
    batteryInstalled: true,
    dataloggerSn: "7A12570303D040F0",
    hasDataInDb: true,
  },
  {
    id: "1298491919450958553",
    name: "OPL Residence",
    location: "Gharo, Pakistan",
    capacityKwp: 55.5,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A1257240AE01C5A",
    hasDataInDb: true,
  },
  {
    id: "1298491919450873747",
    name: "36 Chenab",
    location: "Lahore, Pakistan",
    capacityKwp: 25.155,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A1259260A40120D",
    hasDataInDb: true,
  },
  {
    id: "1298491919450851319",
    name: "P2G 20kw",
    location: "Karachi, Pakistan",
    capacityKwp: 18.0,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A12532605C0A5DB",
    hasDataInDb: true,
  },
  {
    id: "1298491919450840394",
    name: "P2G 1ST 6kw",
    location: "Karachi, Pakistan",
    capacityKwp: 20.0,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A1256240B001722",
    hasDataInDb: true,
  },
  {
    id: "1298491919450740581",
    name: "P2G 50KW",
    location: "Karachi, Pakistan",
    capacityKwp: 32.0,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A12551308F022F8",
    hasDataInDb: true,
  },
  {
    id: "1298491919450734544",
    name: "P2G 15KW",
    location: "Karachi, Pakistan",
    capacityKwp: 20.0,
    inverterCount: 1,
    batteryInstalled: true,
    dataloggerSn: "7A12541606D04928",
    hasDataInDb: true,
  },
];

export async function getAuthorizedPlants(): Promise<PlantInfo[]> {
  try {
    // Check which plants actually have telemetry records in Supabase and pull live status
    const res = await pool.query(`
      SELECT station_id, station_name, location, installed_capacity_kw,
             solar_power_kw, battery_soc, battery_power_kw, grid_power_kw, load_power_kw,
             summary, updated_at
      FROM solis_telemetry_latest
    `);
    const dbStations = new Map<string, any>();
    res.rows.forEach((r) => dbStations.set(r.station_id, r));

    return AUTHORIZED_PLANTS.map((p) => {
      const match = dbStations.get(p.id);
      if (match) {
        const updatedTime = new Date(match.updated_at).getTime();
        const isStale = Date.now() - updatedTime > 30 * 60 * 1000;
        const invState = match.summary?.inverter?.state ?? (match.solar_power_kw > 0 ? "1" : "2");
        return {
          ...p,
          name: match.station_name || p.name,
          location: match.location || p.location,
          capacityKwp: Number(match.installed_capacity_kw) || p.capacityKwp,
          hasDataInDb: true,
          liveSolarKw: Number(match.solar_power_kw) || 0,
          liveBatterySoc: Number(match.battery_soc) || 0,
          liveBatteryPowerKw: Number(match.battery_power_kw) || 0,
          liveGridKw: Number(match.grid_power_kw) || 0,
          liveLoadKw: Number(match.load_power_kw) || 0,
          inverterState: invState,
          isStale,
        };
      }
      return p;
    });
  } catch (err) {
    console.error("Error querying plant registry:", err);
    return AUTHORIZED_PLANTS;
  }
}

export async function getLatestTelemetry(
  stationId: string
): Promise<TelemetryLatest | null> {
  try {
    const res = await pool.query(
      `SELECT * FROM solis_telemetry_latest WHERE station_id = $1 LIMIT 1`,
      [stationId]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Determine staleness: older than 30 minutes is marked stale
    const updatedTime = new Date(row.updated_at).getTime();
    const isStale = Date.now() - updatedTime > 30 * 60 * 1000;

    return {
      station_id: row.station_id,
      updated_at: row.updated_at.toISOString(),
      station_name: row.station_name || "Unknown Plant",
      location: row.location || "Pakistan",
      installed_capacity_kw: Number(row.installed_capacity_kw) || 0,
      inverter_sn: row.inverter_sn || "",
      inverter_model: row.inverter_model || "",
      datalogger_sn: row.datalogger_sn || "",
      data_timestamp: row.data_timestamp || "",
      battery_soc: Number(row.battery_soc) || 0,
      battery_soh: Number(row.battery_soh) || 0,
      battery_power_kw: Number(row.battery_power_kw) || 0,
      battery_direction: row.battery_direction || "Idle",
      solar_power_kw: Number(row.solar_power_kw) || 0,
      grid_power_kw: Number(row.grid_power_kw) || 0,
      grid_direction: row.grid_direction || "Normal",
      load_power_kw: Number(row.load_power_kw) || 0,
      summary: row.summary || {},
      raw_data: row.raw_data || {},
      is_stale: isStale,
    };
  } catch (err) {
    console.error("Error in getLatestTelemetry:", err);
    return null;
  }
}

export async function getPlantPowerCurve(
  stationId: string,
  dateStr?: string
): Promise<PowerCurvePoint[]> {
  try {
    // If no date specified, pick the most recent date available in the curve table
    let targetDate = dateStr;
    if (!targetDate) {
      const latestDateRes = await pool.query(
        `SELECT MAX(curve_date)::text as latest_date FROM solis_battery_power_curve WHERE station_id = $1`,
        [stationId]
      );
      targetDate = latestDateRes.rows[0]?.latest_date;
    }

    if (!targetDate) return [];

    const res = await pool.query(
      `SELECT id, station_id, curve_date::text, timestamp_epoch, time_str,
              battery_power_kw, battery_state, battery_soc,
              solar_power_kw, grid_power_kw, load_power_kw
       FROM solis_battery_power_curve
       WHERE station_id = $1 AND curve_date = $2
       ORDER BY timestamp_epoch ASC`,
      [stationId, targetDate]
    );

    return res.rows.map((r) => ({
      id: Number(r.id),
      station_id: r.station_id,
      curve_date: r.curve_date,
      timestamp_epoch: Number(r.timestamp_epoch),
      time_str: r.time_str,
      battery_power_kw: Number(r.battery_power_kw) || 0,
      battery_state: r.battery_state || "Idle",
      battery_soc: Number(r.battery_soc) || 0,
      solar_power_kw: Number(r.solar_power_kw) || 0,
      grid_power_kw: Number(r.grid_power_kw) || 0,
      load_power_kw: Number(r.load_power_kw) || 0,
    }));
  } catch (err) {
    console.error("Error in getPlantPowerCurve:", err);
    return [];
  }
}

export async function getDailyEnergy(
  stationId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyEnergyRecord[]> {
  try {
    let query = `
      SELECT id, station_id, energy_date::text,
             solar_pv_kwh, house_load_kwh,
             battery_charge_kwh, battery_discharge_kwh,
             grid_purchased_kwh, grid_sold_kwh,
             backup_load_kwh, self_consumption_kwh,
             peak_sun_hours, currency
      FROM solis_daily_energy
      WHERE station_id = $1
    `;
    const params: any[] = [stationId];

    if (startDate && endDate) {
      params.push(startDate, endDate);
      query += ` AND energy_date BETWEEN $2 AND $3`;
    }

    query += ` ORDER BY energy_date ASC`;

    const res = await pool.query(query, params);
    return res.rows.map((r) => ({
      id: Number(r.id),
      station_id: r.station_id,
      energy_date: r.energy_date,
      solar_pv_kwh: Number(r.solar_pv_kwh) || 0,
      house_load_kwh: Number(r.house_load_kwh) || 0,
      battery_charge_kwh: Number(r.battery_charge_kwh) || 0,
      battery_discharge_kwh: Number(r.battery_discharge_kwh) || 0,
      grid_purchased_kwh: Number(r.grid_purchased_kwh) || 0,
      grid_sold_kwh: Number(r.grid_sold_kwh) || 0,
      backup_load_kwh: Number(r.backup_load_kwh) || 0,
      self_consumption_kwh: Number(r.self_consumption_kwh) || 0,
      peak_sun_hours: Number(r.peak_sun_hours) || 0,
      currency: r.currency || "PKR",
    }));
  } catch (err) {
    console.error("Error in getDailyEnergy:", err);
    return [];
  }
}

export async function getAlarmLogs(
  stationId: string,
  options?: {
    severity?: string;
    state?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ records: AlarmRecord[]; total: number }> {
  try {
    let whereClauses = [`station_id = $1`];
    let params: any[] = [stationId];

    if (options?.severity) {
      params.push(options.severity);
      whereClauses.push(`alarm_level = $${params.length}`);
    }

    if (options?.state !== undefined && options?.state !== "ALL") {
      params.push(options.state);
      whereClauses.push(`state = $${params.length}`);
    }

    if (options?.search) {
      params.push(`%${options.search}%`);
      whereClauses.push(
        `(alarm_code ILIKE $${params.length} OR alarm_msg ILIKE $${params.length} OR protection_desc ILIKE $${params.length})`
      );
    }

    const whereStr = whereClauses.join(" AND ");

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM solis_alarm_logs WHERE ${whereStr}`,
      params
    );
    const total = Number(countRes.rows[0]?.count || 0);

    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    params.push(limit, offset);

    const dataRes = await pool.query(
      `SELECT * FROM solis_alarm_logs 
       WHERE ${whereStr} 
       ORDER BY alarm_begin_time DESC NULLS LAST, id DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const records: AlarmRecord[] = dataRes.rows.map((r) => ({
      id: Number(r.id),
      station_id: r.station_id,
      station_name: r.station_name,
      alarm_pk: r.alarm_pk,
      device_sn: r.device_sn,
      alarm_code: r.alarm_code,
      alarm_msg: r.alarm_msg,
      alarm_level: r.alarm_level,
      protection_category: r.protection_category,
      protection_desc: r.protection_desc,
      alarm_begin_time: r.alarm_begin_time
        ? r.alarm_begin_time.toISOString()
        : "",
      alarm_begin_time_str: r.alarm_begin_time_str || "",
      alarm_end_time: r.alarm_end_time ? r.alarm_end_time.toISOString() : null,
      alarm_end_time_str: r.alarm_end_time_str || null,
      alarm_duration_str: r.alarm_duration_str || "Active",
      state: r.state,
      state_str: r.state_str,
      advice: r.advice,
      raw: r.raw,
      updated_at: r.updated_at.toISOString(),
    }));

    return { records, total };
  } catch (err) {
    console.error("Error in getAlarmLogs:", err);
    return { records: [], total: 0 };
  }
}

export async function getBmsTelemetry(
  stationId: string,
  inverterSn?: string
): Promise<BmsTelemetry | null> {
  try {
    let query = `SELECT * FROM solis_bms_telemetry WHERE station_id = $1`;
    const params: any[] = [stationId];

    if (inverterSn) {
      params.push(inverterSn);
      query += ` AND inverter_sn = $2`;
    }

    query += ` ORDER BY recorded_at DESC LIMIT 1`;

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    const r = res.rows[0];

    return {
      id: Number(r.id),
      station_id: r.station_id,
      inverter_sn: r.inverter_sn,
      battery_sn: r.battery_sn || "N/A",
      recorded_at: r.recorded_at.toISOString(),
      soc_percent: Number(r.soc_percent) || 0,
      soh_percent: Number(r.soh_percent) || 0,
      bms_state: Number(r.bms_state) || 0,
      bms_alarm: Number(r.bms_alarm) || 0,
      alarm_hex: r.alarm_hex || "0x0000",
      failure_info_01: r.failure_info_01 || "0",
      fail01_hex: r.fail01_hex || "0x0000",
      failure_info_02: r.failure_info_02 || "0",
      fail02_hex: r.fail02_hex || "0x0000",
      decoded_summary: r.decoded_summary || "Normal",
      decoded_faults: r.decoded_faults || [],
      loop_cycles: Number(r.loop_cycles) || 0,
      battery_voltage: Number(r.battery_voltage) || 0,
      battery_current: Number(r.battery_current) || 0,
      bms_power_kw: Number(r.bms_power_kw) || 0,
      charging_voltage_target: Number(r.charging_voltage_target) || 0,
      charge_current_limit: Number(r.charge_current_limit) || 0,
      discharge_current_limit: Number(r.discharge_current_limit) || 0,
      discharge_cutoff_voltage: Number(r.discharge_cutoff_voltage) || 0,
      min_cell_voltage: Number(r.min_cell_voltage) || 0,
      max_cell_voltage: Number(r.max_cell_voltage) || 0,
      cell_voltage_delta_mv: Number(r.cell_voltage_delta_mv) || 0,
      min_cell_location: r.min_cell_location || "N/A",
      max_cell_location: r.max_cell_location || "N/A",
      avg_temp_c: Number(r.avg_temp_c) || 0,
      min_temp_c: Number(r.min_temp_c) || 0,
      max_temp_c: Number(r.max_temp_c) || 0,
      min_temp_location: r.min_temp_location || "N/A",
      max_temp_location: r.max_temp_location || "N/A",
      module_count: Number(r.module_count) || 0,
      string_count: Number(r.string_count) || 0,
      capacity_ah: Number(r.capacity_ah) || 0,
      rated_kwh: Number(r.rated_kwh) || 0,
      battery_type: r.battery_type || "Lithium-Ion HV",
      discharge_cutoff_soc: Number(r.discharge_cutoff_soc) || 0,
      charge_reserve_soc: Number(r.charge_reserve_soc) || 0,
      uvp_protection_v: Number(r.uvp_protection_v) || 0,
      ovp_protection_v: Number(r.ovp_protection_v) || 0,
      fcv_float_v: Number(r.fcv_float_v) || 0,
      acv_absorption_v: Number(r.acv_absorption_v) || 0,
      raw: r.raw || {},
    };
  } catch (err) {
    console.error("Error in getBmsTelemetry:", err);
    return null;
  }
}

export async function getInverterTelemetries(
  stationId: string
): Promise<InverterTelemetry[]> {
  try {
    // Get latest telemetry records per inverter for this plant
    const res = await pool.query(
      `SELECT DISTINCT ON (inverter_sn) 
              inverter_sn, inverter_model, inverter_temp_c, inverter_dc_bus_voltage,
              inverter_pac_output_kw, inverter_state, inverter_alarm_state,
              pv1_voltage, pv1_current, pv1_power_w,
              pv2_voltage, pv2_current, pv2_power_w,
              pv3_voltage, pv3_current, pv3_power_w,
              pv4_voltage, pv4_current, pv4_power_w,
              phase_a_voltage, phase_a_current, phase_a_power_kw,
              phase_b_voltage, phase_b_current, phase_b_power_kw,
              phase_c_voltage, phase_c_current, phase_c_power_kw,
              grid_frequency_hz, grid_power_factor, grid_reactive_power_kvar, grid_apparent_power_kva,
              solar_power_kw, grid_power_kw, load_power_kw, battery_power_kw, battery_soc,
              data_timestamp, recorded_at
       FROM solis_telemetry
       WHERE station_id = $1 AND inverter_sn IS NOT NULL
       ORDER BY inverter_sn, recorded_at DESC`,
      [stationId]
    );

    return res.rows.map((r) => ({
      inverter_sn: r.inverter_sn,
      inverter_model: r.inverter_model || "S6-EH3P50K-H",
      inverter_temp_c: Number(r.inverter_temp_c) || 0,
      inverter_dc_bus_voltage: Number(r.inverter_dc_bus_voltage) || 0,
      inverter_pac_output_kw: Number(r.inverter_pac_output_kw) || 0,
      inverter_state: r.inverter_state || "Normal",
      inverter_alarm_state: r.inverter_alarm_state || "0",
      pv1_voltage: Number(r.pv1_voltage) || 0,
      pv1_current: Number(r.pv1_current) || 0,
      pv1_power_w: Number(r.pv1_power_w) || 0,
      pv2_voltage: Number(r.pv2_voltage) || 0,
      pv2_current: Number(r.pv2_current) || 0,
      pv2_power_w: Number(r.pv2_power_w) || 0,
      pv3_voltage: Number(r.pv3_voltage) || 0,
      pv3_current: Number(r.pv3_current) || 0,
      pv3_power_w: Number(r.pv3_power_w) || 0,
      pv4_voltage: Number(r.pv4_voltage) || 0,
      pv4_current: Number(r.pv4_current) || 0,
      pv4_power_w: Number(r.pv4_power_w) || 0,
      phase_a_voltage: Number(r.phase_a_voltage) || 0,
      phase_a_current: Number(r.phase_a_current) || 0,
      phase_a_power_kw: Number(r.phase_a_power_kw) || 0,
      phase_b_voltage: Number(r.phase_b_voltage) || 0,
      phase_b_current: Number(r.phase_b_current) || 0,
      phase_b_power_kw: Number(r.phase_b_power_kw) || 0,
      phase_c_voltage: Number(r.phase_c_voltage) || 0,
      phase_c_current: Number(r.phase_c_current) || 0,
      phase_c_power_kw: Number(r.phase_c_power_kw) || 0,
      grid_frequency_hz: Number(r.grid_frequency_hz) || 50.0,
      grid_power_factor: Number(r.grid_power_factor) || 1.0,
      grid_reactive_power_kvar: Number(r.grid_reactive_power_kvar) || 0,
      grid_apparent_power_kva: Number(r.grid_apparent_power_kva) || 0,
      solar_power_kw: Number(r.solar_power_kw) || 0,
      grid_power_kw: Number(r.grid_power_kw) || 0,
      load_power_kw: Number(r.load_power_kw) || 0,
      battery_power_kw: Number(r.battery_power_kw) || 0,
      battery_soc: Number(r.battery_soc) || 0,
      data_timestamp: r.data_timestamp || "",
      recorded_at: r.recorded_at.toISOString(),
    }));
  } catch (err) {
    console.error("Error in getInverterTelemetries:", err);
    return [];
  }
}
