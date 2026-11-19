import React from "react";

// 3D Isometric Solar Panel Illustration matching SolisCard 1
export function SolarPanelIllustration({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Soft ground drop shadow */}
        <ellipse cx="70" cy="98" rx="55" ry="16" fill="rgba(203, 213, 225, 0.45)" />
        <linearGradient id="panelGrad1" x1="20" y1="30" x2="100" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="45%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="frameGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="standGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>

      {/* Stand legs */}
      <path d="M45 75 L45 92 L50 94 L50 78 Z" fill="url(#standGrad)" opacity="0.9" />
      <path d="M85 75 L85 92 L90 94 L90 78 Z" fill="url(#standGrad)" opacity="0.9" />
      <path d="M38 90 L98 90 L98 94 L38 94 Z" fill="#94a3b8" />

      {/* Solar Panel Base/Backing */}
      <path
        d="M25 50 L88 20 L122 55 L58 88 Z"
        fill="#1e293b"
      />
      {/* Aluminum Frame */}
      <path
        d="M23 48 L88 17 L124 53 L58 87 Z"
        stroke="url(#frameGrad)"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />

      {/* Photovoltaic Cells Surface */}
      <path
        d="M26 49 L87 21 L120 54 L59 85 Z"
        fill="url(#panelGrad1)"
      />

      {/* Grid Lines on PV Panel (Isometric Grid) */}
      {/* Longitudinal busbars */}
      <path d="M46 39 L79 74" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />
      <path d="M67 30 L100 64" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" />

      {/* Cross grid lines */}
      <path d="M36 44 L98 15" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <path d="M42 53 L105 23" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <path d="M48 62 L111 32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <path d="M54 71 L116 41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

      {/* Glossy Reflection Highlight */}
      <path
        d="M30 47 L75 26 L65 55 L25 50 Z"
        fill="white"
        opacity="0.18"
      />

      {/* Sun glow dot */}
      <circle cx="108" cy="22" r="10" fill="#fbbf24" opacity="0.25" />
      <circle cx="108" cy="22" r="5" fill="#f59e0b" opacity="0.85" />
    </svg>
  );
}

