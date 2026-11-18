"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  BatteryCharging,
  Zap,
  AlertTriangle,
  Activity,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  currentStationId: string;
}

export default function Sidebar({ currentStationId }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Overview",
      href: `/?stationId=${currentStationId}`,
      path: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Analytics",
      href: `/analytics?stationId=${currentStationId}`,
      path: "/analytics",
      icon: LineChart,
    },
    {
      name: "Battery & BMS",
      href: `/bms?stationId=${currentStationId}`,
      path: "/bms",
      icon: BatteryCharging,
    },
    {
      name: "Inverters",
      href: `/inverters?stationId=${currentStationId}`,
      path: "/inverters",
      icon: Zap,
    },
    {
      name: "Alarms & Logs",
      href: `/alarms?stationId=${currentStationId}`,
      path: "/alarms",
      icon: AlertTriangle,
    },
    {
      name: "System Health",
      href: `/health?stationId=${currentStationId}`,
      path: "/health",
      icon: Activity,
    },
    {
      name: "Cross-Plant",
      href: `/plants`,
      path: "/plants",
      icon: Layers,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 select-none min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3 bg-slate-950">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
          S
        </div>
        <div>
          <div className="font-bold tracking-tight text-white flex items-center gap-1.5">
            SolisCloud <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded font-mono font-semibold">PRO</span>
          </div>
          <div className="text-[11px] text-slate-400">Monitoring & Diagnostics</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Plant Monitoring
        </div>
        {navItems.map((item) => {
          const isActive =
            pathname === item.path ||
            (item.path !== "/" && pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Architecture Badge */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-300">Read-Only Safe</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Powered exclusively by Supabase PostgreSQL. Scraper & hardware isolated.
        </p>
      </div>
    </aside>
  );
}
