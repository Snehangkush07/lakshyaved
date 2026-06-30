import { useState, useEffect, useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import ChipInput from '../../ui/components/ChipInput';
import StatCard from '../../ui/components/StatCard';

import { simulateCareer } from '../../core/logic/careerEngine';
import { getAllRoles, findRoles, findSkills, findInterests } from '../../core/logic/dataStore';
import { saveProfile, getProfile, saveCareerResults, getCareerResults, getResume } from '../../core/db/repo';
import { formatINR } from '../../core/utils/format';
import { calculateReadiness } from '../../core/logic/readiness';
import { generateRecommendations } from '../../core/logic/recommendationEngine';
import { generateScenarios } from '../../core/logic/scenarioEngine';
import { analyzeTransitions } from '../../core/logic/transitionEngine';
import { detectResumeSections } from '../../core/parsing/resumeParser';
import ReadinessMeter from '../../ui/components/ReadinessMeter';
import RoadmapPlanner from '../../ui/components/RoadmapPlanner';
import ExportPdfButton from '../../ui/components/ExportPdfButton';
import RoleAutocomplete from '../../ui/components/RoleAutocomplete';
import WhatIfScenarios from '../../ui/components/WhatIfScenarios';
import RecommendationList from '../../ui/components/RecommendationList';
import CareerPathGraph from '../../ui/components/CareerPathGraph';

const rolesDataset = getAllRoles();

export default function CareerSimulator() {
    const [skills, setSkills] = useState(['Python', 'React']);
    const [interests, setInterests] = useState(['Leadership']);
    const [targetRole, setTargetRole] = useState(rolesDataset[0]?.roleId || '');
    const [results, setResults] = useState(null);
    const [errorStatus, setErrorStatus] = useState('');
    const [resumeData, setResumeData] = useState(null);

    const [skillSuggestions, setSkillSuggestions] = useState([]);
    const [skillError, setSkillError] = useState('');

    const handleSkillQueryChange = (q) => {
        if (q) {
            setSkillSuggestions(findSkills(q).map(s => ({
                id: s.skillId,
                label: s.skillName,
                meta: s.category
            })));
        } else {
            setSkillSuggestions([]);
        }
    };

    const [interestSuggestions, setInterestSuggestions] = useState([]);
    const [interestError, setInterestError] = useState('');

    const handleInterestQueryChange = (q) => {
        if (q) {
            setInterestSuggestions(findInterests(q).map(i => ({
                id: i.interestId,
                label: i.interestName
            })));
        } else {
            setInterestSuggestions([]);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const profile = await getProfile();
                if (profile) {
                    if (profile.skills) setSkills(profile.skills);
                    if (profile.interests) setInterests(profile.interests);
                    if (profile.targetRole) setTargetRole(profile.targetRole);
                }

                const savedResults = await getCareerResults();
                const r = await getResume();
                if (r) setResumeData(r);

                if (savedResults && savedResults.projection) {
                    setResults({ projection: savedResults.projection });

                    if (profile && profile.targetRole && profile.skills) {
                        const sim = simulateCareer({
                            skills: profile.skills,
                            interests: profile.interests || [],
                            targetRole: profile.targetRole,
                            rolesDataset,
                            education: profile.education || '',
                            hasResume: !!(r && r.rawText),
                            skillsWithLevels: profile.skillsWithLevels || []
                        });
                        setResults(sim);
                    }
                }
            } catch (err) {
                console.error("Failed to load saved data:", err);
            }
        };
        loadData();
    }, []);

    const addSkill = (skill) => setSkills([...skills, skill]);
    const removeSkill = (skill) => setSkills(skills.filter(s => s !== skill));

    const addInterest = (interest) => setInterests([...interests, interest]);
    const removeInterest = (interest) => setInterests(interests.filter(i => i !== interest));

    const handleSimulate = async () => {
        try {
            if (!targetRole) {
                setErrorStatus('Please select a target role');
                return;
            }

            const profile = await getProfile();
            const simulation = simulateCareer({
                skills,
                interests,
                targetRole,
                rolesDataset,
                education: profile?.education || '',
                hasResume: !!resumeData?.rawText,
                skillsWithLevels: profile?.skillsWithLevels || []
            });

            setResults(simulation);
            setErrorStatus('');

            await saveProfile({ skills, interests, targetRole });
            await saveCareerResults(simulation.projection);
        } catch (err) {
            setErrorStatus(err.message);
        }
    };

    const handleReset = () => {
        setSkills([]);
        setInterests([]);
        setTargetRole(rolesDataset[0]?.roleId || '');
        setResults(null);
        setErrorStatus('');
    };

    // Calculate secondary variables
    const role = useMemo(() => {
        return results && targetRole ? rolesDataset.find(r => r.roleId === targetRole) : null;
    }, [targetRole, results]);
    
    const missingSkills = useMemo(() => {
        return role
            ? role.requiredSkills?.filter(s => !skills.map(us => us.toLowerCase()).includes(s.toLowerCase())) || []
            : [];
    }, [role, skills]);

    const readiness = useMemo(() => {
        return calculateReadiness({
            targetRole,
            rolesDataset,
            profileSkills: skills,
            profileInterests: interests,
            resumeRawText: resumeData?.rawText || ''
        });
    }, [targetRole, skills, interests, resumeData]);

    const scenarios = useMemo(() => {
        return results && targetRole ? generateScenarios({
            targetRole,
            rolesDataset,
            profileSkills: skills,
            matchRate: results.explain?.skillMatchPercent || 0,
            missingSkills,
            readinessScore: readiness?.total || 0
        }) : [];
    }, [results, targetRole, skills, missingSkills, readiness]);

    const resumeSections = useMemo(() => {
        return resumeData?.rawText ? detectResumeSections(resumeData.rawText) : null;
    }, [resumeData]);
    
    const recs = useMemo(() => {
        return results && targetRole ? generateRecommendations({
            targetRole,
            rolesDataset,
            profileSkills: skills,
            profileInterests: interests,
            resumeSections,
            matchRate: results.explain?.skillMatchPercent || 0,
            missingSkills,
            readinessScore: readiness?.total || 0
        }) : [];
    }, [results, targetRole, skills, interests, resumeSections, missingSkills, readiness]);

    const transitions = useMemo(() => {
        return results && targetRole ? analyzeTransitions({ 
            targetRole, 
            rolesDataset, 
            profileSkills: skills, 
            skillsWithLevels: [] 
        }) : null;
    }, [results, targetRole, skills]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Career Simulator</h2>
                    <p className="text-slate-400 text-sm mt-1">Project your growth path based on current market data.</p>
                </div>
                <ExportPdfButton elementId="career-report" filename="lakshyaved-career-report.pdf" label="Export Career Report" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-[#1e293b] space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Parameters
                        </h3>
                        <button onClick={handleReset} className="text-xs text-[#13ec6d] font-medium hover:underline flex items-center gap-1 cursor-pointer">
                            <RotateCcw size={12} /> Reset
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <RoleAutocomplete
                                label="Target Role"
                                roles={rolesDataset}
                                selectedRoleId={targetRole}
                                onSelectRole={(role) => setTargetRole(role ? role.roleId : '')}
                                placeholder="Search roles..."
                                searchFn={(query) => findRoles(query)}
                            />
                        </div>

                        <ChipInput
                            label="Current Skills"
                            chips={skills}
                            onAdd={(skill) => { addSkill(skill); setSkillSuggestions([]); }}
                            onRemove={removeSkill}
                            placeholder="Add skill..."
                            strict={true}
                            suggestions={skillSuggestions}
                            onQueryChange={handleSkillQueryChange}
                            error={skillError}
                            setError={setSkillError}
                        />

                        <ChipInput
                            label="Interests"
                            chips={interests}
                            onAdd={(interest) => { addInterest(interest); setInterestSuggestions([]); }}
                            onRemove={removeInterest}
                            placeholder="Add interest..."
                            strict={true}
                            suggestions={interestSuggestions}
                            onQueryChange={handleInterestQueryChange}
                            error={interestError}
                            setError={setInterestError}
                            validationType="interests"
                            emptyText="No interests found"
                        />

                        {errorStatus && (
                            <div className="p-3 bg-red-900/50 text-red-200 border border-red-800 rounded-lg text-sm font-medium">
                                {errorStatus}
                            </div>
                        )}

                        <button onClick={handleSimulate} className="w-full bg-[#13ec6d] text-slate-900 font-bold py-3.5 rounded-xl mt-4 hover:bg-[#0ea64d] active:scale-[0.98] transition-all shadow-[0_0_20px_-5px_rgba(19,236,109,0.3)] flex items-center justify-center gap-2 cursor-pointer">
                            <Play size={20} fill="currentColor" />
                            Simulate Career Path
                        </button>
                    </div>
                </div>

                {/* Projection Result */}
                <div id="career-report" className="space-y-6">
                    <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-[#1e293b] flex flex-col relative overflow-hidden">
                        {results ? (
                            <>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#13ec6d]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

                                <div className="flex justify-between items-start mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Projection</h3>
                                    <div className="bg-green-500/10 text-green-400 text-xs px-2 py-1 rounded-md border border-green-500/20 font-bold uppercase">Simulation Active</div>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mb-8 flex-1">
                                    <div className="relative w-40 h-40 flex-shrink-0">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                            <path className="text-slate-200 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                                            {results.explain && (
                                                <path className="text-[#13ec6d] drop-shadow-[0_0_8px_rgba(19,236,109,0.5)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${results.explain.skillMatchPercent}, 100`} strokeLinecap="round" strokeWidth="3.5" />
                                            )}
                                        </svg>
                                        {results.explain && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-bold text-slate-900 dark:text-white">{results.explain.skillMatchPercent}%</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-semibold">Match</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 w-full">
                                        <StatCard title="Target Year" value="Year 5" />
                                        <StatCard
                                            title="Est. Salary"
                                            value={results.projection.length ? formatINR(results.projection[4].salaryINR) : 'N/A'}
                                            trend={results.explain ? `+${results.explain.effectiveGrowthPercent}% /yr` : ''}
                                            trendUp={true}
                                        />
                                    </div>
                                </div>

                                <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-4">
                                    {results.explain ? (
                                        <>Based on your profile, you are projected to reach <strong className="text-slate-300">{results.projection[4]?.title}</strong> level smoothly with a {results.explain.effectiveGrowthPercent}% YoY compounding growth rate.</>
                                    ) : 'Data loaded successfully.'}
                                </p>

                                {readiness && (
                                    <div className="mt-6 pt-6 border-t border-slate-700/50">
                                        <ReadinessMeter score={readiness.total} breakdown={readiness.breakdown} />
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="h-full bg-slate-800/20 rounded-xl border border-slate-700/50 border-dashed flex items-center justify-center p-12 text-center text-slate-500 flex-1">
                                <div>
                                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <p className="text-lg font-medium text-slate-400 mb-1">No Simulation Complete</p>
                                    <p className="text-xs">Select your parameters and simulate.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Roadmap Table */}
                {results && results.projection && (
                    <div className="bg-white dark:bg-[#121a2a] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-[#1e293b]">
                        <div className="p-5 border-b border-slate-200 dark:border-[#1e293b] flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">5-Year Roadmap</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-[#151e2e] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-4">Year</th>
                                        <th className="px-6 py-4">Projected Role</th>
                                        <th className="px-6 py-4 text-right">Compensation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {results.projection.map((row) => (
                                        <tr key={row.year} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 rounded-full bg-slate-600" />
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">Year {row.year}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{row.title}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-right text-slate-900 dark:text-white">{formatINR(row.salaryINR)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Scenario Simulation */}
                {results && targetRole && (
                    <WhatIfScenarios scenarios={scenarios} />
                )}

                {/* Recommendations */}
                {results && targetRole && (
                    <RecommendationList recs={recs} />
                )}

                {/* Career Path Graph */}
                {results && targetRole && (
                    <CareerPathGraph transitions={transitions} />
                )}

                {/* Roadmap Planner */}
                {results && targetRole && (
                    <div className="pt-4 mt-8 border-t border-[#1e293b]">
                        <RoadmapPlanner
                            targetRole={targetRole}
                            targetRoleName={role?.roleName}
                            missingSkills={missingSkills}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
