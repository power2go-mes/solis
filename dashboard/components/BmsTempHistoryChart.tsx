"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts";
import { Thermometer, RefreshCw, AlertTriangle, CheckCircle, Download } from "lucide-react";

interface BmsTempPoint {
  bucket: string;
  inverter_sn: string;
  min_temp_c: number | null;
  avg_temp_c: number | null;
  max_temp_c: number | null;
  min_temp_location?: string;
  max_temp_location?: string;
  soc_percent?: number;
}

interface CoverageInfo {
  inverter_sn: string;
  total_rows: number;
  earliest: string | null;
  latest: string | null;
  overall_min: number | null;
  overall_avg: number | null;
  overall_max: number | null;
}

interface BmsTempHistoryChartProps {
  stationId: string;
  plantName?: string;
  availableInverters?: { sn: string; label: string }[];
}

const INVERTER_COLORS: Record<string, { min: string; avg: string; max: string }> = {
  default: { min: "#3b82f6", avg: "#f59e0b", max: "#ef4444" },
  alt1: { min: "#0d9488", avg: "#8b5cf6", max: "#f97316" },
  alt2: { min: "#06b6d4", avg: "#ec4899", max: "#84cc16" },
};

function getInverterColors(idx: number) {
  const keys = Object.keys(INVERTER_COLORS);
  return INVERTER_COLORS[keys[idx % keys.length]];
}

function formatBucket(bucket: string, granularity: string) {
  const d = new Date(bucket);
  if (granularity === "daily") return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  if (granularity === "hourly") return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const CustomTooltip = ({ active, payload, label, granularity }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="mb-0.5">
          {p.name}: <span className="font-bold">{p.value != null ? `${p.value.toFixed(1)} °C` : "—"}</span>
        </p>
      ))}
    </div>
  );
};

