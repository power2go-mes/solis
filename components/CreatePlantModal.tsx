"use client";

import React from "react";
import { X, ShieldCheck, Info, CheckCircle2 } from "lucide-react";

interface CreatePlantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePlantModal({ isOpen, onClose }: CreatePlantModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="text-base font-bold text-slate-800">Create Plant</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-600">
          <div className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-950">
                Hardware Commissioning & Organization Policy
              </p>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                In compliance with SolisCloud manufacturer security rules, newly commissioned plants and datalogger SNs must be paired via the authorized SolisCloud Installer Portal.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800">Automatic Plant Synchronization</h4>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Any newly added plant under your Solis organization will be detected automatically.</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>The silent background sync daemon synchronizes telemetry and energy curves every 10 minutes.</span>
              </li>
              <li className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Database currently tracks 7 plants (5 online with live telemetry, 2 registered offline).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
