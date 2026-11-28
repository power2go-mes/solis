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
  battery_sn?: string;
  sample_count: number;
  bucket: string;
  inverter_sn: string;
  min_temp_c: number | null;
  avg_temp_c: number | null;
  max_temp_c: number | null;
  min_temp_location?: string;
  max_temp_location?: string;
  soc_percent?: number;
}

interface BmsTempHistoryChartProps {
  source: "cell" | "inverter";
  batteries: {sn: string; inverterSn?: string}[];
  plantName?: string;
  inverterSn?: string;
  batterySn?: string;
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
  if (granularity === "daily") return d.toLocaleDateString("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short" });
  if (granularity === "hourly") return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit" });
}

function cellLabel(location?: string | null) {
  const raw = location?.trim();
  if (!raw || /^0+(?:-0+)*$/.test(raw)) return "Cell unavailable";
  const match = /^(?:\d+-)*(\d+)$/.exec(raw);
  if (!match) return `Location ${raw}`;
  return raw.includes("-") ? `Cell ${match[1]} (${raw})` : `Cell ${raw}`;
}

const CustomTooltip = ({ active, payload, label, cell }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="mb-0.5">
          {p.name}: <span className="font-bold">{p.value != null ? `${p.value.toFixed(1)} °C` : "—"}</span>
          {cell && <span className="ml-2 text-gray-300">{cellLabel(p.payload?.[`location_${p.dataKey}`])}</span>}
        </p>
      ))}
    </div>
  );
};

export default function BmsTempHistoryChart({
  source,
  plantName,
  inverterSn,
  batterySn,
  batteries,
  availableInverters,
}: BmsTempHistoryChartProps) {
  const [data, setData] = useState<BmsTempPoint[]>([]);
  const cell = source === "cell";
  const request = React.useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const dayFormat = new Intl.DateTimeFormat("en-CA", {timeZone: "Asia/Karachi"});
  const today = dayFormat.format(new Date());
  const sevenDaysAgo = dayFormat.format(new Date(Date.now() - 7 * 86400000));
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [granularity, setGranularity] = useState<"5min" | "hourly" | "daily">("hourly");
  const [selectedInverter, setSelectedInverter] = useState<string>(inverterSn || "all");
  const [selectedBattery, setSelectedBattery] = useState("all");
  const pack = batterySn || (batteries.some(b => b.sn === selectedBattery) ? selectedBattery : "all");
  const [showMin, setShowMin] = useState(true);
  const [showMax, setShowMax] = useState(true);

  // Sync selectedInverter with inverterSn prop if changed externally
  useEffect(() => {
    setSelectedInverter(inverterSn || "all");
  }, [inverterSn, plantName]);

  const fetchData = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        granularity,
        dateFrom,
        dateTo,
      });
      params.set("source", source);
      const scope = (availableInverters || []).filter(i =>
        (!inverterSn || i.sn === inverterSn) && (selectedInverter === "all" || i.sn === selectedInverter));
      for (const inverter of scope) params.append("sn", inverter.sn);
      if (cell && pack !== "all") params.set("batterySn", pack);

      const res = await fetch(`/api/bms/temperature-history?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "API error");
      if (id === request.current) setData(json.data || []);
    } catch (e: any) {
      if (id === request.current) setError(e.message);
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [source, cell, availableInverters, inverterSn, pack, granularity, dateFrom, dateTo, selectedInverter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pivot: group by bucket, merge inverter series
  const chartData = useMemo(() => {
    const map = new Map<string, Record<string, any>>();
    data.forEach((pt) => {
      const key = new Date(pt.bucket).toISOString();
      if (!map.has(key)) map.set(key, { bucket: key, label: formatBucket(pt.bucket, granularity) });
      const entry = map.get(key)!;
      const snShort = cell ? pt.battery_sn : pt.inverter_sn;
      entry[`min_${snShort}`] = pt.min_temp_c;
      entry[`avg_${snShort}`] = pt.avg_temp_c;
      entry[`max_${snShort}`] = pt.max_temp_c;
      if (cell) {
        entry[`location_min_${snShort}`] = pt.min_temp_location;
        entry[`location_max_${snShort}`] = pt.max_temp_location;
      }
    });
    return Array.from(map.values()).sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [data, granularity, cell]);

  // Unique inverter SNs in result
  const deviceSns = [...new Set(data.map(d => cell ? d.battery_sn : d.inverter_sn))].filter((sn): sn is string => !!sn);
  const batteryLabel = (sn: string) => {
    const inv = batteries.find(b => b.sn === sn)?.inverterSn;
    return inv ? `${availableInverters?.find(i => i.sn === inv)?.label || inv} · ${sn.startsWith(inv) ? sn.slice(inv.length) : sn}` : sn;
  };

  const hasData = chartData.length > 0;


  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Thermometer className="text-orange-400" size={18} />
          <h3 className="text-white font-semibold text-sm">{cell ? "Battery Cell Temperature History" : "Inverter Temperature History"}</h3>
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
          aria-label={cell ? "Filter battery temperature by battery" : "Filter inverter temperature by inverter"}
          disabled={cell ? !!batterySn : !!inverterSn}
          value={cell ? pack : selectedInverter}
          onChange={e => cell ? setSelectedBattery(e.target.value) : setSelectedInverter(e.target.value)}
          className="bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600"
        >
          <option value="all">{cell ? "All Batteries" : "All Inverters"}</option>
          {cell ? batteries.map(b => <option key={b.sn} value={b.sn}>{batteryLabel(b.sn)}</option>)
            : availableInverters?.map(i => <option key={i.sn} value={i.sn}>{i.label}</option>)}
        </select>

        {/* Series toggles */}
        {cell && <div className="flex gap-2 ml-auto">
          {[
            { key: "showMin", label: "Min", color: "#3b82f6", state: showMin, toggle: () => setShowMin(v => !v) },
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
        </div>}
      </div>

      {!loading && !error && hasData && <p className="text-xs text-gray-400">
        {data.reduce((total, point) => total + point.sample_count, 0)} readings
      </p>}

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
            <span>No {cell ? "cell" : "inverter"} temperature readings for this selection.</span>

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
              <Tooltip content={<CustomTooltip cell={cell} />} />
              <Legend
                formatter={(value) => <span style={{ color: "#d1d5db", fontSize: 11 }}>{value}</span>}
              />
              {deviceSns.map((sn, idx) => {
                const colors = getInverterColors(idx);
                const snShort = sn;
                const label = cell ? batteryLabel(sn) : availableInverters?.find(i => i.sn === sn)?.label || `Inv …${snShort}`;
                return (
                  <React.Fragment key={sn}>
                    {cell && showMin && (
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
                    {!cell && (
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
                    {cell && showMax && (
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
        {cell ? "Lowest and highest cell sensor temperatures reported by the battery BMS."
          : "Inverter sensor temperature in °C. Each line shows one inverter’s average temperature for the selected interval."}
      </p>
    </div>
  );
}