export default function BmsTempHistoryChart({ stationId, plantName, availableInverters }: BmsTempHistoryChartProps) {
  const [data, setData] = useState<BmsTempPoint[]>([]);
  const [coverage, setCoverage] = useState<CoverageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [granularity, setGranularity] = useState<"5min" | "hourly" | "daily">("hourly");
  const [selectedInverter, setSelectedInverter] = useState<string>("all");
  const [showMin, setShowMin] = useState(true);
  const [showAvg, setShowAvg] = useState(true);
  const [showMax, setShowMax] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        stationId,
        granularity,
        dateFrom,
        dateTo,
      });
      if (selectedInverter !== "all") params.set("inverterSn", selectedInverter);

      const res = await fetch(`/api/bms/temperature-history?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "API error");
      setData(json.data || []);
      setCoverage(json.coverage || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [stationId, granularity, dateFrom, dateTo, selectedInverter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pivot: group by bucket, merge inverter series
  const chartData = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    data.forEach((pt) => {
      const key = new Date(pt.bucket).toISOString();
      if (!map.has(key)) map.set(key, { bucket: key, label: formatBucket(pt.bucket, granularity) });
      const entry = map.get(key)!;
      const snShort = pt.inverter_sn.slice(-6);
      entry[`min_${snShort}`] = pt.min_temp_c;
      entry[`avg_${snShort}`] = pt.avg_temp_c;
      entry[`max_${snShort}`] = pt.max_temp_c;
    });
    return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [data, granularity]);

  // Unique inverter SNs in result
  const inverterSns = useMemo(() => [...new Set(data.map((d) => d.inverter_sn))], [data]);

  const hasData = chartData.length > 0;
  const covSummary = coverage[0];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Thermometer className="text-orange-400" size={18} />
          <h3 className="text-white font-semibold text-sm">BMS Cell Temperature History</h3>
          {plantName && <span className="text-gray-400 text-xs">— {plantName}</span>}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 rounded-md bg-gray-800 hover:bg-gray-700 transition"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-400">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-400">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={today}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as any)}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="5min">5-minute</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>
        <select
          value={selectedInverter}
          onChange={(e) => setSelectedInverter(e.target.value)}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Inverters</option>
          {(availableInverters || []).map((inv) => (
            <option key={inv.sn} value={inv.sn}>{inv.label}</option>
          ))}
          {!availableInverters && inverterSns.map((sn) => (
            <option key={sn} value={sn}>Inverter …{sn.slice(-6)}</option>
          ))}
        </select>

        {/* Series toggles */}
        <div className="flex gap-2 ml-auto">
          {[
            { key: "showMin", label: "Min", color: "#3b82f6", state: showMin, toggle: () => setShowMin(v => !v) },
            { key: "showAvg", label: "Avg", color: "#f59e0b", state: showAvg, toggle: () => setShowAvg(v => !v) },
            { key: "showMax", label: "Max", color: "#ef4444", state: showMax, toggle: () => setShowMax(v => !v) },
          ].map((s) => (
            <button
              key={s.key}
              onClick={s.toggle}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
                s.state ? "border-current opacity-100" : "border-gray-600 opacity-40"
              }`}
              style={{ color: s.color, borderColor: s.state ? s.color : undefined }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage summary */}
      {covSummary && (
        <div className="flex gap-4 flex-wrap text-xs text-gray-400">
          <span>🗓 {coverage.reduce((s, c) => s + parseInt(String(c.total_rows)), 0)} total readings</span>
          <span>📅 Earliest: {covSummary.earliest ? new Date(covSummary.earliest).toLocaleDateString("en-GB") : "—"}</span>
          <span>🕐 Latest: {covSummary.latest ? new Date(covSummary.latest).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}</span>
          {covSummary.overall_min != null && (
            <>
              <span className="text-blue-400">↓ {covSummary.overall_min.toFixed(1)} °C</span>
              <span className="text-amber-400">≈ {covSummary.overall_avg?.toFixed(1)} °C</span>
              <span className="text-red-400">↑ {covSummary.overall_max?.toFixed(1)} °C</span>
            </>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="relative" style={{ height: 280 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 rounded-lg z-10">
            <RefreshCw className="animate-spin text-blue-400" size={24} />
          </div>
        )}
        {error && !loading && (
          <div className="flex items-center justify-center h-full text-red-400 text-sm gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {!error && !loading && !hasData && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-sm gap-2">
            <Thermometer size={28} />
            <span>No BMS temperature data for the selected range.</span>
            <span className="text-xs">The 5-minute logger must be running to collect new readings.</span>
          </div>
        )}
        {!error && hasData && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="label"
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                interval="preserveStartEnd"
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 10 }}
                tickFormatter={(v) => `${v}°`}
                domain={["auto", "auto"]}
                label={{ value: "°C", position: "insideLeft", offset: 10, fill: "#6b7280", fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip granularity={granularity} />} />
              <Legend
                formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 11 }}>{value}</span>}
              />
              {/* Warning temperature reference lines */}
              <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="4 2" label={{ value: "45°C limit", fill: "#ef4444", fontSize: 10, position: "right" }} />
              <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "35°C warn", fill: "#f59e0b", fontSize: 10, position: "right" }} />

              {inverterSns.map((sn, idx) => {
                const colors = getInverterColors(idx);
                const snShort = sn.slice(-6);
                const label = availableInverters?.find(i => i.sn === sn)?.label || `Inv …${snShort}`;
                return (
                  <React.Fragment key={sn}>
                    {showMin && (
                      <Line
                        key={`min_${sn}`}
                        type="monotone"
                        dataKey={`min_${snShort}`}
                        name={`Min — ${label}`}
                        stroke={colors.min}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {showAvg && (
                      <Line
                        key={`avg_${sn}`}
                        type="monotone"
                        dataKey={`avg_${snShort}`}
                        name={`Avg — ${label}`}
                        stroke={colors.avg}
                        strokeWidth={2}
                        dot={false}
                        connectNulls
                      />
                    )}
                    {showMax && (
                      <Line
                        key={`max_${sn}`}
                        type="monotone"
                        dataKey={`max_${snShort}`}
                        name={`Max — ${label}`}
                        stroke={colors.max}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {chartData.length > 50 && <Brush dataKey="label" height={18} stroke="#4b5563" fill="#1f2937" travellerWidth={6} />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-gray-600 text-right">
        Source: <code>solis_bms_telemetry</code> — logged every 5 min from /api/inverter/detail·batteryList[].bmsTemp.
        SolisCloud day-history APIs do not expose cell temperatures.
      </p>
    </div>
  );
}
