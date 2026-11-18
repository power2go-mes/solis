/**
 * BMS & BMU Fault Register Bitmask Decoders & Protection Event Classifier
 * Standards: Pylontech High Voltage (CAN ID 0x359) & Solis Hybrid Storage Specification
 */

// Protection Register 01 (Critical Protections - Byte 0 & 1 of CAN 0x359)
const FAIL01_BITS = [
  { bit: 0, code: "CELL_OVP", name: "Cell Over-Voltage Protection", category: "OVERVOLTAGE", severity: "CRITICAL" },
  { bit: 1, code: "CELL_UVP", name: "Cell Under-Voltage Protection", category: "UNDERVOLTAGE", severity: "CRITICAL" },
  { bit: 2, code: "CHARGE_OTP", name: "Charge Over-Temperature Protection", category: "OVERTEMPERATURE", severity: "CRITICAL" },
  { bit: 3, code: "CHARGE_UTP", name: "Charge Under-Temperature Protection", category: "UNDERTEMPERATURE", severity: "CRITICAL" },
  { bit: 4, code: "DISCHARGE_OTP", name: "Discharge Over-Temperature Protection", category: "OVERTEMPERATURE", severity: "CRITICAL" },
  { bit: 5, code: "DISCHARGE_UTP", name: "Discharge Under-Temperature Protection", category: "UNDERTEMPERATURE", severity: "CRITICAL" },
  { bit: 6, code: "DISCHARGE_OCP", name: "Discharge Over-Current Protection", category: "OVERCURRENT", severity: "CRITICAL" },
  { bit: 7, code: "CHARGE_OCP", name: "Charge Over-Current Protection", category: "OVERCURRENT", severity: "CRITICAL" },
  { bit: 8, code: "PACK_OVP", name: "Total Pack Over-Voltage Protection", category: "OVERVOLTAGE", severity: "CRITICAL" },
  { bit: 9, code: "PACK_UVP", name: "Total Pack Under-Voltage Protection", category: "UNDERVOLTAGE", severity: "CRITICAL" },
  { bit: 10, code: "REV_POLARITY", name: "Reverse Polarity Fault", category: "WIRING_FAULT", severity: "FATAL" },
  { bit: 11, code: "RELAY_FAIL", name: "Main Contactor / Relay Failure", category: "HARDWARE_FAULT", severity: "FATAL" },
  { bit: 12, code: "PRECHARGE_FAIL", name: "Precharge Circuit Failure", category: "HARDWARE_FAULT", severity: "FATAL" },
  { bit: 13, code: "INSULATION_FAULT", name: "Insulation / Ground Leakage Fault", category: "SAFETY_FAULT", severity: "FATAL" },
  { bit: 14, code: "SYS_ERR", name: "BMS Internal System Error", category: "SYSTEM_FAULT", severity: "FATAL" },
];

// Protection Register 02 (Secondary Hardware & Sensor Faults)
const FAIL02_BITS = [
  { bit: 0, code: "FUSE_BLOWN", name: "Internal Battery Fuse Blown", category: "HARDWARE_FAULT", severity: "FATAL" },
  { bit: 1, code: "INTERNAL_HW", name: "BMS Internal Hardware Fault", category: "HARDWARE_FAULT", severity: "FATAL" },
  { bit: 2, code: "HVIL_FAULT", name: "High Voltage Interlock Loop Fault (HVIL)", category: "SAFETY_FAULT", severity: "CRITICAL" },
  { bit: 3, code: "RESISTOR_OTP", name: "Pre-charge Resistor Over-Temperature", category: "OVERTEMPERATURE", severity: "CRITICAL" },
  { bit: 4, code: "SELF_TEST_FAIL", name: "BMS Power-on Self-Test Failed", category: "SYSTEM_FAULT", severity: "CRITICAL" },
  { bit: 5, code: "CURRENT_SENSOR_ERR", name: "Hall / Current Sensor Fault", category: "SENSOR_FAULT", severity: "WARNING" },
  { bit: 6, code: "VOLTAGE_SENSOR_ERR", name: "Voltage Sampling Wire / Sensor Fault", category: "SENSOR_FAULT", severity: "WARNING" },
  { bit: 7, code: "TEMP_SENSOR_ERR", name: "Temperature NTC Sensor Fault", category: "SENSOR_FAULT", severity: "WARNING" },
  { bit: 8, code: "EEPROM_ERR", name: "EEPROM / Storage Parameter Error", category: "MEMORY_FAULT", severity: "WARNING" },
  { bit: 9, code: "OVERCHARGE_PROT", name: "Over-Charge Secondary Protection", category: "OVERVOLTAGE", severity: "CRITICAL" },
  { bit: 10, code: "OVERDISCHARGE_PROT", name: "Over-Discharge Secondary Protection", category: "UNDERVOLTAGE", severity: "CRITICAL" },
  { bit: 11, code: "SHORT_CIRCUIT", name: "Short Circuit Protection Tripped", category: "OVERCURRENT", severity: "FATAL" },
];

