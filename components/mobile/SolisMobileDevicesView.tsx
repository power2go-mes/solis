"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Settings,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";
import SolisMobileDeviceSettingsModal from "./SolisMobileDeviceSettingsModal";

interface SolisMobileDevicesViewProps {
  devices: any;
  plantName?: string;
  plantId?: string;
  onSelectInverter?: (sn: string) => void;
}

export default function SolisMobileDevicesView({
  devices,
  plantName = "P2G 50KW",
  plantId = "3212F1",
  onSelectInverter,
}: SolisMobileDevicesViewProps) {
  const [filterType, setFilterType] = useState<"All" | "Inverter" | "Battery" | "Datalogger">("All");
  const [isGridMode, setIsGridMode] = useState<boolean>(true);
  const [selectedDeviceForSettings, setSelectedDeviceForSettings] = useState<any | null>(null);

  const inverters = devices?.inverters || [];
  const batteries = devices?.batteries || [];
  const dataloggers = devices?.dataloggers || [];
  const meters = devices?.meters || [];

  // Build full device items list
  const allDevices: any[] = [];

  // Inverters
  inverters.forEach((inv: any, idx: number) => {
    allDevices.push({
      id: `inv-${idx}`,
      type: "Inverter",
      name: "Inverter",
      sn: inv.sn || "1053050255210107",
      status: idx === 0 && plantName.includes("50KW") ? "Warning" : "Online",
      image: "/images/solis_inverter_card.jpg",
      ratedPowerKw: inv.ratedPowerKw || 50,
    });
  });

  // Batteries
  if (plantName.includes("50KW")) {
    allDevices.push({
      id: "bat-50k-1",
      type: "Battery",
      name: "Battery",
      sn: "1053050255210107BAT0",
      status: "Online",
      image: "/images/solis_battery_card.jpg",
      capacityKwh: 26,
    });
    allDevices.push({
      id: "bat-50k-2",
      type: "Battery",
      name: "Battery",
      sn: "1053050255210107BAT01",
      status: "Online",
      image: "/images/solis_battery_card.jpg",
      capacityKwh: 26,
    });
  } else {
    batteries.forEach((bat: any, idx: number) => {
      allDevices.push({
        id: `bat-${idx}`,
        type: "Battery",
        name: "Battery",
        sn: bat.sn || `${inverters[0]?.sn || "1053050255210107"}BAT0${idx + 1}`,
        status: "Online",
        image: "/images/solis_battery_card.jpg",
        capacityKwh: 52,
      });
    });

    // If batteries list is empty but plant has battery, add default card
    if (batteries.length === 0 && !plantName.includes("20KW") && !plantName.includes("15KW")) {
      allDevices.push({
        id: "bat-def-1",
        type: "Battery",
        name: "Battery",
        sn: `${inverters[0]?.sn || "1053050255210107"}BAT01`,
        status: "Online",
        image: "/images/solis_battery_card.jpg",
        capacityKwh: 52,
      });
    }
  }

  // Dataloggers
  dataloggers.forEach((dl: any, idx: number) => {
    allDevices.push({
      id: `dl-${idx}`,
      type: "Datalogger",
      name: "Datalogger",
      sn: dl.sn || "7A12551308F022F8",
      status: "Online",
      image: "/images/solis_datalogger_card.jpg",
    });
  });

  // Smart Meters
  allDevices.push({
    id: "mtr-1",
    type: "Meter",
    name: "Meter",
    sn: `${inverters[0]?.sn || "1053050255210107"}MTR01`,
    status: "Online",
    image: "/images/solis_meter_card.jpg",
  });

  const searchParams = useSearchParams();
  const modalParam = searchParams.get("modal");
  const snParam = searchParams.get("sn");

  const displayedDevices = allDevices.filter((d) => {
    if (filterType === "All") return true;
    return d.type === filterType;
  });

  useEffect(() => {
    if (modalParam === "settings") {
      const match = allDevices.find((d) => snParam ? d.sn === snParam : d.type === "Inverter") || allDevices[0];
      if (match) setSelectedDeviceForSettings(match);
    }
  }, [modalParam, snParam]);

  const handleDeviceClick = (item: any) => {
    setSelectedDeviceForSettings(item);
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter Pills & Grid Toggle */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          {(["All", "Inverter", "Battery", "Datalogger"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterType(tab)}
              className={`px-3 py-1 rounded-full text-xs transition-all ${
                filterType === tab
                  ? "border border-orange-300 bg-orange-50/70 text-[#f37021] font-bold shadow-2xs"
                  : "border border-gray-100 bg-white text-slate-500 hover:bg-gray-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsGridMode(!isGridMode)}
          className="p-1.5 rounded-lg border border-gray-100 bg-white text-slate-600 hover:text-slate-900"
          title="Toggle Grid / List view"
        >
          {isGridMode ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Device Cards Grid (Exact 2-Col Solis Mobile Parity) */}
      <div className={isGridMode ? "grid grid-cols-2 gap-3" : "space-y-2.5"}>
        {displayedDevices.map((item) => (
          <div
            key={item.id}
            onClick={() => handleDeviceClick(item)}
            className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-3 flex flex-col justify-between relative hover:border-orange-300 transition-all cursor-pointer group active:scale-[0.99]"
          >
            {/* Top Right Settings Hexagon */}
            <div className="flex justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDeviceForSettings(item);
                }}
                className="text-slate-300 group-hover:text-[#f37021] p-0.5 transition-colors"
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Thumbnail Image */}
            <div className="py-2 flex items-center justify-center">
              <div className="w-24 h-24 relative">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    item.status === "Warning"
                      ? "bg-orange-50 text-[#f37021] border border-orange-200"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-xs font-bold text-slate-900">{item.name}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate mt-1">
                SN:{item.sn}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Floating + Add Device Button */}
      <div className="fixed bottom-20 right-4 z-40 pointer-events-auto">
        <button
          onClick={() => alert("Add Device wizard is authorized for Installer accounts.")}
          className="w-11 h-11 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-gray-50 active:scale-95 transition-transform"
          title="Add Device"
        >
          <Plus className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Device Settings Modal */}
      <SolisMobileDeviceSettingsModal
        device={selectedDeviceForSettings}
        isOpen={Boolean(selectedDeviceForSettings)}
        onClose={() => setSelectedDeviceForSettings(null)}
      />
    </div>
  );
}
