import React from 'react';

export default function ReadinessMeter({ score, breakdown, confidence }) {
    // 0 - 100 score
    const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

    const confKey = (confidence || (clampedScore >= 75 ? 'high' : clampedScore >= 50 ? 'medium' : 'low')).toLowerCase();

    const confidenceLabel = {
        low: 'Early estimate',
        medium: 'Partial data',
        high: 'High confidence',
    }[confKey] || 'Early estimate';

    const confidenceColor = {
        low: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        medium: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
        high: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    }[confKey] || 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';

    let progressClass = 'bg-red-500';
    let textClass = 'text-red-500';

    if (clampedScore >= 75) {
        progressClass = 'bg-[#13ec6d]';
        textClass = 'text-[#13ec6d]';
    } else if (clampedScore >= 50) {
        progressClass = 'bg-yellow-500';
        textClass = 'text-yellow-500';
    }

    return (
        <div className="flex flex-col gap-2 p-4 rounded-xl border border-slate-700/50 bg-[#121a2a]/80 shadow-lg relative group">
            <div className="flex justify-between items-end mb-1">
                <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Readiness Score</h4>
                    <p className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block border ${confidenceColor}`}>
                        {confidenceLabel}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`text-3xl font-black ${textClass} drop-shadow-md leading-none`}>{clampedScore}</span>
                    <span className="text-slate-500 text-sm font-bold ml-1">/100</span>
                </div>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                <div
                    className={`h-full ${progressClass} transition-all duration-1000 ease-out`}
                    style={{ width: `${clampedScore}%` }}
                />
            </div>

            {breakdown && breakdown.length > 0 && (
                <div className="mt-3 py-2 border-t border-slate-700/50">
                    <ul className="text-xs text-slate-400 space-y-1">
                        {breakdown.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                                <span>{item.label}</span>
                                <span className={item.highlight ? 'text-white font-medium' : ''}>{item.value}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