// Warning / Alarm Register (Early Warning Indicators - Byte 2 & 3 of CAN 0x359)
const ALARM_BITS = [
  { bit: 0, code: "CELL_HIGH_V_WARN", name: "Cell High Voltage Early Warning", category: "OVERVOLTAGE", severity: "WARNING" },
  { bit: 1, code: "CELL_LOW_V_WARN", name: "Cell Low Voltage Early Warning", category: "UNDERVOLTAGE", severity: "WARNING" },
  { bit: 2, code: "CELL_HIGH_TEMP_WARN", name: "Cell High Temperature Early Warning", category: "OVERTEMPERATURE", severity: "WARNING" },
  { bit: 3, code: "CELL_LOW_TEMP_WARN", name: "Cell Low Temperature Early Warning", category: "UNDERTEMPERATURE", severity: "WARNING" },
  { bit: 4, code: "DISCHARGE_HIGH_I_WARN", name: "Discharge High Current Warning", category: "OVERCURRENT", severity: "WARNING" },
  { bit: 5, code: "CHARGE_HIGH_I_WARN", name: "Charge High Current Warning", category: "OVERCURRENT", severity: "WARNING" },
  { bit: 6, code: "INTERNAL_COMM_WARN", name: "Internal Slave BMU Comm Warning", category: "COMMUNICATION", severity: "WARNING" },
  { bit: 7, code: "CELL_IMBALANCE_WARN", name: "Cell Voltage Imbalance Warning", category: "CELL_BALANCE", severity: "WARNING" },
];

function parseRegisterValue(val) {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  if (str.startsWith("0x") || str.startsWith("0X")) return parseInt(str, 16) || 0;
  return parseInt(str, 10) || 0;
}

function decodeBitmask(value, bitDefinitions) {
  const num = parseRegisterValue(value);
  const activeFaults = [];
  for (const def of bitDefinitions) {
    if ((num & (1 << def.bit)) !== 0) {
      activeFaults.push({
        bit: def.bit,
        code: def.code,
        name: def.name,
        category: def.category,
        severity: def.severity,
      });
    }
  }
  return {
    raw: num,
    hex: "0x" + num.toString(16).padStart(4, "0").toUpperCase(),
    isNormal: activeFaults.length === 0,
    faults: activeFaults,
    summary: activeFaults.length === 0 ? "Normal (No Faults)" : activeFaults.map((f) => f.name).join("; "),
  };
}

function decodeBmsRegisters(alarmVal, fail01Val, fail02Val) {
  const alarm = decodeBitmask(alarmVal, ALARM_BITS);
  const fail01 = decodeBitmask(fail01Val, FAIL01_BITS);
  const fail02 = decodeBitmask(fail02Val, FAIL02_BITS);

  const allClear = alarm.isNormal && fail01.isNormal && fail02.isNormal;

  return {
    allClear,
    alarm,
    fail01,
    fail02,
    summaryText: allClear
      ? "All Clear — Zero active BMS faults or protection alarms."
      : [
          !fail01.isNormal ? `Fail01: ${fail01.summary}` : null,
          !fail02.isNormal ? `Fail02: ${fail02.summary}` : null,
          !alarm.isNormal ? `Alarm: ${alarm.summary}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
  };
}

// Historical Protection Event Classifier for SolisCloud Alarm Codes
function classifyProtectionEvent(code, msg) {
  const c = String(code || "").trim();
  const m = String(msg || "").toLowerCase();

  if (/un-vbatt|undervolt|low volt|1054/.test(m) || c === "1054") {
    return { category: "UNDERVOLTAGE", severity: "PROTECTION_TRIP", desc: "Battery Under-Voltage Protection Event" };
  }
  if (/ov-vbatt|overvolt|high volt|1053/.test(m) || c === "1053") {
    return { category: "OVERVOLTAGE", severity: "PROTECTION_TRIP", desc: "Battery Over-Voltage Protection Event" };
  }
  if (/no-battery|bat-disconnect|1055/.test(m) || c === "1055") {
    return { category: "DISCONNECT", severity: "CIRCUIT_OPEN", desc: "Battery Circuit Open / Disconnected" };
  }
  if (/batt_comm|bms_comm|2012/.test(m) || c === "2012") {
    return { category: "COMMUNICATION", severity: "BUS_FAULT", desc: "BMS CAN/RS485 Communication Failure" };
  }
  if (/meter-comm|2011/.test(m) || c === "2011") {
    return { category: "COMMUNICATION", severity: "METER_FAULT", desc: "Smart Meter Communication Failure" };
  }
  if (/no-grid|grid-absent|1015/.test(m) || c === "1015") {
    return { category: "GRID_OUTAGE", severity: "UTILITY_LOSS", desc: "Utility Grid Power Outage (Load-Shedding)" };
  }
  if (/overtemp|temp.*high|otp/.test(m)) {
    return { category: "OVERTEMPERATURE", severity: "THERMAL_PROTECTION", desc: "Thermal Over-Temperature Trip" };
  }
  if (/overcurr|current.*high|ocp/.test(m)) {
    return { category: "OVERCURRENT", severity: "CURRENT_PROTECTION", desc: "Over-Current Protection Trip" };
  }
  return { category: "SYSTEM_ALARM", severity: "ALARM", desc: msg || "Unclassified Alarm" };
}

module.exports = {
  FAIL01_BITS,
  FAIL02_BITS,
  ALARM_BITS,
  decodeBitmask,
  decodeBmsRegisters,
  classifyProtectionEvent,
};
