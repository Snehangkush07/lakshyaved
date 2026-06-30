import React from 'react';

export default function RecommendationList({ recs = [] }) {
    if (!recs || recs.length === 0) return null;

    const impactColors = {
        high: 'text-red-400 bg-red-900/20 border-red-900/30',
        medium: 'text-amber-400 bg-amber-900/20 border-amber-900/30',
        low: 'text-[#13ec6d] bg-emerald-900/20 border-emerald-900/30'
    };
    const categoryIcons = {
        skill: '🎯',
        resume: '📄',
        career: '🚀',
        experience: '💼'
    };

    return (
        <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-[#1e293b]">
            <h3 className="text-lg font-bold text-white mb-2">Personalized Recommendations</h3>
            <p className="text-slate-400 text-xs mb-6">Actionable insights based on your profile analysis.</p>
            <div className="space-y-4">
                {recs.map(r => (
                    <div key={r.id} className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 hover:border-slate-600 transition-colors">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">{categoryIcons[r.category] || '💡'}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="text-white font-bold text-sm">{r.title}</h4>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${impactColors[r.impact]}`}>
                                        {r.impact}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-xs leading-relaxed mb-2">{r.text}</p>
                                <p className="text-slate-300 text-xs font-medium italic">→ {r.actionable}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
