export interface PlantInfo {
  id: string;
  name: string;
  location: string;
  capacityKwp: number;
  inverterCount: number;
  batteryInstalled: boolean;
  dataloggerSn?: string;
  hasDataInDb: boolean;
  liveSolarKw?: number;
  liveBatterySoc?: number;
  liveBatteryPowerKw?: number;
  liveBatteryState?: string;
  liveGridKw?: number;
  liveLoadKw?: number;
  inverterState?: string | number;
  isStale?: boolean;
  latestDataTime?: string;
  latestDataDate?: string;
}

export interface TelemetryLatest {
  station_id: string;
  updated_at: string;
  station_name: string;
  location: string;
  installed_capacity_kw: number;
  inverter_sn: string;
  inverter_model: string;
  datalogger_sn: string;
  data_timestamp: string;
  battery_soc: number;
  battery_soh: number;
  battery_power_kw: number;
  battery_direction: string;
  solar_power_kw: number;
  grid_power_kw: number;
  grid_direction: string;
  load_power_kw: number;
  summary: Record<string, any>;
  raw_data: Record<string, any>;
  is_stale?: boolean;
}

export interface PowerCurvePoint {
  id: number;
  station_id: string;
  curve_date: string;
  timestamp_epoch: number;
  time_str: string;
  battery_power_kw: number;
  battery_state: string;
  battery_soc: number;
  solar_power_kw: number;
  grid_power_kw: number;
  load_power_kw: number;
}

export interface DailyEnergyRecord {
  id: number;
  station_id: string;
  energy_date: string;
  solar_pv_kwh: number;
  house_load_kwh: number;
  battery_charge_kwh: number;
  battery_discharge_kwh: number;
  grid_purchased_kwh: number;
  grid_sold_kwh: number;
  backup_load_kwh: number;
  self_consumption_kwh: number;
  peak_sun_hours: number;
  currency: string;
}

export interface AlarmRecord {
  id: number;
  station_id: string;
  station_name: string;
  alarm_pk: string;
  device_sn: string;
  alarm_code: string;
  alarm_msg: string;
  alarm_level: string;
  protection_category: string;
  protection_desc: string;
  alarm_begin_time: string;
  alarm_begin_time_str: string;
  alarm_end_time: string | null;
  alarm_end_time_str: string | null;
  alarm_duration_str: string;
  state: string;
  state_str: string;
  advice: string;
  raw: any;
  updated_at: string;
}

export interface BmsTelemetry {
  id: number;
  station_id: string;
  inverter_sn: string;
  battery_sn: string;
  recorded_at: string;
  soc_percent: number;
  soh_percent: number;
  bms_state: number;
  bms_alarm: number;
  alarm_hex: string;
  failure_info_01: string;
  fail01_hex: string;
  failure_info_02: string;
  fail02_hex: string;
  decoded_summary: string;
  decoded_faults: any;
  loop_cycles: number;
  battery_voltage: number;
  battery_current: number;
  bms_power_kw: number;
  charging_voltage_target: number;
  charge_current_limit: number;
  discharge_current_limit: number;
  discharge_cutoff_voltage: number;
  min_cell_voltage: number;
  max_cell_voltage: number;
  cell_voltage_delta_mv: number;
  min_cell_location: string;
  max_cell_location: string;
  avg_temp_c: number;
  min_temp_c: number;
  max_temp_c: number;
  min_temp_location: string;
  max_temp_location: string;
  module_count: number;
  string_count: number;
  capacity_ah: number;
  rated_kwh: number;
  battery_type: string;
  discharge_cutoff_soc: number;
  charge_reserve_soc: number;
  uvp_protection_v: number;
  ovp_protection_v: number;
  fcv_float_v: number;
  acv_absorption_v: number;
  raw: any;
}

export interface InverterTelemetry {
  inverter_sn: string;
  inverter_model: string;
  inverter_temp_c: number;
  inverter_dc_bus_voltage: number;
  inverter_pac_output_kw: number;
  inverter_state: string;
  inverter_alarm_state: string;
  pv1_voltage: number;
  pv1_current: number;
  pv1_power_w: number;
  pv2_voltage: number;
  pv2_current: number;
  pv2_power_w: number;
  pv3_voltage: number;
  pv3_current: number;
  pv3_power_w: number;
  pv4_voltage: number;
  pv4_current: number;
  pv4_power_w: number;
  phase_a_voltage: number;
  phase_a_current: number;
  phase_a_power_kw: number;
  phase_b_voltage: number;
  phase_b_current: number;
  phase_b_power_kw: number;
  phase_c_voltage: number;
  phase_c_current: number;
  phase_c_power_kw: number;
  grid_frequency_hz: number;
  grid_power_factor: number;
  grid_reactive_power_kvar: number;
  grid_apparent_power_kva: number;
  solar_power_kw: number;
  grid_power_kw: number;
  load_power_kw: number;
  battery_power_kw: number;
  battery_soc: number;
  data_timestamp: string;
  recorded_at: string;
}
