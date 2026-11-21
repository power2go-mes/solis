"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  X,
  Clock,
  Cpu,
  MapPin,
  ShieldAlert,
  Wrench,
  Check,
  ExternalLink,
  Copy,
} from "lucide-react";

export interface AlarmItem {
  id: string | number;
  alarmCode: string;
  alarmName: string;
  severity: "Warning" | "Notice" | "Critical";
  deviceSn: string;
  deviceType?: string;
  plantName?: string;
  beginTime: string;
  endTime?: string;
  duration?: string;
  status: string;
  advice?: string;
}

interface SolisAlarmDetailModalProps {
  alarm: AlarmItem | null;
  isOpen: boolean;
  onClose: () => void;
  onViewDevice?: (deviceSn: string) => void;
}

export default function SolisAlarmDetailModal({
  alarm,
  isOpen,
  onClose,
  onViewDevice,
}: SolisAlarmDetailModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [acknowledged, setAcknowledged] = React.useState(false);

  if (!isOpen || !alarm) return null;

  const isResolved =
    alarm.status.toLowerCase().includes("cleared") ||
    alarm.status.toLowerCase().includes("recovered") ||
    alarm.status.toLowerCase().includes("resolved");

  const isWarning =
    alarm.severity === "Warning" ||
    alarm.severity === "Critical" ||
    alarm.alarmCode.startsWith("F") ||
    alarm.alarmCode === "1015";

  const handleCopySn = () => {
    navigator.clipboard.writeText(alarm.deviceSn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get troubleshooting guide based on alarm code
  const getTroubleshootingGuide = (code: string) => {
    const c = code.toUpperCase();
    if (c.includes("1015") || c.includes("NO-GRID")) {
      return {
        rootCause: "AC utility grid voltage dropped below inverter operating limits or a grid black-out occurred.",
        steps: [
          "Verify the AC main circuit breaker and distribution switchboard in the inverter room.",
          "Measure phase-to-neutral voltages (L1-N, L2-N, L3-N) to ensure they are within nominal 230V ±10%.",
          "Check for loose connections or thermal trips on the grid connection isolator terminals.",
          "If the utility grid is confirmed active and nominal, reboot the inverter via the DC isolator.",
        ],
      };
    }
    if (c.includes("1055") || c.includes("NO-BATTERY") || c.includes("BAT")) {
      return {
        rootCause: "Inverter BMS CAN/RS485 communication line interruption or battery high-voltage contactor open.",
        steps: [
          "Check the CAN/RS485 RJ45 patch cord between the inverter BMS port and battery master BMS.",
          "Verify battery terminal voltage is above minimum activation threshold (>420V for HV system).",
          "Ensure the battery master DC breaker and electronic start button are turned ON.",
          "Check battery pack fault indicator LEDs for individual module cell balance anomalies.",
        ],
      };
    }
    if (c.includes("2011") || c.includes("METER")) {
      return {
        rootCause: "Modbus RS485 communication timeout between inverter and Eastron SDM630 smart meter.",
        steps: [
          "Inspect the twisted-pair shielded cable connected to Meter terminals 7 (A+) and 8 (B-).",
          "Confirm the Modbus address in the smart meter is set to 01 and baud rate matches inverter (9600 bps).",
          "Check if the smart meter LCD display is powered and showing active grid frequency.",
          "Verify termination resistor (120Ω) setting on long RS485 cable runs.",
        ],
      };
    }
    return {
      rootCause: "Solis safety system detected abnormal operating parameter outside standard grid-tie tolerances.",
      steps: [
        "Inspect DC string input voltages on PV1-PV4 to verify polarity and VOC tolerances.",
        "Check inverter ambient temperature and cooling fan operation.",
        "Ensure grounding resistance is below 4Ω as specified in IEC61727 standard.",
        "Verify firmware version is synchronized with the latest SolisCloud release.",
      ],
    };
  };

  const guide = getTroubleshootingGuide(alarm.alarmCode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header Banner */}
        <div
          className={`p-5 flex items-start justify-between border-b ${
            isResolved
              ? "bg-emerald-50/70 border-emerald-100"
              : isWarning
              ? "bg-emerald-50/70 border-orange-100"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isResolved
                  ? "bg-emerald-100 text-emerald-700"
                  : isWarning
                  ? "bg-orange-100 text-[#10b981]"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {isResolved ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-slate-900">
                  {alarm.alarmCode}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                    isResolved
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-orange-100 text-[#10b981] border-emerald-300"
                  }`}
                >
                  {isResolved ? "Recovered / Resolved" : "Active Alarm"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white text-slate-700 border border-gray-200">
                  {alarm.severity}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-800 mt-0.5">
                {alarm.alarmName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fafbfc] p-4 rounded-xl border border-gray-100 text-xs">
            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Device Serial Number</span>
              <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-900">
                <span>{alarm.deviceSn}</span>
                <button
                  onClick={handleCopySn}
                  title="Copy SN"
                  className="text-slate-400 hover:text-[#10b981]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Device Type</span>
              <span className="font-medium text-slate-800">{alarm.deviceType || "Solar Inverter"}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Plant Name</span>
              <span className="font-medium text-[#10b981]">{alarm.plantName || "Solis Station"}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Trigger Timestamp</span>
              <span className="font-mono text-slate-800">{alarm.beginTime}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Recovery Timestamp</span>
              <span className="font-mono text-slate-800">{alarm.endTime || "--"}</span>
            </div>

            <div>
              <span className="text-[11px] text-slate-600 block mb-0.5">Fault Duration</span>
              <span className="font-mono font-semibold text-slate-900">{alarm.duration || "Ongoing"}</span>
            </div>
          </div>

          {/* Root Cause Analysis */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Root Cause Diagnosis</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/60 text-xs text-slate-700 leading-relaxed">
              {guide.rootCause}
            </div>
          </div>

          {/* Troubleshooting Steps */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              <span>Recommended Corrective Measures (Solis Manual)</span>
            </h4>
            <div className="space-y-2">
              {guide.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-slate-700"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-600">
            SolisCloud Diagnostic ID: <span className="font-mono font-medium">AUD-{alarm.id}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onViewDevice && (
              <button
                onClick={() => {
                  onViewDevice(alarm.deviceSn);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg border border-emerald-300 bg-white text-[#10b981] hover:bg-emerald-50 font-medium transition-all shadow-2xs flex items-center justify-center gap-1.5"
              >
                <span>View Device Details</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => {
                setAcknowledged(true);
                setTimeout(onClose, 600);
              }}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-medium transition-all ${
                acknowledged
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-white hover:bg-black"
              }`}
            >
              {acknowledged ? "Acknowledged ✓" : "Acknowledge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
