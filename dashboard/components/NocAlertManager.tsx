"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface NocIncident {
  id: string;
  station_id: string;
  station_name: string;
  severity: "P0" | "P1" | "P2";
  category: string;
  title: string;
  description: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  created_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

interface NocAlertManagerProps {
  embedded?: boolean;
}

export function NocAlertManager({ embedded = false }: NocAlertManagerProps) {
  const [incidents, setIncidents] = useState<NocIncident[]>([]);
  const [resolvingIncident, setResolvingIncident] = useState<NocIncident | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Poll active incidents every 15 seconds
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/noc/incidents?status=OPEN,ACKNOWLEDGED");
      const data = await res.json();
      if (data.success && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
      }
    } catch (err) {
      console.error("NOC incident poll failed:", err);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Handle Ignore (instantly dismisses/resolves the alert)
  const handleIgnore = async (id: string) => {
    // Optimistically filter it out immediately
    setIncidents((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch("/api/noc/ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: id, operatorName: "User" }),
      });
      fetchIncidents();
    } catch (err) {
      console.error("Ignore error:", err);
      fetchIncidents();
    }
  };

  const handleResolve = async () => {
    if (!resolvingIncident || !resolutionNote.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/noc/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: resolvingIncident.id,
          operatorName: "NOC Lead",
          resolutionNotes: resolutionNote.trim(),
        }),
      });
      setResolvingIncident(null);
      setResolutionNote("");
      fetchIncidents();
    } catch (err) {
      console.error("Resolve error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (incidents.length === 0) return null;

  return (
    <>
      {/* NOC Alarm Feed — Embedded inline block or Fixed top banner */}
      <div
        className={
          embedded
            ? "w-full my-2 animate-in fade-in duration-300"
            : "fixed top-16 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 pointer-events-none"
        }
      >
        <div className={embedded ? "flex flex-col gap-2.5 w-full" : "pointer-events-auto flex flex-col gap-2"}>
          {incidents.slice(0, embedded ? 5 : 3).map((inc) => {
            const isP0 = inc.severity === "P0";
            const isP1 = inc.severity === "P1";

            const bgClass = isP0
              ? "bg-red-500/95 border-red-600 text-white shadow-red-500/20"
              : isP1
              ? "bg-amber-500/95 border-amber-600 text-slate-900 shadow-amber-500/20"
              : "bg-blue-600/95 border-blue-700 text-white shadow-blue-500/20";

            return (
              <div
                key={inc.id}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border shadow-md backdrop-blur-md transition-all animate-in slide-in-from-top-2 ${bgClass}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-black/20">
                    {inc.severity}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {inc.station_name}: {inc.title}
                    </p>
                    <p className="text-[11px] opacity-90 truncate">{inc.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Indicator */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      inc.status === "ACKNOWLEDGED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-white/20 text-white"
                    }`}
                  >
                    {inc.status === "ACKNOWLEDGED" ? "Investigating" : "Action Required"}
                  </span>

                  {/* Ignore Button — replaces Acknowledge and dismisses the alert */}
                  <button
                    onClick={() => handleIgnore(inc.id)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/90 text-slate-800 font-semibold shadow-xs hover:bg-white transition active:scale-95 cursor-pointer"
                    title="Ignore and dismiss this alert"
                  >
                    Ignore
                  </button>

                  {/* Resolve & Close Button */}
                  <button
                    onClick={() => setResolvingIncident(inc)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 font-semibold transition active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resolution Notes Modal */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Resolve & Close Incident</h3>
                  <p className="text-xs text-slate-500">{resolvingIncident.station_name}</p>
                </div>
              </div>
              <button
                onClick={() => setResolvingIncident(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Root Cause & Resolution Notes</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="e.g. K-Electric grid power restored, inverter sync confirmed normal."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 h-24 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setResolvingIncident(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={isSubmitting || !resolutionNote.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50"
              >
                {isSubmitting ? "Closing..." : "Close Incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
