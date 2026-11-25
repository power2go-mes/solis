"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Clock } from "lucide-react";

interface InverterHealth {
  station_id: string;
  inverter_sn: string;
  last_collected_at: string | null;
  minutes_since_last: number;
  records_last_24h: number;
  records_today: number;
  total_records: number;
  earliest_ever: string | null;
  status: "ok" | "warning" | "critical" | "never";
  stale: boolean;
}

interface BmsCollectorHealthProps {
  stationId?: string;
  inverterLabels?: Record<string, string>; // sn -> display label
  refreshIntervalSeconds?: number;
  compact?: boolean;
}

function StatusIcon({ status }: { status: InverterHealth["status"] }) {
  if (status === "ok") return <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />;
  if (status === "warning") return <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />;
  if (status === "critical") return <XCircle size={14} className="text-red-400 flex-shrink-0" />;
  return <XCircle size={14} className="text-gray-500 flex-shrink-0" />;
}

function StatusPill({ status }: { status: InverterHealth["status"] }) {
  const styles: Record<string, string> = {
    ok: "bg-emerald-900/50 text-emerald-300 border-emerald-700",
    warning: "bg-amber-900/50 text-amber-300 border-amber-700",
    critical: "bg-red-900/50 text-red-300 border-red-700",
    never: "bg-gray-800 text-gray-400 border-gray-600",
  };
  const labels: Record<string, string> = { ok: "Live", warning: "Delayed", critical: "Stale", never: "No Data" };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatTimeSince(minutes: number): string {
  if (minutes > 9000) return "Never";
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m ago`;
}

export default function BmsCollectorHealth({
  stationId,
  inverterLabels = {},
  refreshIntervalSeconds = 60,
  compact = false,
}: BmsCollectorHealthProps) {
  const [health, setHealth] = useState<InverterHealth[]>([]);
  const [systemStatus, setSystemStatus] = useState<"ok" | "warning" | "critical">("ok");
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (stationId) params.set("stationId", stationId);
      const res = await fetch(`/api/bms/health?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setHealth(json.health || []);
      setSystemStatus(json.systemStatus || "ok");
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, refreshIntervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth, refreshIntervalSeconds]);

  if (compact) {
    // Compact inline badge for use in dashboards/sidebars
    return (
      <button
        onClick={fetchHealth}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-500 transition text-xs"
        title="BMS Collector Status — Click to refresh"
      >
        {loading ? (
          <RefreshCw size={12} className="animate-spin text-gray-400" />
        ) : (
          <StatusIcon status={systemStatus} />
        )}
        <span className={
          systemStatus === "ok" ? "text-emerald-300" :
          systemStatus === "warning" ? "text-amber-300" : "text-red-300"
        }>
          BMS Logger
        </span>
        {!loading && lastFetched && (
          <span className="text-gray-500">
            {health.length > 0 ? `· ${health.length} inv` : "· no data"}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-400" />
          <h3 className="text-white font-semibold text-sm">BMS Collector Health</h3>
          <StatusPill status={systemStatus} />
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-gray-500">
              Updated {new Date(lastFetched).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="p-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs flex items-center gap-1">
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      {health.length === 0 && !loading && !error && (
        <p className="text-gray-500 text-xs">No BMS records found in solis_bms_telemetry.</p>
      )}

      {/* Per-inverter rows */}
      <div className="space-y-2">
        {health.map((h) => {
          const label = inverterLabels[h.inverter_sn] || `Inverter …${h.inverter_sn.slice(-6)}`;
          return (
            <div
              key={`${h.station_id}:${h.inverter_sn}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-xs ${
                h.status === "ok" ? "border-emerald-800 bg-emerald-900/20" :
                h.status === "warning" ? "border-amber-800 bg-amber-900/20" :
                h.status === "critical" ? "border-red-800 bg-red-900/20" :
                "border-gray-700 bg-gray-800/50"
              }`}
            >
              <StatusIcon status={h.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium truncate">{label}</span>
                  <StatusPill status={h.status} />
                </div>
                <div className="text-gray-400 mt-0.5 flex flex-wrap gap-3">
                  <span>
                    Last: {" "}
                    <span className={h.stale ? "text-amber-300" : "text-gray-200"}>
                      {h.last_collected_at ? formatTimeSince(h.minutes_since_last) : "Never collected"}
                    </span>
                  </span>
                  <span>Today: <span className="text-gray-200">{h.records_today} readings</span></span>
                  <span>24h: <span className="text-gray-200">{h.records_last_24h}</span></span>
                  <span>Total: <span className="text-gray-200">{h.total_records.toLocaleString()}</span></span>
                </div>
                {h.stale && h.status !== "never" && (
                  <div className="text-amber-400 text-[10px] mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={10} />
                    Data is {Math.round(h.minutes_since_last)}min old — expected every 5min
                  </div>
                )}
                {h.status === "never" && (
                  <div className="text-gray-500 text-[10px] mt-0.5">
                    No BMS data ever collected. Ensure solis_bms_logger_daemon.js is running.
                  </div>
                )}
              </div>
              {h.last_collected_at && (
                <div className="text-right flex-shrink-0 text-[10px] text-gray-500">
                  {new Date(h.last_collected_at).toLocaleString("en-GB", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-600">
        🔁 Refreshes every {refreshIntervalSeconds}s. Stale = no new data for &gt;10 min. Critical = &gt;15 min.
        Logger: <code>solis_bms_logger_daemon.js</code> under <code>collector_guardian.js</code>.
      </p>
    </div>
  );
}
