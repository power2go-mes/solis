"use client";

import React from "react";
import { RotateCw, Plus } from "lucide-react";

interface SolisPageHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  onCreatePlant: () => void;
}

export default function SolisPageHeader({
  onRefresh,
  isRefreshing = false,
  onCreatePlant,
}: SolisPageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5 py-1 relative">
      <div className="flex items-center justify-between relative">
        {/* Title & Refresh Icon */}
        <div className="flex items-center gap-2 z-10">
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
            Plant Overview
          </h1>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors disabled:opacity-50"
            title="Reload latest Supabase data"
          >
            <RotateCw
              className={`w-3.5 h-3.5 text-slate-400 ${
                isRefreshing ? "animate-spin text-[#f37021]" : ""
              }`}
            />
          </button>
        </div>

        {/* Create Plant Button */}
        <button
          onClick={onCreatePlant}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200/90 rounded-lg text-xs font-normal text-slate-700 hover:bg-gray-50/80 hover:border-gray-300 shadow-2xs transition-all active:scale-95 z-10"
        >
          <Plus className="w-3.5 h-3.5 text-slate-500" />
          <span>Create Plant</span>
        </button>
      </div>
    </div>
  );
}
