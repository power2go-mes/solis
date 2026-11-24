"use client";

import React, { useState } from "react";
import { Settings, Download, Calendar, ShieldCheck, CheckCircle2, AlertCircle, FileText, Loader2, Building2, ThermometerSun, Activity, FileSpreadsheet, BatteryCharging } from "lucide-react";

interface PlantOption {
  id: string;
  name: string;
  capacityKwp: number;
  location: string;
}

const AUTHORIZED_PLANTS: PlantOption[] = [
  { id: "1298491919450797504", name: "Menu Karachi Office", capacityKwp: 80.0, location: "Karachi, Pakistan" },
  { id: "1298491919450873747", name: "36 Chenab", capacityKwp: 25.155, location: "Lahore, Pakistan" },
  { id: "1298491919451014032", name: "Towfiq chinoy", capacityKwp: 29.67, location: "Karachi, Pakistan" },
  { id: "1298491919450958553", name: "OPL Residence", capacityKwp: 55.5, location: "Gharo, Pakistan" },
  { id: "1298491919450740581", name: "P2G 50KW", capacityKwp: 32.0, location: "Karachi, Pakistan" },
  { id: "1298491919450840394", name: "P2G 1ST 6kw", capacityKwp: 20.0, location: "Karachi, Pakistan" },
  { id: "1298491919450851319", name: "P2G 20kw", capacityKwp: 18.0, location: "Karachi, Pakistan" },
  { id: "1298491919450734544", name: "P2G 15KW", capacityKwp: 20.0, location: "Karachi, Pakistan" },
];

