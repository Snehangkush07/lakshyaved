import React from 'react';
import { formatINR } from '../../core/utils/format';

export default function WhatIfScenarios({ scenarios = [] }) {
    if (!scenarios || scenarios.length === 0) return null;

    return (
        <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-[#1e293b]">
            <h3 className="text-lg font-bold text-white mb-2">What-If Scenarios</h3>
            <p className="text-slate-400 text-xs mb-6">Explore alternative career strategies based on your profile.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map(s => (
                    <div key={s.id} className={`rounded-xl p-5 border transition-all hover:scale-[1.02] ${
                        s.id === 'upskill' ? 'bg-emerald-900/10 border-emerald-800/30' :
                        s.id === 'pivot' ? 'bg-blue-900/10 border-blue-800/30' :
                        'bg-slate-900/50 border-slate-800'
                    }`}>
                        <div className="text-2xl mb-3">{s.emoji}</div>
                        <h4 className="text-white font-bold text-sm mb-1">{s.name}</h4>
                        <p className="text-slate-400 text-xs mb-4 leading-relaxed">{s.description}</p>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Match Rate</span>
                                <span className="text-white font-bold">{s.matchRate}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Year 5 Salary</span>
                                <span className="text-white font-bold">{formatINR(s.salaryY5)}</span>
                            </div>
                            {s.salaryDiff !== undefined && s.salaryDiff !== null && (
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Salary Diff</span>
                                    <span className={`font-bold ${s.salaryDiff > 0 ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                                        {s.salaryDiff > 0 ? '+' : ''}{formatINR(s.salaryDiff)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-500">Timeline</span>
                                <span className="text-slate-300 font-medium">{s.timeline}</span>
                            </div>
                        </div>
                        <p className={`mt-4 text-[10px] font-bold uppercase tracking-wider ${
                            s.id === 'upskill' ? 'text-emerald-400' :
                            s.id === 'pivot' ? 'text-blue-400' :
                            'text-slate-500'
                        }`}>{s.verdict}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
