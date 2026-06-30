import React from 'react';
import { formatINR } from '../../core/utils/format';

export default function CareerPathGraph({ transitions = null }) {
    if (!transitions || !transitions.nextRoles || transitions.nextRoles.length === 0) return null;

    const difficultyColors = {
        low: 'text-[#13ec6d] border-emerald-800',
        medium: 'text-amber-400 border-amber-800',
        high: 'text-red-400 border-red-800'
    };
    const demandBadge = {
        high: '🔥',
        medium: '📊',
        low: '📉',
        emerging: '🚀'
    };

    return (
        <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-[#1e293b]">
            <h3 className="text-lg font-bold text-white mb-1">Career Path Graph</h3>
            <p className="text-slate-400 text-xs mb-6">Where you can go next from {transitions.currentRole}.</p>
            <div className="space-y-3">
                {transitions.nextRoles.map(t => (
                    <div key={t.roleId} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 hover:border-slate-600 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm">{demandBadge[t.demandLevel] || '📊'}</span>
                                <h4 className="text-white font-bold text-sm">{t.roleName}</h4>
                                <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded font-medium">{t.category}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${difficultyColors[t.difficulty] || 'text-slate-400'}`}>{t.difficulty}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase">Match</p>
                                <p className="text-sm font-bold text-white">{t.matchPercent}%</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase">Skills Gap</p>
                                <p className="text-sm font-bold text-white">{t.needToLearn.length} to learn</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] text-slate-500 uppercase">Salary Δ</p>
                                <p className={`text-sm font-bold ${t.salaryGain >= 0 ? 'text-[#13ec6d]' : 'text-red-400'}`}>
                                    {t.salaryGain >= 0 ? '+' : ''}{formatINR(t.salaryGain)}
                                </p>
                            </div>
                        </div>
                        {t.needToLearn.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {t.needToLearn.map(s => (
                                    <span key={s} className="text-[9px] px-1.5 py-0.5 bg-red-900/20 text-red-400 rounded border border-red-900/30 font-medium">{s}</span>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-slate-500 italic">{t.verdict}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
