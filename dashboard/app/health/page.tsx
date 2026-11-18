"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { PlantInfo, TelemetryLatest } from "@/lib/types";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";

function HealthContent() {
  const searchParams = useSearchParams();
  const stationIdParam = searchParams.get("stationId") || "1298491919450797504";

  const [stationId, setStationId] = useState<string>(stationIdParam);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryLatest | null>(null);
  const [investigationData, setInvestigationData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (stationIdParam && stationIdParam !== stationId) {
      setStationId(stationIdParam);
    }
  }, [stationIdParam]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [plantsRes, telRes, invesRes] = await Promise.all([
          fetch("/api/plants"),
          fetch(`/api/telemetry/latest?stationId=${stationId}`),
          fetch(`/api/investigation?stationId=${stationId}`),
        ]);

        const pData = await plantsRes.json();
        const tData = await telRes.json();
        const iData = await invesRes.json();

        if (pData.success) setPlants(pData.plants);
        if (tData.success && tData.hasData) setTelemetry(tData.telemetry);
        else setTelemetry(null);

        if (iData.success) setInvestigationData(iData);
      } catch (err) {
        console.error("Error loading investigation data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [stationId]);

  const currentPlant = plants.find((p) => p.id === stationId);
  const auditDates = investigationData?.auditDates || [];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar currentStationId={stationId} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          plants={plants}
          currentPlant={currentPlant}
          telemetry={telemetry}
          onPlantChange={(newId) => setStationId(newId)}
        />

        <main className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-200 gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                System Health & Incident Investigation (Nov 8–17 Forensic Audit)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Site: <strong className="text-slate-800">Menu Karachi Office (`1298491919450797504`)</strong> • Time Zone: Pakistan Standard Time (PKT)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-xs text-indigo-700">
                Audit Status: Finalized
              </span>
            </div>
          </div>

          {/* Incident Audit Note when viewing other plants */}
          {stationId !== "1298491919450797504" && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm">
                    Viewing {currentPlant?.name || "Selected Plant"} — Target Incident Notice
                  </h4>
                  <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                    The 10-day forensic audit below specifically documents the Nov 8–17 dual-inverter lockout incident at{" "}
                    <strong>Menu Karachi Office (ID: 1298491919450797504)</strong>. All telemetry and alarms for your selected plant are available in the other tabs.
                  </p>
                </div>
              </div>
              <Link
                href="/health?stationId=1298491919450797504"
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0 text-center"
              >
                Switch to Menu Karachi Audit
              </Link>
            </div>
          )}

          {/* Incident Classification Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-emerald-500">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Confirmed Facts</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                808.4 kWh of actual PV generation on Nov 10–13. Telemetry integrals prove the 0.0 kWh table was a reporting desync.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-amber-500">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Confirmed Hardware Outage</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Nov 15: Battery charge was 0.0 kWh all day (BMS Charge Cutoff = 0 A) despite 189.8 kWh solar generated.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-rose-500">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Grid & Battery Trips</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Nov 16–17: Battery 4h 15m lockout (1054/1055), DC-INTF 1027, and two full utility grid outages (1015).
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs border-l-4 border-l-red-600 bg-red-50/20">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Active Emergency</span>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Nov 18: Both inverters currently locked in State 3 with active 1054 UN-Vbatt & 1055 NO-Battery alarms.
              </p>
            </div>
          </div>

          {/* Core Audit Parity Table (Curve Integration vs Counter Table) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  10-Day Energy Integration vs. Counter Table Parity Verification
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proving actual physical inverter output during the Nov 10–13 reporting freeze (P_kW &times; 5/60 hrs = E_kWh)
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-semibold border border-emerald-200">
                808.4 kWh Physical Generation Verified
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date (PKT)</th>
                    <th className="py-2.5 px-3 text-right">5-Min Integral PV</th>
                    <th className="py-2.5 px-3 text-right">Table Counter PV</th>
                    <th className="py-2.5 px-3 text-right">Integral Charge</th>
                    <th className="py-2.5 px-3 text-right">Table Charge</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Forensic Diagnostic Findings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {auditDates.map((d: any) => {
                    const isFalseZero = d.status === "Reporting Bug";
                    const isFault = d.status === "Hardware Fault" || d.status === "Severe Faults" || d.status === "Active Emergency";

                    return (
                      <tr key={d.date} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-800 whitespace-nowrap">
                          {d.date}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-700">
                          {d.integratedPv.toFixed(1)} kWh
                        </td>
                        <td className={`py-2.5 px-3 text-right font-bold ${isFalseZero ? "text-rose-600 bg-rose-50/60" : "text-slate-800"}`}>
                          {d.tablePv.toFixed(1)} kWh
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700">
                          {d.integratedCharge.toFixed(1)} kWh
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {d.tableCharge.toFixed(1)} kWh
                        </td>
                        <td className="py-2.5 px-3 text-center font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.status === "Normal"
                                ? "bg-emerald-100 text-emerald-800"
                                : isFalseZero
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px]">
                          {d.notes}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chronological Root Cause Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incident 1: Nov 10-13 Datalogger Collision */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">Incident 1: Dual-Logger Collision (Nov 10–13)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Starting Nov 10 at 00:35:41, two dataloggers (Cellular <code className="font-mono bg-slate-100 px-1 py-0.5">7A12570303D040F0</code> and WiFi <code className="font-mono bg-slate-100 px-1 py-0.5">5A1249020280457B</code>) polled Inverter 1 concurrently. Telemetry packet intervals dropped from 300 seconds down to <strong>17–54 seconds</strong>, inflating daily points to <strong>703–715</strong>. The conflicting packet formats broke SolisCloud&apos;s daily accumulator calculation, writing 0.0 kWh to the summary table while generation continued normally.
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                <strong>Remediation:</strong> Unplug the redundant WiFi datalogger stick on site and unbind it from the SolisCloud station.
              </div>
            </div>

            {/* Incident 2: Nov 15 BMS Charge Lockout */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900">Incident 2: Battery Charge Standstill (Nov 15)</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                On Nov 15, the plant produced 189.8 kWh of solar energy, but <strong>0.0 kWh charged into the battery</strong>. The battery SOC remained frozen at <strong>73%</strong> all day. The BMS engaged its Charge Current Limit of 0 A following AC Phase 3 grid undervoltage (<code className="font-mono bg-slate-100 px-1 py-0.5">1011 UN03-G-V</code>) on Nov 14, forcing the facility to import power from the grid in the evening.
              </p>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-700">
                <strong>Remediation:</strong> Inspect CAN bus communication wiring and verify high-voltage pack contactor operation.
              </div>
            </div>
          </div>

          {/* Technician Action Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Recommended Technician On-Site Action Plan
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-slate-900">Clear Active Battery Trip (1054 & 1055):</strong> Check DC isolators and MCCB circuit breakers between battery racks and both inverters. Inspect RJ45 CAN/RS-485 cables and execute a controlled cold reboot.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-slate-900">Eliminate Datalogger Hardware Duplication:</strong> Locate and disconnect the older <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">S4-WiFi-ST (5A1249020280457B)</code> dongle so only the <code className="font-mono bg-slate-200 px-1 py-0.5 rounded">S2-WL-ST 4G</code> collector communicates with the inverters.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-slate-900">Inspect Inverter 2 PV String 2 for Reverse Leakage:</strong> Perform nocturnal clamp-meter measurements to test whether the 0.5–0.6 A leakage is hardware diode failure or sensor calibration drift.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading System Health Investigation...</div>}>
      <HealthContent />
    </Suspense>
  );
}
