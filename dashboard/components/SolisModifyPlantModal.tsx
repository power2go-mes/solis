"use client";

import React, { useState, useEffect } from "react";
import { X, Check, Save, Edit3, Building, MapPin, Zap, Battery, DollarSign } from "lucide-react";

interface SolisModifyPlantModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantInfo: any;
  onSave: (updatedInfo: any) => void;
}

export default function SolisModifyPlantModal({
  isOpen,
  onClose,
  plantInfo,
  onSave,
}: SolisModifyPlantModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    capacityKwp: "",
    modulesCount: "",
    modulePowerW: "",
    batteryCapacityKwh: "",
    plantType: "",
    owner: "",
    email: "",
    currency: "PKR",
    feedInTariff: "0",
    purchaseTariff: "45",
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (plantInfo) {
      setFormData({
        name: plantInfo.name || "Towfiq chinoy",
        address: plantInfo.address || "Karachi, Sindh, Pakistan",
        capacityKwp: String(plantInfo.capacityKwp || 29.67),
        modulesCount: String(plantInfo.modulesCount || 46),
        modulePowerW: String(plantInfo.modulePowerW || 645),
        batteryCapacityKwh: String(plantInfo.batteryCapacityKwh || 52),
        plantType: plantInfo.plantType || "Residential Plant",
        owner: plantInfo.owner || "Towfiq chinoy",
        email: plantInfo.email || "qasim.moosvi@gmail.com",
        currency: plantInfo.currency || "PKR",
        feedInTariff: String(plantInfo.tariff?.feedInTariffPrice?.replace(/[^0-9.]/g, "") || "0"),
        purchaseTariff: "45",
      });
    }
  }, [plantInfo, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...plantInfo,
      name: formData.name,
      address: formData.address,
      capacityKwp: parseFloat(formData.capacityKwp) || plantInfo.capacityKwp,
      modulesCount: parseInt(formData.modulesCount) || plantInfo.modulesCount,
      modulePowerW: parseInt(formData.modulePowerW) || plantInfo.modulePowerW,
      batteryCapacityKwh: parseFloat(formData.batteryCapacityKwh) || plantInfo.batteryCapacityKwh,
      plantType: formData.plantType,
      owner: formData.owner,
      email: formData.email,
      currency: formData.currency,
      tariff: {
        ...plantInfo?.tariff,
        feedInTariffPrice: `${formData.feedInTariff}${formData.currency}/kWh`,
      },
    };

    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-gray-100 bg-[#fafbfc]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#f37021]">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Modify Plant Information</h3>
              <p className="text-xs text-slate-500">Update SolisCloud installation parameters and contact metadata</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Basic Section */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b pb-1.5">
              <Building className="w-3.5 h-3.5 text-[#f37021]" />
              <span>Basic Plant Attributes</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Plant Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Plant Type</label>
                <select
                  value={formData.plantType}
                  onChange={(e) => setFormData({ ...formData, plantType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                >
                  <option value="Residential Plant">Residential Plant</option>
                  <option value="Commercial & Industrial">Commercial & Industrial</option>
                  <option value="Ground Mounted Utility">Ground Mounted Utility</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-1 font-medium">Plant Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Technical Section */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b pb-1.5">
              <Zap className="w-3.5 h-3.5 text-[#f37021]" />
              <span>Solar & Storage Technical Sizing</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">PV Capacity (kWp)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.capacityKwp}
                  onChange={(e) => setFormData({ ...formData, capacityKwp: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Number of Modules</label>
                <input
                  type="number"
                  value={formData.modulesCount}
                  onChange={(e) => setFormData({ ...formData, modulesCount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Module Power (W)</label>
                <input
                  type="number"
                  value={formData.modulePowerW}
                  onChange={(e) => setFormData({ ...formData, modulePowerW: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Battery Capacity (kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.batteryCapacityKwh}
                  onChange={(e) => setFormData({ ...formData, batteryCapacityKwh: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Feed-in Tariff (PKR/kWh)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.feedInTariff}
                  onChange={(e) => setFormData({ ...formData, feedInTariff: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Currency</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b pb-1.5">
              <span>Owner & Contact Credentials</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Owner Name</label>
                <input
                  type="text"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Contact Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-slate-700 hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-lg font-medium text-white transition-all flex items-center gap-1.5 ${
                savedSuccess ? "bg-emerald-600" : "bg-[#f37021] hover:bg-[#e06014]"
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
