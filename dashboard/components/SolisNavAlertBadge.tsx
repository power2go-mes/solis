"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface NocIncident {
  id: string;
  severity: "P0" | "P1" | "P2";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
}

interface SolisNavAlertBadgeProps {
  onClick?: () => void;
}

export function SolisNavAlertBadge({ onClick }: SolisNavAlertBadgeProps) {
  const [incidents, setIncidents] = useState<NocIncident[]>([]);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch("/api/noc/incidents?status=OPEN,ACKNOWLEDGED");
      const data = await res.json();
      if (data.success && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  if (incidents.length === 0) return null;

  // Determine highest severity: P0 > P1 > P2
  const hasP0 = incidents.some((i) => i.severity === "P0");
  const hasP1 = incidents.some((i) => i.severity === "P1");

  // Styling based on highest severity
  // P0 (Serious) -> Red
  // P1 (Medium) -> Yellow / Amber
  // P2 (Low / Minor) -> Blue
  const badgeStyle = hasP0
    ? "bg-rose-500/15 border-rose-400/30 text-rose-600 hover:bg-rose-500/25"
    : hasP1
    ? "bg-amber-500/15 border-amber-400/30 text-amber-700 hover:bg-amber-500/25"
    : "bg-blue-500/15 border-blue-400/30 text-blue-600 hover:bg-blue-500/25";

  const dotColor = hasP0
    ? "bg-rose-500"
    : hasP1
    ? "bg-amber-500"
    : "bg-blue-500";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer shadow-2xs ${badgeStyle}`}
      title={`${incidents.length} active alert(s)`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
      <AlertTriangle className="w-3.5 h-3.5" />
      <span>Alert</span>
      <span className="text-[10px] font-bold px-1 rounded-full bg-black/10">
        {incidents.length}
      </span>
    </button>
  );
}