export default function SolisSettingsPage() {
  const [selectedPlantId, setSelectedPlantId] = useState<string>("1298491919450797504");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isExportingTemp, setIsExportingTemp] = useState<boolean>(false);
  const [isExportingTempExcel, setIsExportingTempExcel] = useState<boolean>(false);
  const [isExportingBatteryTemp, setIsExportingBatteryTemp] = useState<boolean>(false);
  const [isExportingBatteryExcel, setIsExportingBatteryExcel] = useState<boolean>(false);
  const [isExportingForensic, setIsExportingForensic] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedPlant = AUTHORIZED_PLANTS.find((p) => p.id === selectedPlantId) || AUTHORIZED_PLANTS[0];

  const handleExportDayOneReport = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-day-one?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export report`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `P2G_${selectedPlant.name.replace(/\s+/g, "_")}_DayOne_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported compulsory Day-One report for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Export error:", err);
      setExportError(err.message || "Failed to download day-one report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTemperatureReport = async () => {
    setIsExportingTemp(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-temperature?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export temperature report`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPlant.name.replace(/\s+/g, "_")}_Temperature_History_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported full Temperature History & Graph for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Temperature export error:", err);
      setExportError(err.message || "Failed to download temperature report.");
    } finally {
      setIsExportingTemp(false);
    }
  };

  const handleExportTemperatureExcel = async () => {
    setIsExportingTempExcel(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-temperature-excel?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export temperature Excel`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPlant.name.replace(/\s+/g, "_")}_Temperature_History_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported Temperature Data Excel (.xlsx) for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Temperature Excel export error:", err);
      setExportError(err.message || "Failed to download temperature Excel file.");
    } finally {
      setIsExportingTempExcel(false);
    }
  };

  const handleExportBatteryTemperatureReport = async () => {
    setIsExportingBatteryTemp(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-battery-temperature?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export battery temperature report`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPlant.name.replace(/\s+/g, "_")}_Battery_Temperature_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported Battery Temperature Report (PDF) for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Battery temperature export error:", err);
      setExportError(err.message || "Failed to download battery temperature report.");
    } finally {
      setIsExportingBatteryTemp(false);
    }
  };

  const handleExportBatteryTemperatureExcel = async () => {
    setIsExportingBatteryExcel(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-battery-temperature-excel?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export battery temperature Excel`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPlant.name.replace(/\s+/g, "_")}_Battery_Temperature_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported Battery Temperature Matrix (Excel) for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Battery temperature Excel export error:", err);
      setExportError(err.message || "Failed to download battery temperature Excel file.");
    } finally {
      setIsExportingBatteryExcel(false);
    }
  };

  const handleExportForensicAuditReport = async () => {
    setIsExportingForensic(true);
    setExportSuccess(null);
    setExportError(null);

    try {
      const response = await fetch(`/api/reports/export-forensic-audit?plantId=${encodeURIComponent(selectedPlantId)}`);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${response.status}: Failed to export forensic audit report`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPlant.name.replace(/\s+/g, "_")}_Plant_Technical_And_Cell_Forensic_Audit.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setExportSuccess(`Successfully exported Technical & Cell Forensic Audit for ${selectedPlant.name}!`);
    } catch (err: any) {
      console.error("Forensic audit export error:", err);
      setExportError(err.message || "Failed to download forensic audit report.");
    } finally {
      setIsExportingForensic(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">System Settings & Fleet Administration</h1>
            <p className="text-xs text-slate-500">Configure P2G-Cloud parameters and export lifetime plant audits</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
          <ShieldCheck className="w-4 h-4" />
          <span>Fleet Admin Authorized</span>
        </div>
      </div>

      {/* Main Export Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Compulsory Plant Day-One Audit Export</span>
          </div>
          <span className="text-[11px] font-medium px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
            Compulsory: Day One to Present
          </span>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-slate-600 leading-relaxed">
            Select an authorized plant to generate and download a comprehensive, full-history PDF report.
            By engineering policy, this report is <strong>compulsorily exported from Day One</strong> (the first certified commissioning date) up to today without data truncation.
          </p>

          {/* Plant Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Plant for Report Export
              </label>
              <div className="relative">
                <select
                  value={selectedPlantId}
                  onChange={(e) => setSelectedPlantId(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {AUTHORIZED_PLANTS.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.name} ({plant.capacityKwp} kWp • {plant.location})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Selected Plant Info Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Selected Plant:</span>
                <span className="font-bold text-slate-800">{selectedPlant.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Capacity / Location:</span>
                <span className="font-medium text-slate-700">{selectedPlant.capacityKwp} kWp • {selectedPlant.location}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Export Horizon:</span>
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Compulsory From Day One
                </span>
              </div>
            </div>
          </div>

          {/* Status feedback alerts */}
          {exportSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {exportError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-800 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-center gap-3">
            <button
              onClick={handleExportDayOneReport}
              disabled={isExporting || isExportingTemp || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                isExporting
                  ? "bg-emerald-400 text-white cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20"
              }`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Day-One Audit...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Report (From Day One)</span>
                </>
              )}
            </button>

            {/* Inverter Temperature Reports */}
            <button
              onClick={handleExportTemperatureReport}
              disabled={isExporting || isExportingTemp || isExportingTempExcel || isExportingBatteryTemp || isExportingBatteryExcel || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border transition-all ${
                isExportingTemp
                  ? "bg-amber-100 text-amber-700 border-amber-300 cursor-not-allowed"
                  : "bg-white hover:bg-amber-50 active:scale-98 text-amber-700 border-amber-300 shadow-amber-500/10"
              }`}
            >
              {isExportingTemp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <span>Generating Temp Audit & Chart...</span>
                </>
              ) : (
                <>
                  <ThermometerSun className="w-4 h-4 text-amber-600" />
                  <span>Inverter Temperature Report (PDF)</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportTemperatureExcel}
              disabled={isExporting || isExportingTemp || isExportingTempExcel || isExportingBatteryTemp || isExportingBatteryExcel || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border transition-all ${
                isExportingTempExcel
                  ? "bg-teal-100 text-teal-700 border-teal-300 cursor-not-allowed"
                  : "bg-white hover:bg-teal-50 active:scale-98 text-teal-700 border-teal-300 shadow-teal-500/10"
              }`}
            >
              {isExportingTempExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Exporting Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                  <span>Inverter Temperature Report (Excel)</span>
                </>
              )}
            </button>

            {/* Battery Temperature Reports */}
            <button
              onClick={handleExportBatteryTemperatureReport}
              disabled={isExporting || isExportingTemp || isExportingTempExcel || isExportingBatteryTemp || isExportingBatteryExcel || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border transition-all ${
                isExportingBatteryTemp
                  ? "bg-purple-100 text-purple-700 border-purple-300 cursor-not-allowed"
                  : "bg-white hover:bg-purple-50 active:scale-98 text-purple-700 border-purple-300 shadow-purple-500/10"
              }`}
            >
              {isExportingBatteryTemp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span>Compiling Battery Thermals...</span>
                </>
              ) : (
                <>
                  <BatteryCharging className="w-4 h-4 text-purple-600" />
                  <span>Battery Temperature Report (PDF)</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportBatteryTemperatureExcel}
              disabled={isExporting || isExportingTemp || isExportingTempExcel || isExportingBatteryTemp || isExportingBatteryExcel || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border transition-all ${
                isExportingBatteryExcel
                  ? "bg-violet-100 text-violet-700 border-violet-300 cursor-not-allowed"
                  : "bg-white hover:bg-violet-50 active:scale-98 text-violet-700 border-violet-300 shadow-violet-500/10"
              }`}
            >
              {isExportingBatteryExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  <span>Exporting Battery Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-violet-600" />
                  <span>Battery Temperature Report (Excel)</span>
                </>
              )}
            </button>

            {/* Full Technical & Forensic Audit */}
            <button
              onClick={handleExportForensicAuditReport}
              disabled={isExporting || isExportingTemp || isExportingTempExcel || isExportingBatteryTemp || isExportingBatteryExcel || isExportingForensic}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm border transition-all ${
                isExportingForensic
                  ? "bg-blue-100 text-blue-700 border-blue-300 cursor-not-allowed"
                  : "bg-white hover:bg-blue-50 active:scale-98 text-blue-700 border-blue-300 shadow-blue-500/10"
              }`}
            >
              {isExportingForensic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Compiling Technical & Cell Audit...</span>
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>Export Technical & Cell Forensic Audit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
