import { useState, useEffect, useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { getAllRoles, findRoles } from '../../core/logic/dataStore';
import { getProfile, getResume } from '../../core/db/repo';
import LineChartMini from '../../ui/components/LineChartMini';
import SkillChip from '../../ui/components/SkillChip';
import ReadinessMeter from '../../ui/components/ReadinessMeter';
import { calculateReadiness } from '../../core/logic/readiness';
import { formatINR } from '../../core/utils/format';
import RoleAutocomplete from '../../ui/components/RoleAutocomplete';

// Helper functions defined outside the component for purity and React Compiler optimization
const calcSalaryProjection = (role) => {
    if (!role) return [];
    let projection = [];
    let curr = role.baseSalaryINR || 500000;
    let growth = role.growthRate || 0.1;
    for (let i = 0; i <= 5; i++) {
        projection.push(curr);
        curr *= (1 + growth);
    }
    return projection;
};

const calcOverlap = (role, profileSkills = []) => {
    if (!role) return { matched: [], missing: [], score: 0 };
    const req = role.requiredSkills.map(s => s.toLowerCase());
    const user = profileSkills.map(s => s.toLowerCase());

    const matched = role.requiredSkills.filter(s => user.includes(s.toLowerCase()));
    const missing = role.requiredSkills.filter(s => !user.includes(s.toLowerCase()));
    const score = req.length ? Math.round((matched.length / req.length) * 70) : 0;
    return { matched, missing, score };
};

export default function RoleCompare() {
    const rolesDataset = getAllRoles();

    const [profile, setProfile] = useState({ skills: [], interests: [] });
    const [resumeData, setResumeData] = useState(null);

    const [roleAId, setRoleAId] = useState(rolesDataset[0]?.roleId || '');
    const [roleBId, setRoleBId] = useState(rolesDataset[1]?.roleId || '');

    useEffect(() => {
        const loadUser = async () => {
            const p = await getProfile();
            if (p) setProfile({ skills: p.skills || [], interests: p.interests || [] });

            const r = await getResume();
            if (r) setResumeData(r);
        };
        loadUser();
    }, []);

    const roleA = useMemo(() => rolesDataset.find(r => r.roleId === roleAId) || null, [roleAId, rolesDataset]);
    const roleB = useMemo(() => rolesDataset.find(r => r.roleId === roleBId) || null, [roleBId, rolesDataset]);

    const projA = useMemo(() => calcSalaryProjection(roleA), [roleA]);
    const projB = useMemo(() => calcSalaryProjection(roleB), [roleB]);

    const overlapA = useMemo(() => calcOverlap(roleA, profile.skills), [roleA, profile.skills]);
    const overlapB = useMemo(() => calcOverlap(roleB, profile.skills), [roleB, profile.skills]);

    // Recommendation logic
    const recommendation = useMemo(() => {
        if (!roleA || !roleB) return "Select two roles to compare.";

        // basic interest matching
        const userInterests = profile.interests.map(i => i.toLowerCase());
        const aInterests = [roleA.category.toLowerCase(), ...roleA.tags.map(t => t.toLowerCase())];
        const bInterests = [roleB.category.toLowerCase(), ...roleB.tags.map(t => t.toLowerCase())];

        const aHits = aInterests.filter(i => userInterests.includes(i)).length;
        const bHits = bInterests.filter(i => userInterests.includes(i)).length;

        // total missing
        const aMissing = overlapA.missing.length;
        const bMissing = overlapB.missing.length;

        if (aHits > bHits && aMissing <= bMissing + 2) {
            return `Choose ${roleA.roleName} if you enjoy ${roleA.category} and want to leverage your interests in ${aInterests.find(i => userInterests.includes(i)) || roleA.tags[0]}. It aligns better with your stated passions.`;
        } else if (bHits > aHits && bMissing <= aMissing + 2) {
            return `Choose ${roleB.roleName} if you enjoy ${roleB.category}. Your interests strongly align with this field.`;
        } else if (aMissing < bMissing) {
            return `Choose ${roleA.roleName} for a faster transition—you only have ${aMissing} skill gaps compared to ${bMissing} for ${roleB.roleName}.`;
        } else if (bMissing < aMissing) {
            return `Choose ${roleB.roleName} for a faster transition. You already have a strong foundational match.`;
        } else {
            // Tie breaker via growth
            if ((roleA.growthRate || 0) > (roleB.growthRate || 0)) {
                return `${roleA.roleName} offers a slightly higher compounding growth trajectory. Consider it if long-term earning is a priority.`;
            } else {
                return `Both roles present a very similar transition difficulty and alignment. Go with your personal preference!`;
            }
        }
    }, [roleA, roleB, profile.interests, overlapA, overlapB]);

    const readinessA = useMemo(() => calculateReadiness({
        targetRole: roleAId,
        rolesDataset,
        profileSkills: profile.skills,
        profileInterests: profile.interests,
        resumeRawText: resumeData?.rawText || ''
    }) || { total: 0, breakdown: [] }, [roleAId, rolesDataset, profile, resumeData]);

    const readinessB = useMemo(() => calculateReadiness({
        targetRole: roleBId,
        rolesDataset,
        profileSkills: profile.skills,
        profileInterests: profile.interests,
        resumeRawText: resumeData?.rawText || ''
    }) || { total: 0, breakdown: [] }, [roleBId, rolesDataset, profile, resumeData]);



    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Role Compare</h2>
                <p className="text-slate-400 text-sm mt-1">Evaluate two career paths side by side.</p>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Role A */}
                <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-[#13ec6d]/20 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ec6d]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <h3 className="text-sm font-bold text-[#13ec6d] uppercase tracking-wider mb-4">Role A</h3>

                    <div className="mb-4">
                        <RoleAutocomplete
                            roles={rolesDataset}
                            selectedRoleId={roleAId}
                            onSelectRole={(role) => setRoleAId(role ? role.roleId : '')}
                            placeholder="Search Role A..."
                            searchFn={(query) => findRoles(query)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                        <div>
                            <span className="text-slate-500 block text-xs">Base Salary</span>
                            <span className="font-bold text-white">{roleA ? formatINR(roleA.baseSalaryINR || 0) : '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">Growth (YoY)</span>
                            <span className="font-bold text-[#13ec6d]">+{roleA ? Math.round(roleA.growthRate * 100) : 0}%</span>
                        </div>
                    </div>

                    <ReadinessMeter score={readinessA.total} breakdown={readinessA.breakdown} />
                </div>

                {/* Role B */}
                <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-blue-500/20 relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4">Role B</h3>

                    <div className="mb-4">
                        <RoleAutocomplete
                            roles={rolesDataset}
                            selectedRoleId={roleBId}
                            onSelectRole={(role) => setRoleBId(role ? role.roleId : '')}
                            placeholder="Search Role B..."
                            searchFn={(query) => findRoles(query)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                        <div>
                            <span className="text-slate-500 block text-xs">Base Salary</span>
                            <span className="font-bold text-white">{roleB ? formatINR(roleB.baseSalaryINR || 0) : '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block text-xs">Growth (YoY)</span>
                            <span className="font-bold text-blue-400">+{roleB ? Math.round(roleB.growthRate * 100) : 0}%</span>
                        </div>
                    </div>

                    <ReadinessMeter score={readinessB.total} breakdown={readinessB.breakdown} />
                </div>

            </div>

            {/* AI Recommendation */}
            <div className="bg-gradient-to-br from-[#121a2a] to-[#1a253a] rounded-2xl p-6 shadow-lg border border-slate-700/50 flex gap-4 items-start">
                <div className="bg-slate-800/50 rounded-full p-2.5 text-[#13ec6d] shrink-0">
                    <Share2 size={24} />
                </div>
                <div>
                    <h4 className="font-bold text-white text-lg">Analysis & Recommendation</h4>
                    <p className="text-slate-300 mt-2 leading-relaxed">{recommendation}</p>
                </div>
            </div>

            {/* Compensation Curve */}
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50">
                <h3 className="text-lg font-bold text-white mb-6">5-Year Compensation Trajectory</h3>
                <LineChartMini data1={projA} data2={projB} color1="#13ec6d" color2="#3b82f6" height={220} />
            </div>

            {/* Skills Compare */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Role A Skills */}
                <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50">
                    <h4 className="text-sm font-bold text-slate-300 mb-4">{roleA?.roleName || 'Role A'} Overview</h4>

                    <div className="mb-6">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 block">Matched Required Skills ({overlapA.matched.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                            {overlapA.matched.map(s => <SkillChip key={s} label={s} type="matched" />)}
                            {overlapA.matched.length === 0 && <span className="text-slate-600 text-sm">None</span>}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 block">Missing Required Skills ({overlapA.missing.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                            {overlapA.missing.map(s => <SkillChip key={s} label={s} type="missing" />)}
                            {overlapA.missing.length === 0 && <span className="text-slate-600 text-sm">None</span>}
                        </div>
                    </div>
                </div>

                {/* Role B Skills */}
                <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50">
                    <h4 className="text-sm font-bold text-slate-300 mb-4">{roleB?.roleName || 'Role B'} Overview</h4>

                    <div className="mb-6">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 block">Matched Required Skills ({overlapB.matched.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                            {overlapB.matched.map(s => <SkillChip key={s} label={s} type="matched" />)}
                            {overlapB.matched.length === 0 && <span className="text-slate-600 text-sm">None</span>}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 block">Missing Required Skills ({overlapB.missing.length})</span>
                        <div className="flex flex-wrap gap-1.5">
                            {overlapB.missing.map(s => <SkillChip key={s} label={s} type="missing" />)}
                            {overlapB.missing.length === 0 && <span className="text-slate-600 text-sm">None</span>}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
