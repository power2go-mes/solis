"use client";

import React, { useState } from "react";
import { X, Check, Copy, Settings, ShieldCheck, Power, Sliders, Cpu } from "lucide-react";

interface SolisMobileDeviceSettingsModalProps {
  device: any;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: any) => void;
}

export default function SolisMobileDeviceSettingsModal({
  device,
  isOpen,
  onClose,
  onSave,
}: SolisMobileDeviceSettingsModalProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [workMode, setWorkMode] = useState("Self-Consumption");
  const [gridFeedInEnabled, setGridFeedInEnabled] = useState(true);
  const [maxChargePower, setMaxChargePower] = useState("50");

  if (!isOpen || !device) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(device.sn);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    setSaved(true);
    if (onSave) onSave({ ...device, workMode, gridFeedInEnabled, maxChargePower });
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100 bg-[#fafbfc]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#10b981]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{device.name || "Device Parameters"}</h3>
              <p className="text-[11px] text-slate-500">{device.type} Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Identity Box */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Serial Number</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>{device.sn}</span>
                <button onClick={handleCopy} className="text-slate-400 hover:text-[#10b981]">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
              <span className="text-[11px] text-slate-500">Operating Status</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-700">Online / Connected</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
              <span className="text-[11px] text-slate-500">Firmware Build</span>
              <span className="font-mono text-slate-700">05010A-550210</span>
            </div>
          </div>

          {/* Operating Mode */}
          <div className="space-y-1.5">
            <label className="block text-slate-700 font-bold text-[11px] uppercase tracking-wider">
              Inverter Energy Storage Strategy
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: "Self-Consumption", label: "Self-Consumption Mode", desc: "PV prioritizes home load, charges battery, exports excess." },
                { id: "Feed-in Priority", label: "Feed-in Priority", desc: "PV maximizes export to grid during peak tariff hours." },
                { id: "Off-Grid Backup", label: "Off-Grid UPS Backup", desc: "Keep battery 100% charged for emergency blackouts." },
              ].map((mode) => (
                <div
                  key={mode.id}
                  onClick={() => setWorkMode(mode.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    workMode === mode.id
                      ? "border-[#10b981] bg-emerald-50/50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${workMode === mode.id ? "text-[#10b981]" : "text-slate-800"}`}>
                      {mode.label}
                    </span>
                    <input
                      type="radio"
                      checked={workMode === mode.id}
                      onChange={() => setWorkMode(mode.id)}
                      className="accent-[#10b981]"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{mode.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Power Limit */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-bold text-[11px] uppercase tracking-wider">Maximum Charge Power</span>
              <span className="font-mono font-bold text-[#10b981]">{maxChargePower} kW</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={maxChargePower}
              onChange={(e) => setMaxChargePower(e.target.value)}
              className="w-full accent-[#10b981]"
            />
          </div>

          {/* Grid Export Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <span className="font-bold text-slate-800 block">Allow Grid Power Export</span>
              <span className="text-[10px] text-slate-500">Sell surplus solar generation back to utility</span>
            </div>
            <button
              type="button"
              onClick={() => setGridFeedInEnabled(!gridFeedInEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                gridFeedInEnabled ? "bg-[#10b981]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  gridFeedInEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 bg-white text-slate-700 font-medium hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-2 rounded-xl text-white font-medium transition-all ${
              saved ? "bg-emerald-600" : "bg-[#10b981] hover:bg-[#e06014]"
            }`}
          >
            {saved ? "Updated!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
