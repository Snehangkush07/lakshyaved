import React from 'react';

export default function LakshyavedLogo({ 
    size = 32, 
    showText = true, 
    showSubtitle = false, 
    className = '',
    textClassName = '',
    collapsed = false 
}) {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            {/* SVG Logo Icon Mark */}
            <div 
                className="relative shrink-0 flex items-center justify-center transition-transform hover:scale-105 duration-200"
                style={{ width: size, height: size }}
            >
                <svg 
                    viewBox="0 0 200 200" 
                    width="100%" 
                    height="100%" 
                    className="drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)]"
                >
                    <defs>
                        <linearGradient id="lvGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1a56db" />
                            <stop offset="45%" stopColor="#0284c7" />
                            <stop offset="85%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#13ec6d" />
                        </linearGradient>

                        <linearGradient id="lvFoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>

                    {/* Outer Rounded Square Container */}
                    <rect x="20" y="20" width="160" height="160" rx="44" fill="url(#lvGrad)" />

                    {/* Inner White Canvas Cutout */}
                    <path d="
                        M 54,42 
                        H 130 
                        C 142,42 152,50 154,62 
                        L 154,138 
                        C 154,148 146,156 136,156 
                        H 54 
                        C 44,156 36,148 36,138 
                        V 60 
                        C 36,50 44,42 54,42 Z
                    " fill="#ffffff" />

                    {/* Bar 1 (Shortest - Left) */}
                    <rect x="52" y="108" width="22" height="42" rx="4" fill="url(#lvGrad)" />

                    {/* Bar 2 (Medium - Middle) */}
                    <rect x="82" y="88" width="22" height="62" rx="4" fill="url(#lvGrad)" />

                    {/* Bar 3 & Upward Arrow (Right) */}
                    <rect x="112" y="68" width="22" height="82" rx="4" fill="url(#lvGrad)" />

                    {/* Upward Arrowhead Breaking Out of Top Right */}
                    <path d="
                        M 104,78 
                        L 156,26 
                        C 158,24 162,24 164,26 
                        L 174,36 
                        C 176,38 176,42 174,44 
                        L 122,96 
                        Z
                    " fill="url(#lvGrad)" />

                    {/* Arrow Tip Triangle */}
                    <path d="
                        M 130,22 
                        L 178,22 
                        C 182,22 184,24 184,28 
                        L 184,76 
                        L 156,48 
                        Z
                    " fill="url(#lvGrad)" />

                    {/* Fold Shadow Accent */}
                    <path d="
                        M 112,68 
                        L 132,48 
                        L 142,58 
                        L 122,78 
                        Z
                    " fill="url(#lvFoldGrad)" />
                </svg>
            </div>

            {/* Optional Typography */}
            {showText && !collapsed && (
                <div className="flex flex-col">
                    <span className={`font-black tracking-tight text-slate-900 dark:text-white leading-none ${textClassName || 'text-lg'}`}>
                        Lakshyaved
                    </span>
                    {showSubtitle && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#13ec6d] mt-1">
                            Career Skills Growth
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