// 3D Isometric Daily Battery Energy Illustration matching SolisCard 2
export function DailyBatteryIllustration({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ellipse cx="70" cy="98" rx="55" ry="15" fill="rgba(203, 213, 225, 0.45)" />
        <linearGradient id="calGrad" x1="30" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="batGradGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Base platform */}
      <path d="M25 80 L70 98 L115 80 L70 65 Z" fill="#334155" opacity="0.12" />

      {/* Isometric Calendar Sheet */}
      <path d="M38 45 L78 28 L108 48 L68 68 Z" fill="url(#calGrad)" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M38 45 L68 68 L68 76 L38 53 Z" fill="#94a3b8" />
      <path d="M68 68 L108 48 L108 56 L68 76 Z" fill="#cbd5e1" />

      {/* Calendar Top Orange Bar */}
      <path d="M38 45 L78 28 L86 33 L46 51 Z" fill="#f97316" />
      <path d="M46 51 L86 33 L86 36 L46 54 Z" fill="#ea580c" />

      {/* Calendar Number "1" on page */}
      <text
        x="72"
        y="58"
        fill="#0284c7"
        fontSize="17"
        fontWeight="800"
        fontFamily="sans-serif"
        textAnchor="middle"
        transform="rotate(-12, 72, 58) skewX(-20)"
      >
        1
      </text>

      {/* 3D Green Battery Unit in foreground */}
      <g transform="translate(18, 12)">
        {/* Battery Top Terminal */}
        <ellipse cx="62" cy="46" rx="4" ry="2" fill="#64748b" />
        {/* Battery Cylinder/Capsule Body */}
        <path d="M54 50 C54 47 70 47 70 50 L70 75 C70 78 54 78 54 75 Z" fill="url(#batGradGreen)" />
        <ellipse cx="62" cy="50" rx="8" ry="3.5" fill="#6ee7b7" />
        <ellipse cx="62" cy="75" rx="8" ry="3.5" fill="#047857" opacity="0.4" />
        {/* Charging Lightning Bolt */}
        <path
          d="M63 56 L59 64 L62 64 L60 71 L66 62 L63 62 Z"
          fill="#fef08a"
          stroke="#ca8a04"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}

// 3D Isometric Monthly Battery Energy Illustration matching SolisCard 3
export function MonthlyBatteryIllustration({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ellipse cx="70" cy="98" rx="55" ry="15" fill="rgba(203, 213, 225, 0.45)" />
        <linearGradient id="calMonthGrad" x1="30" y1="20" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
        <linearGradient id="batBlueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Isometric Desk / Stand */}
      <path d="M26 80 L70 98 L114 80 L70 65 Z" fill="#334155" opacity="0.12" />

      {/* Multiple Stacked Calendar Pages (representing month) */}
      <path d="M34 50 L74 33 L104 53 L64 73 Z" fill="#e2e8f0" />
      <path d="M36 47 L76 30 L106 50 L66 70 Z" fill="#f1f5f9" />
      <path d="M38 44 L78 27 L108 47 L68 67 Z" fill="url(#calMonthGrad)" stroke="#cbd5e1" strokeWidth="1.4" />
      <path d="M38 44 L68 67 L68 73 L38 50 Z" fill="#94a3b8" />
      <path d="M68 67 L108 47 L108 53 L68 73 Z" fill="#cbd5e1" />

      {/* Blue Header Bar on Calendar */}
      <path d="M38 44 L78 27 L86 32 L46 50 Z" fill="#0284c7" />
      <path d="M46 50 L86 32 L86 35 L46 53 Z" fill="#0369a1" />

      {/* Calendar Grid Representation */}
      <g opacity="0.75" transform="rotate(-12, 72, 54) skewX(-20)">
        <rect x="52" y="44" width="4" height="3" rx="0.5" fill="#38bdf8" />
        <rect x="58" y="44" width="4" height="3" rx="0.5" fill="#38bdf8" />
        <rect x="64" y="44" width="4" height="3" rx="0.5" fill="#38bdf8" />
        <rect x="70" y="44" width="4" height="3" rx="0.5" fill="#0284c7" />
        <rect x="52" y="50" width="4" height="3" rx="0.5" fill="#38bdf8" />
        <rect x="58" y="50" width="4" height="3" rx="0.5" fill="#0284c7" />
        <rect x="64" y="50" width="4" height="3" rx="0.5" fill="#38bdf8" />
        <rect x="70" y="50" width="4" height="3" rx="0.5" fill="#38bdf8" />
      </g>

      {/* 3D Battery Unit in front with charge badge */}
      <g transform="translate(24, 15)">
        <ellipse cx="60" cy="46" rx="4" ry="2" fill="#64748b" />
        <path d="M52 50 C52 47 68 47 68 50 L68 75 C68 78 52 78 52 75 Z" fill="url(#batBlueGrad)" />
        <ellipse cx="60" cy="50" rx="8" ry="3.5" fill="#7dd3fc" />
        {/* Green Energy Leaf Badge */}
        <circle cx="68" cy="68" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M66 69 C66 65 71 65 71 68 C71 71 67 71 66 69 Z" fill="white" />
      </g>
    </svg>
  );
}

// 3D Isometric Lifetime Energy Illustration matching SolisCard 4
export function LifetimeBatteryIllustration({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <ellipse cx="70" cy="98" rx="55" ry="15" fill="rgba(203, 213, 225, 0.45)" />
        <linearGradient id="barGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="barYellow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="barBlue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {/* Isometric Base Plate */}
      <path d="M25 82 L70 102 L115 82 L70 65 Z" fill="#1e293b" opacity="0.15" />
      <path d="M28 80 L70 98 L112 80 L70 67 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />

      {/* Bar 1 (Green - Low) */}
      <path d="M42 66 L52 61 L52 78 L42 83 Z" fill="#047857" />
      <path d="M52 61 L58 64 L58 81 L52 78 Z" fill="#059669" />
      <path d="M42 66 L48 63 L58 64 L52 61 Z" fill="#34d399" />

      {/* Bar 2 (Yellow - Medium) */}
      <path d="M56 52 L66 47 L66 75 L56 80 Z" fill="#b45309" />
      <path d="M66 47 L72 50 L72 78 L66 75 Z" fill="#d97706" />
      <path d="M56 52 L62 49 L72 50 L66 47 Z" fill="#fde047" />

      {/* Bar 3 (Blue - Tallest) */}
      <path d="M70 38 L80 33 L80 72 L70 77 Z" fill="#0369a1" />
      <path d="M80 33 L86 36 L86 75 L80 72 Z" fill="#0284c7" />
      <path d="M70 38 L76 35 L86 36 L80 33 Z" fill="#7dd3fc" />

      {/* Trend Arrow upward */}
      <path
        d="M44 60 Q 64 36 88 24"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M84 22 L91 23 L89 30 Z" fill="#10b981" />

      {/* Document / report sheet standing behind */}
      <g transform="translate(18, 5) opacity(0.85)">
        <path d="M70 30 L88 20 L102 32 L84 42 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
        <line x1="75" y1="31" x2="88" y2="24" stroke="#94a3b8" strokeWidth="1" />
        <line x1="77" y1="35" x2="92" y2="27" stroke="#94a3b8" strokeWidth="1" />
      </g>
    </svg>
  );
}
