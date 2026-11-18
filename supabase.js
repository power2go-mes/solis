/**
 * Supabase PostgreSQL Integration for SolisCloud Scraper
 * Handles electrical telemetry, live state, historical alarm logs,
 * deep BMS/BMU registers & 5-minute historical battery power curve.
 */

const { Client } = require("pg");
const { decodeBmsRegisters, classifyProtectionEvent } = require("./bms_decoder");

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS solis_telemetry (
  id BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  station_id TEXT NOT NULL,
  station_name TEXT,
  location TEXT,
  installed_capacity_kw NUMERIC,
  inverter_sn TEXT,
  inverter_model TEXT,
  datalogger_sn TEXT,
  data_timestamp TEXT,

  -- Battery & BMS
  battery_soc NUMERIC,
  battery_soh NUMERIC,
  battery_power_kw NUMERIC,
  battery_direction TEXT,
  battery_voltage NUMERIC,
  battery_current NUMERIC,
  bms_power_kw NUMERIC,
  bms_temp NUMERIC,
  bms_min_temp NUMERIC,
  bms_max_temp NUMERIC,
  bms_min_cell_voltage NUMERIC,
  bms_max_cell_voltage NUMERIC,
  bms_capacity_ah NUMERIC,
  bms_cycles INTEGER,
  battery_type TEXT,
  battery_sn TEXT,
  battery_charge_today_kwh NUMERIC,
  battery_discharge_today_kwh NUMERIC,
  battery_charge_month_kwh NUMERIC,
  battery_discharge_month_kwh NUMERIC,
  battery_charge_total_mwh NUMERIC,
  battery_discharge_total_mwh NUMERIC,

  -- Solar PV
  solar_power_kw NUMERIC,
  pv1_voltage NUMERIC,
  pv1_current NUMERIC,
  pv1_power_w NUMERIC,
  pv2_voltage NUMERIC,
  pv2_current NUMERIC,
  pv2_power_w NUMERIC,
  pv3_voltage NUMERIC,
  pv3_current NUMERIC,
  pv3_power_w NUMERIC,
  pv4_voltage NUMERIC,
  pv4_current NUMERIC,
  pv4_power_w NUMERIC,
  solar_yield_today_kwh NUMERIC,
  solar_yield_month_mwh NUMERIC,
  solar_yield_total_mwh NUMERIC,

  -- Grid & 3-Phase
  grid_power_kw NUMERIC,
  grid_direction TEXT,
  grid_frequency_hz NUMERIC,
  grid_power_factor NUMERIC,
  grid_reactive_power_kvar NUMERIC,
  grid_apparent_power_kva NUMERIC,
  phase_a_voltage NUMERIC,
  phase_a_current NUMERIC,
  phase_a_power_kw NUMERIC,
  phase_b_voltage NUMERIC,
  phase_b_current NUMERIC,
  phase_b_power_kw NUMERIC,
  phase_c_voltage NUMERIC,
  phase_c_current NUMERIC,
  phase_c_power_kw NUMERIC,
  grid_purchased_today_kwh NUMERIC,
  grid_sold_today_kwh NUMERIC,
  grid_purchased_total_kwh NUMERIC,
  grid_sold_total_mwh NUMERIC,

  -- Load
  load_power_kw NUMERIC,
  bypass_load_power_kw NUMERIC,
  load_consumption_today_kwh NUMERIC,
  load_consumption_month_mwh NUMERIC,
  load_consumption_total_mwh NUMERIC,

  -- Inverter
  inverter_temp_c NUMERIC,
  inverter_dc_bus_voltage NUMERIC,
  inverter_pac_output_kw NUMERIC,
  inverter_state TEXT,
  inverter_alarm_state TEXT,

  -- Environmental
  avoided_co2_tonnes NUMERIC,
  trees_planted NUMERIC,
  coal_saved_tce NUMERIC,
  currency TEXT,

  -- Complete JSON Payloads
  summary JSONB NOT NULL,
  raw_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_solis_telemetry_station ON solis_telemetry(station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_solis_telemetry_time ON solis_telemetry(recorded_at DESC);

CREATE TABLE IF NOT EXISTS solis_telemetry_latest (
  station_id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  station_name TEXT,
  location TEXT,
  installed_capacity_kw NUMERIC,
  inverter_sn TEXT,
  inverter_model TEXT,
  datalogger_sn TEXT,
  data_timestamp TEXT,
  battery_soc NUMERIC,
  battery_soh NUMERIC,
  battery_power_kw NUMERIC,
  battery_direction TEXT,
  solar_power_kw NUMERIC,
  grid_power_kw NUMERIC,
  grid_direction TEXT,
  load_power_kw NUMERIC,
  summary JSONB NOT NULL,
  raw_data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS solis_alarm_logs (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  station_name TEXT,
  alarm_pk TEXT UNIQUE,
  device_sn TEXT,
  alarm_code TEXT,
  alarm_msg TEXT,
  alarm_level TEXT,
  protection_category TEXT,
  protection_desc TEXT,
  alarm_begin_time TIMESTAMPTZ,
  alarm_begin_time_str TEXT,
  alarm_end_time TIMESTAMPTZ,
  alarm_end_time_str TEXT,
  alarm_duration_str TEXT,
  state TEXT,
  state_str TEXT,
  advice TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solis_alarm_logs_station ON solis_alarm_logs(station_id, alarm_begin_time DESC);

CREATE TABLE IF NOT EXISTS solis_bms_telemetry (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  inverter_sn TEXT NOT NULL,
  battery_sn TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- BMS Status & Health
  soc_percent NUMERIC,
  soh_percent NUMERIC,
  bms_state INTEGER,
  bms_alarm INTEGER,
  alarm_hex TEXT,
  failure_info_01 TEXT,
  fail01_hex TEXT,
  failure_info_02 TEXT,
  fail02_hex TEXT,
  decoded_summary TEXT,
  decoded_faults JSONB,
  loop_cycles INTEGER,

  -- Power, Voltages & Currents
  battery_voltage NUMERIC,
  battery_current NUMERIC,
  bms_power_kw NUMERIC,
  charging_voltage_target NUMERIC,
  charge_current_limit NUMERIC,
  discharge_current_limit NUMERIC,
  discharge_cutoff_voltage NUMERIC,

  -- Cell Level & Balance
  min_cell_voltage NUMERIC,
  max_cell_voltage NUMERIC,
  cell_voltage_delta_mv NUMERIC,
  min_cell_location TEXT,
  max_cell_location TEXT,

  -- Temperatures
  avg_temp_c NUMERIC,
  min_temp_c NUMERIC,
  max_temp_c NUMERIC,
  min_temp_location TEXT,
  max_temp_location TEXT,

  -- Architecture
  module_count INTEGER,
  string_count INTEGER,
  capacity_ah NUMERIC,
  rated_kwh NUMERIC,
  battery_type TEXT,

  -- Protection & Thresholds
  discharge_cutoff_soc NUMERIC,
  charge_reserve_soc NUMERIC,
  uvp_protection_v NUMERIC,
  ovp_protection_v NUMERIC,
  fcv_float_v NUMERIC,
  acv_absorption_v NUMERIC,

  raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_solis_bms_station ON solis_bms_telemetry(station_id, recorded_at DESC);

-- Ensure permissions for Supabase Studio (Table Editor), API, and client roles
-- 5-Minute Historical Battery Power & Generation Curve Table
CREATE TABLE IF NOT EXISTS solis_battery_power_curve (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  curve_date DATE NOT NULL,
  timestamp_epoch BIGINT NOT NULL,
  time_str TEXT NOT NULL,
  battery_power_w NUMERIC,
  battery_power_kw NUMERIC,
  battery_state TEXT,
  battery_soc NUMERIC,
  solar_power_w NUMERIC,
  solar_power_kw NUMERIC,
  grid_power_w NUMERIC,
  grid_power_kw NUMERIC,
  load_power_w NUMERIC,
  load_power_kw NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_id, curve_date, time_str)
);

CREATE INDEX IF NOT EXISTS idx_solis_curve_station_date ON solis_battery_power_curve(station_id, curve_date, timestamp_epoch);

-- Day-by-Day Monthly Energy Accounting Table
CREATE TABLE IF NOT EXISTS solis_daily_energy (
  id BIGSERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  energy_date DATE NOT NULL,
  solar_pv_kwh NUMERIC,
  house_load_kwh NUMERIC,
  battery_charge_kwh NUMERIC,
  battery_discharge_kwh NUMERIC,
  grid_purchased_kwh NUMERIC,
  grid_sold_kwh NUMERIC,
  backup_load_kwh NUMERIC,
  self_consumption_kwh NUMERIC,
  peak_sun_hours NUMERIC,
  currency TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_id, energy_date)
);

CREATE INDEX IF NOT EXISTS idx_solis_daily_station_date ON solis_daily_energy(station_id, energy_date DESC);

-- Grant privileges for Supabase Studio UI, API & connection roles
GRANT ALL ON TABLE public.solis_telemetry TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.solis_telemetry_latest TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.solis_alarm_logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.solis_bms_telemetry TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.solis_battery_power_curve TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.solis_daily_energy TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Reload PostgREST schema cache so tables immediately appear in Supabase Studio & API
NOTIFY pgrst, 'reload schema';
`;

async function getClient(connectionString) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  return client;
}

async function ensureTables(client) {
  await client.query(SCHEMA_SQL);

  // Dynamic column migrations for existing tables
  await client.query(`
    ALTER TABLE IF EXISTS solis_alarm_logs ADD COLUMN IF NOT EXISTS protection_category TEXT;
    ALTER TABLE IF EXISTS solis_alarm_logs ADD COLUMN IF NOT EXISTS protection_desc TEXT;

    ALTER TABLE IF EXISTS solis_bms_telemetry ADD COLUMN IF NOT EXISTS alarm_hex TEXT;
    ALTER TABLE IF EXISTS solis_bms_telemetry ADD COLUMN IF NOT EXISTS fail01_hex TEXT;
    ALTER TABLE IF EXISTS solis_bms_telemetry ADD COLUMN IF NOT EXISTS fail02_hex TEXT;
    ALTER TABLE IF EXISTS solis_bms_telemetry ADD COLUMN IF NOT EXISTS decoded_summary TEXT;
    ALTER TABLE IF EXISTS solis_bms_telemetry ADD COLUMN IF NOT EXISTS decoded_faults JSONB;
  `);
}

function numOrNull(val) {
  if (val === undefined || val === null || val === "" || isNaN(Number(val))) {
    return null;
  }
  return Number(val);
}

async function saveTelemetryToSupabase(connectionString, data) {
  if (!connectionString) {
    throw new Error("No Supabase connection string provided");
  }

  const client = await getClient(connectionString);
  try {
    // 1. Ensure table schemas & grants exist
    await ensureTables(client);

    const s = data.summary;
    const meta = {
      stationId: data.stationId,
      stationName: data.raw.stationDetail?.stationName || data.raw.detailMix?.stationName || "Unknown",
      location: [data.raw.stationDetail?.cityStr || data.raw.detailMix?.cityStr, data.raw.stationDetail?.countryStr || data.raw.detailMix?.countryStr].filter(Boolean).join(", "),
      installedCapacityKw: numOrNull(data.raw.stationDetail?.capacity || data.raw.detailMix?.capacity),
      inverterSn: data.inverterSn,
      inverterModel: String(s.inverter.model || ""),
      dataloggerSn: String(s.inverter.collectorSn || ""),
      dataTimestamp: String(data.raw.detailMix?.dataTimestampStr || data.raw.inverterDetail?.timeStr || ""),
    };

    const pv = s.solar.strings || [];
    const pv1 = pv[0] || {};
    const pv2 = pv[1] || {};
    const pv3 = pv[2] || {};
    const pv4 = pv[3] || {};

    const ph = s.grid.phases || {};
    const phA = ph.A || {};
    const phB = ph.B || {};
    const phC = ph.C || {};

    const columns = [
      "station_id", "station_name", "location", "installed_capacity_kw",
      "inverter_sn", "inverter_model", "datalogger_sn", "data_timestamp",
      "battery_soc", "battery_soh", "battery_power_kw", "battery_direction",
      "battery_voltage", "battery_current", "bms_power_kw", "bms_temp",
      "bms_min_temp", "bms_max_temp", "bms_min_cell_voltage", "bms_max_cell_voltage",
      "bms_capacity_ah", "bms_cycles", "battery_type", "battery_sn",
      "battery_charge_today_kwh", "battery_discharge_today_kwh",
      "battery_charge_month_kwh", "battery_discharge_month_kwh",
      "battery_charge_total_mwh", "battery_discharge_total_mwh",
      "solar_power_kw", "pv1_voltage", "pv1_current", "pv1_power_w",
      "pv2_voltage", "pv2_current", "pv2_power_w",
      "pv3_voltage", "pv3_current", "pv3_power_w",
      "pv4_voltage", "pv4_current", "pv4_power_w",
      "solar_yield_today_kwh", "solar_yield_month_mwh", "solar_yield_total_mwh",
      "grid_power_kw", "grid_direction", "grid_frequency_hz", "grid_power_factor",
      "grid_reactive_power_kvar", "grid_apparent_power_kva",
      "phase_a_voltage", "phase_a_current", "phase_a_power_kw",
      "phase_b_voltage", "phase_b_current", "phase_b_power_kw",
      "phase_c_voltage", "phase_c_current", "phase_c_power_kw",
      "grid_purchased_today_kwh", "grid_sold_today_kwh",
      "grid_purchased_total_kwh", "grid_sold_total_mwh",
      "load_power_kw", "bypass_load_power_kw",
      "load_consumption_today_kwh", "load_consumption_month_mwh", "load_consumption_total_mwh",
      "inverter_temp_c", "inverter_dc_bus_voltage", "inverter_pac_output_kw",
      "inverter_state", "inverter_alarm_state",
      "avoided_co2_tonnes", "trees_planted", "coal_saved_tce", "currency",
      "summary", "raw_data"
    ];

    const values = [
      meta.stationId,
      meta.stationName,
      meta.location,
      meta.installedCapacityKw,
      meta.inverterSn,
      meta.inverterModel,
      meta.dataloggerSn,
      meta.dataTimestamp,

      numOrNull(s.battery.socPercent),
      numOrNull(s.battery.sohPercent),
      numOrNull(s.battery.powerKw),
      s.battery.direction || null,
      numOrNull(s.battery.voltageV),
      numOrNull(s.battery.currentA),
      numOrNull(s.battery.bmsPowerKw || (data.raw.inverterDetail?.batteryPowerBms ? data.raw.inverterDetail.batteryPowerBms / 1000 : null)),
      numOrNull(s.battery.bmsTempC),
      numOrNull(s.battery.bmsMinTempC || data.raw.inverterDetail?.batteryList?.[0]?.bmsMinTemp),
      numOrNull(s.battery.bmsMaxTempC || data.raw.inverterDetail?.batteryList?.[0]?.bmsMaxTemp),
      numOrNull(s.battery.bmsMinCellVoltageV),
      numOrNull(s.battery.bmsMaxCellVoltageV),
      numOrNull(s.battery.capacityAh),
      s.battery.cycles !== undefined ? Number(s.battery.cycles) : null,
      s.battery.batteryType || null,
      s.battery.batterySn || null,
      numOrNull(s.battery.chargeEnergyTodayKwh),
      numOrNull(s.battery.dischargeEnergyTodayKwh),
      numOrNull(data.raw.detailMix?.batteryChargeMonthEnergy),
      numOrNull(data.raw.detailMix?.batteryDischargeMonthEnergy),
      numOrNull(s.battery.chargeEnergyTotalMwh),
      numOrNull(s.battery.dischargeEnergyTotalMwh),

      numOrNull(s.solar.activePowerKw),
      numOrNull(pv1.voltageV),
      numOrNull(pv1.currentA),
      numOrNull(pv1.powerW),
      numOrNull(pv2.voltageV),
      numOrNull(pv2.currentA),
      numOrNull(pv2.powerW),
      numOrNull(pv3.voltageV),
      numOrNull(pv3.currentA),
      numOrNull(pv3.powerW),
      numOrNull(pv4.voltageV),
      numOrNull(pv4.currentA),
      numOrNull(pv4.powerW),
      numOrNull(s.solar.yieldTodayKwh),
      numOrNull(s.solar.yieldMonthMwh),
      numOrNull(s.solar.yieldTotalMwh),

      numOrNull(s.grid.activePowerKw),
      s.grid.direction || null,
      numOrNull(s.grid.frequencyHz),
      numOrNull(s.grid.powerFactor),
      numOrNull(s.grid.reactivePowerKvar),
      numOrNull(s.grid.apparentPowerKva),
      numOrNull(phA.voltageV),
      numOrNull(phA.currentA),
      numOrNull(phA.powerKw),
      numOrNull(phB.voltageV),
      numOrNull(phB.currentA),
      numOrNull(phB.powerKw),
      numOrNull(phC.voltageV),
      numOrNull(phC.currentA),
      numOrNull(phC.powerKw),
      numOrNull(s.grid.purchasedTodayKwh),
      numOrNull(s.grid.soldTodayKwh),
      numOrNull(s.grid.purchasedTotalKwh),
      numOrNull(s.grid.soldTotalMwh),

      numOrNull(s.load.totalPowerKw),
      numOrNull(s.load.bypassPowerKw),
      numOrNull(s.load.consumptionTodayKwh),
      numOrNull(s.load.consumptionMonthMwh),
      numOrNull(s.load.consumptionTotalMwh),

      numOrNull(s.inverter.temperatureC),
      numOrNull(s.inverter.dcBusVoltageV),
      numOrNull(s.inverter.pacOutputKw),
      String(s.inverter.state ?? ""),
      String(s.inverter.alarmState ?? ""),

      numOrNull(data.raw.distributorDetail?.powerStationAvoidedCo2 || data.raw.detailMix?.avoidedCo2),
      numOrNull(data.raw.distributorDetail?.powerStationNumTree || data.raw.detailMix?.plantTree),
      numOrNull(data.raw.distributorDetail?.powerStationAvoidedTce),
      String(data.raw.stationDetail?.money || data.raw.detailMix?.money || "PKR"),

      JSON.stringify(s),
      JSON.stringify(data.raw),
    ];

    if (columns.length !== values.length) {
      throw new Error(`Column count mismatch: ${columns.length} columns vs ${values.length} values`);
    }

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const insertSql = `
      INSERT INTO solis_telemetry (${columns.join(", ")})
      VALUES (${placeholders})
      RETURNING id, recorded_at;
    `;

    const insertRes = await client.query(insertSql, values);
    const rowId = insertRes.rows[0].id;
    const recordedAt = insertRes.rows[0].recorded_at;

    // 2. Upsert into latest state table
    const upsertSql = `
      INSERT INTO solis_telemetry_latest (
        station_id, updated_at, station_name, location, installed_capacity_kw,
        inverter_sn, inverter_model, datalogger_sn, data_timestamp,
        battery_soc, battery_soh, battery_power_kw, battery_direction,
        solar_power_kw, grid_power_kw, grid_direction, load_power_kw,
        summary, raw_data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      ) ON CONFLICT (station_id) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        station_name = EXCLUDED.station_name,
        location = EXCLUDED.location,
        installed_capacity_kw = EXCLUDED.installed_capacity_kw,
        inverter_sn = EXCLUDED.inverter_sn,
        inverter_model = EXCLUDED.inverter_model,
        datalogger_sn = EXCLUDED.datalogger_sn,
        data_timestamp = EXCLUDED.data_timestamp,
        battery_soc = EXCLUDED.battery_soc,
        battery_soh = EXCLUDED.battery_soh,
        battery_power_kw = EXCLUDED.battery_power_kw,
        battery_direction = EXCLUDED.battery_direction,
        solar_power_kw = EXCLUDED.solar_power_kw,
        grid_power_kw = EXCLUDED.grid_power_kw,
        grid_direction = EXCLUDED.grid_direction,
        load_power_kw = EXCLUDED.load_power_kw,
        summary = EXCLUDED.summary,
        raw_data = EXCLUDED.raw_data;
    `;

    const upsertValues = [
      meta.stationId,
      recordedAt,
      meta.stationName,
      meta.location,
      meta.installedCapacityKw,
      meta.inverterSn,
      meta.inverterModel,
      meta.dataloggerSn,
      meta.dataTimestamp,
      numOrNull(s.battery.socPercent),
      numOrNull(s.battery.sohPercent),
      numOrNull(s.battery.powerKw),
      s.battery.direction || null,
      numOrNull(s.solar.activePowerKw),
      numOrNull(s.grid.activePowerKw),
      s.grid.direction || null,
      numOrNull(s.load.totalPowerKw),
      JSON.stringify(s),
      JSON.stringify(data.raw),
    ];

    await client.query(upsertSql, upsertValues);

    // 3. Save Alarms and BMS Fault Logs with Protection Classification
    let savedAlarmsCount = 0;
    const alarmRecords = data.raw.alarmList?.records || data.raw.alarmList || [];
    if (Array.isArray(alarmRecords) && alarmRecords.length > 0) {
      const alarmUpsertSql = `
        INSERT INTO solis_alarm_logs (
          station_id, station_name, alarm_pk, device_sn, alarm_code,
          alarm_msg, alarm_level, protection_category, protection_desc,
          alarm_begin_time, alarm_begin_time_str,
          alarm_end_time, alarm_end_time_str, alarm_duration_str,
          state, state_str, advice, raw, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW()
        ) ON CONFLICT (alarm_pk) DO UPDATE SET
          station_name = EXCLUDED.station_name,
          protection_category = EXCLUDED.protection_category,
          protection_desc = EXCLUDED.protection_desc,
          alarm_end_time = EXCLUDED.alarm_end_time,
          alarm_end_time_str = EXCLUDED.alarm_end_time_str,
          alarm_duration_str = EXCLUDED.alarm_duration_str,
          state = EXCLUDED.state,
          state_str = EXCLUDED.state_str,
          advice = EXCLUDED.advice,
          raw = EXCLUDED.raw,
          updated_at = NOW();
      `;

      for (const al of alarmRecords) {
        const pk = al.pk || `${al.stationId}_${al.alarmDeviceSn}_${al.alarmCode}_${al.alarmBeginTime}`;
        const stateStr = al.state === "2" ? "Recovered / Resolved" : al.state === "1" ? "Active" : String(al.state || "Unknown");
        const beginDate = al.alarmBeginTime ? new Date(Number(al.alarmBeginTime)) : null;
        const endDate = al.alarmEndTime ? new Date(Number(al.alarmEndTime)) : null;
        const protClass = classifyProtectionEvent(al.alarmCode, al.alarmMsg);

        await client.query(alarmUpsertSql, [
          String(al.stationId || meta.stationId),
          String(al.stationName || meta.stationName),
          pk,
          String(al.alarmDeviceSn || meta.inverterSn),
          String(al.alarmCode || ""),
          String(al.alarmMsg || ""),
          String(al.alarmLevel || ""),
          protClass.category,
          protClass.desc,
          beginDate,
          String(al.alarmBeginTimeStr || ""),
          endDate,
          String(al.alarmEndTimeStr || ""),
          String(al.alarmLongStr || ""),
          String(al.state || ""),
          stateStr,
          String(al.advice || ""),
          JSON.stringify(al),
        ]);
        savedAlarmsCount++;
      }
    }

    // 4. Save Deep BMS & BMU Telemetry Log with Bitmask Decoding
    const bmsObj = (data.raw.inverterDetail?.batteryList && data.raw.inverterDetail.batteryList[0]) || {};
    const priBat = (data.raw.batteryList && data.raw.batteryList[0]) || {};
    let savedBmsId = null;

    if (bmsObj.batteryVoltage !== undefined || priBat.voltage !== undefined) {
      const decodedRegs = decodeBmsRegisters(
        bmsObj.batteryAlarm,
        bmsObj.batteryFailureInformation01,
        bmsObj.batteryFailureInformation02
      );

      const minU = numOrNull(bmsObj.bmsMinU);
      const maxU = numOrNull(bmsObj.bmsMaxU);
      const deltaMv = (minU !== null && maxU !== null) ? Math.round((maxU - minU) * 1000) : null;

      const bmsColumns = [
        "station_id", "inverter_sn", "battery_sn", "recorded_at",
        "soc_percent", "soh_percent", "bms_state", "bms_alarm", "alarm_hex",
        "failure_info_01", "fail01_hex", "failure_info_02", "fail02_hex",
        "decoded_summary", "decoded_faults", "loop_cycles",
        "battery_voltage", "battery_current", "bms_power_kw",
        "charging_voltage_target", "charge_current_limit",
        "discharge_current_limit", "discharge_cutoff_voltage",
        "min_cell_voltage", "max_cell_voltage", "cell_voltage_delta_mv",
        "min_cell_location", "max_cell_location",
        "avg_temp_c", "min_temp_c", "max_temp_c",
        "min_temp_location", "max_temp_location",
        "module_count", "string_count", "capacity_ah", "rated_kwh", "battery_type",
        "discharge_cutoff_soc", "charge_reserve_soc",
        "uvp_protection_v", "ovp_protection_v", "fcv_float_v", "acv_absorption_v",
        "raw"
      ];

      const bmsValues = [
        meta.stationId,
        meta.inverterSn,
        String(bmsObj.batterySn || priBat.sn || meta.inverterSn + "BAT01"),
        recordedAt,

        numOrNull(priBat.soc ?? bmsObj.batteryCapacitySoc ?? s.battery.socPercent),
        numOrNull(bmsObj.batteryHealthSoh),
        bmsObj.bmsState !== undefined ? Number(bmsObj.bmsState) : null,
        bmsObj.batteryAlarm !== undefined ? Number(bmsObj.batteryAlarm) : null,
        decodedRegs.alarm.hex,
        String(bmsObj.batteryFailureInformation01 ?? "0"),
        decodedRegs.fail01.hex,
        String(bmsObj.batteryFailureInformation02 ?? "0"),
        decodedRegs.fail02.hex,
        decodedRegs.summaryText,
        JSON.stringify(decodedRegs),
        bmsObj.bmsLoopNum !== undefined ? Number(bmsObj.bmsLoopNum) : null,

        numOrNull(priBat.voltage ?? bmsObj.batteryVoltage),
        numOrNull(priBat.current ?? bmsObj.bstteryCurrent),
        numOrNull(bmsObj.batteryPowerBms !== undefined ? bmsObj.batteryPowerBms / 1000 : null),
        numOrNull(bmsObj.batteryChargingVoltage),
        numOrNull(bmsObj.batteryChargingCurrent),
        numOrNull(bmsObj.batteryDischargeLimiting),
        numOrNull(bmsObj.bmsDischargeU),

        minU,
        maxU,
        deltaMv,
        String(bmsObj.bmsMinuLocStr || ""),
        String(bmsObj.bmsMaxuLocStr || ""),

        numOrNull(bmsObj.bmsTemp),
        numOrNull(bmsObj.bmsMinTemp),
        numOrNull(bmsObj.bmsMaxTemp),
        String(bmsObj.bmsMintempLocStr || ""),
        String(bmsObj.bmsMaxtempLocStr || ""),

        bmsObj.bmsMNum !== undefined ? Number(bmsObj.bmsMNum) : null,
        bmsObj.bmsStrNum !== undefined ? Number(bmsObj.bmsStrNum) : null,
        numOrNull(bmsObj.bmsCapacityTotal),
        numOrNull(priBat.capacity),
        String(bmsObj.batteryTypeName || "PYLON_HV"),

        numOrNull(bmsObj.socDischargeSet),
        numOrNull(bmsObj.socChargingSet),
        numOrNull(bmsObj.batteryUvpSet),
        numOrNull(bmsObj.batteryOvpSet),
        numOrNull(bmsObj.batteryFcvSet),
        numOrNull(bmsObj.batteryAcvSet),

        JSON.stringify(bmsObj),
      ];

      const bmsPlaceholders = bmsColumns.map((_, i) => `$${i + 1}`).join(", ");
      const bmsInsertSql = `
        INSERT INTO solis_bms_telemetry (${bmsColumns.join(", ")})
        VALUES (${bmsPlaceholders})
        RETURNING id;
      `;

      const bmsRes = await client.query(bmsInsertSql, bmsValues);
      savedBmsId = bmsRes.rows[0].id;
    }
    // 5. Save 5-Minute Historical Battery Power Curve
    let savedCurvePointsCount = 0;
    const curve = data.raw.dayCurve || {};
    if (Array.isArray(curve.time) && Array.isArray(curve.batteryPower) && curve.time.length > 0) {
      const curveUpsertSql = `
        INSERT INTO solis_battery_power_curve (
          station_id, curve_date, timestamp_epoch, time_str,
          battery_power_w, battery_power_kw, battery_state,
          battery_soc, solar_power_w, solar_power_kw,
          grid_power_w, grid_power_kw, load_power_w, load_power_kw
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
        ) ON CONFLICT (station_id, curve_date, time_str) DO UPDATE SET
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
          load_power_kw = EXCLUDED.load_power_kw;
      `;

      const curveDate = data.raw.dayCurveDate || new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
      for (let i = 0; i < curve.time.length; i++) {
        const tEpoch = curve.time[i];
        const tStr = curve.timeStr?.[i] || `${i * 5}m`;
        const bPowerW = numOrNull(curve.batteryPower[i]) || 0;
        const bPowerKw = Number((bPowerW / 1000).toFixed(3));
        const bSoc = numOrNull(curve.batteryCapacitySocList?.[i]);
        const sPowerW = numOrNull(curve.pvAndAcCoupledPowerList?.[i]) || 0;
        const sPowerKw = Number((sPowerW / 1000).toFixed(3));
        const gPowerW = numOrNull(curve.psum?.[i]) || 0;
        const gPowerKw = Number((gPowerW / 1000).toFixed(3));
        const lPowerW = numOrNull(curve.bypassLoadPowerList?.[i] || curve.familyLoadPowerList?.[i]) || 0;
        const lPowerKw = Number((lPowerW / 1000).toFixed(3));

        const bState = bPowerW > 100 ? "Charging" : bPowerW < -100 ? "Discharging" : "Stopped / Idle";

        await client.query(curveUpsertSql, [
          meta.stationId,
          curveDate,
          tEpoch,
          tStr,
          bPowerW,
          bPowerKw,
          bState,
          bSoc,
          sPowerW,
          sPowerKw,
          gPowerW,
          gPowerKw,
          lPowerW,
          lPowerKw,
        ]);
        savedCurvePointsCount++;
      }
    }

    return { rowId, recordedAt, savedAlarmsCount, savedBmsId, savedCurvePointsCount };
  } finally {
    await client.end();
  }
}

async function saveDailyEnergyToSupabase(connectionString, stationId, dailyRecords) {
  if (!connectionString) throw new Error("No Supabase connection string provided");
  const client = await getClient(connectionString);
  try {
    await ensureTables(client);
    let count = 0;
    const upsertSql = `
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

    for (const d of dailyRecords) {
      await client.query(upsertSql, [
        stationId,
        d.dateStr,
        numOrNull(d.produceEnergy ?? d.energy ?? d.pvAndAcCoupledEnergy),
        numOrNull(d.consumeEnergy ?? d.homeLoadEnergy),
        numOrNull(d.batteryChargeEnergy),
        numOrNull(d.batteryDischargeEnergy),
        numOrNull(d.gridPurchasedEnergy),
        numOrNull(d.gridSellEnergy),
        numOrNull(d.backUpEnergy),
        numOrNull(d.oneSelf),
        numOrNull(d.fullHour),
        String(d.moneyStr || "PKR"),
        JSON.stringify(d),
      ]);
      count++;
    }
    return count;
  } finally {
    await client.end();
  }
}

module.exports = {
  saveTelemetryToSupabase,
  saveDailyEnergyToSupabase,
};
