"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Menu,
  Sun,
  MessageSquare,
  BookOpen,
  Inbox,
  User,
  ChevronDown,
  LogOut,
  Shield,
  Settings,
  ArrowLeft,
} from "lucide-react";

interface SolisTopNavProps {
  onOpenMobileMenu: () => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

export default function SolisTopNav({ onOpenMobileMenu, canGoBack, onGoBack }: SolisTopNavProps) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState("Light");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-transparent px-4 sm:px-6 flex items-center justify-between z-20 select-none">
      {/* Left: Power2Go Official Brand Logo & Go Back Button */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger menu (visible on phone/tablet) */}
        <div className="flex items-center md:hidden">
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Global Go Back Button */}
        {canGoBack && onGoBack && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white/90 text-slate-700 hover:text-slate-900 hover:bg-white active:scale-95 transition-all text-xs font-semibold shadow-2xs mr-1"
            title="Go Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <div className="flex items-center">
          <Image
            src="/power2go-logo.png"
            alt="P2G-CLOUD - Power Your Future With Clean Energy"
            width={280}
            height={68}
            className="h-9 sm:h-10 w-auto object-contain"
            priority
            unoptimized
          />
          <span className="hidden lg:inline-block ml-2 px-2 py-0.5 text-[11px] font-bold tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
            P2G-CLOUD
          </span>
        </div>
      </div>

      {/* Right Controls matching SolisCloud Screenshot */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 ml-auto">
        {/* Theme Pill Button: "Light ∨" */}
        <div className="relative">
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-gray-200/90 bg-white text-xs text-slate-700 hover:border-gray-300 shadow-2xs transition-colors"
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-normal">{selectedTheme}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
          </button>

          {isThemeOpen && (
            <div className="absolute right-0 mt-1.5 w-28 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-xs z-30">
              <button
                onClick={() => {
                  setSelectedTheme("Light");
                  setIsThemeOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 flex items-center gap-2 ${
                  selectedTheme === "Light"
                    ? "text-[#f37021] font-medium bg-orange-50/50"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
            </div>
          )}
        </div>

        {/* Message / Chat Bubble Icon with lines */}
        <button
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-white/80 transition-colors"
          title="Messages"
          onClick={() => alert("No new messages.")}
        >
          <MessageSquare className="w-4 h-4 text-slate-600" />
        </button>

        {/* Book / Help Guide Icon with Red Notification Dot */}
        <button
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-white/80 transition-colors relative"
          title="User Manual & Documentation"
          onClick={() =>
            alert("P2G-CLOUD User Guide & System Documentation")
          }
        >
          <BookOpen className="w-4 h-4 text-slate-600" />
          {/* Solis red notification dot at top right */}
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Tray / Download / Inbox Icon */}
        <button
          className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full hover:bg-white/80 transition-colors"
          title="Downloads & Exports"
          onClick={() => alert("Export tray is empty.")}
        >
          <Inbox className="w-4 h-4 text-slate-600" />
        </button>

        {/* User Account Avatar & Name: "Qasim Moo... ∨" */}
        <div className="relative pl-1">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full hover:bg-white/80 transition-colors"
          >
            {/* Gray avatar circle with user outline */}
            <div className="w-7 h-7 rounded-full bg-slate-200/80 border border-slate-300/60 flex items-center justify-center text-slate-600">
              <User className="w-3.5 h-3.5" />
            </div>
            {/* Truncated Name matching screenshot */}
            <span className="text-xs font-normal text-slate-700 hidden sm:inline max-w-[90px] truncate">
              Qasim Moo...
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-2 text-xs z-30 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-gray-100">
                <p className="font-semibold text-slate-800">Qasim Moosvi</p>
                <p className="text-[11px] text-slate-400 truncate">
                  qasim.moosvi@gmail.com
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600 font-medium">
                  <Shield className="w-3 h-3" />
                  <span>Administrator</span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full text-left px-3.5 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full text-left px-3.5 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
