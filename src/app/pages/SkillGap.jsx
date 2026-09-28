import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, FileText, Download, ArrowRight } from 'lucide-react';
import { getAllRoles, findRoles, getAllSkills, findSkills } from '../../core/logic/dataStore';
import { extractSkillsFromText } from '../../core/parsing/resumeParser';
import { analyzeSkillGap } from '../../core/logic/skillEngine';
import { getResume, saveSkillGapResults, getSkillGapResults, getProfile } from '../../core/db/repo';
import { calculateReadiness } from '../../core/logic/readiness';
import SkillChip from '../../ui/components/SkillChip';
import RoadmapCard from '../../ui/components/RoadmapCard';
import ExportPdfButton from '../../ui/components/ExportPdfButton';
import RoleAutocomplete from '../../ui/components/RoleAutocomplete';
import ReadinessMeter from '../../ui/components/ReadinessMeter';

const rolesDataset = getAllRoles();

export default function SkillGap() {
    const navigate = useNavigate();
    const [targetRole, setTargetRole] = useState(rolesDataset[0]?.roleId || '');
    const [resumeText, setResumeText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorStatus, setErrorStatus] = useState('');
    const [profileData, setProfileData] = useState(null);
    const [confirmedSkills, setConfirmedSkills] = useState([]);
    const [skillQuery, setSkillQuery] = useState('');
    const [skillError, setSkillError] = useState('');
    const [skillSuggestions, setSkillSuggestions] = useState([]);

    useEffect(() => {
        if (resumeText && resumeText.trim()) {
            setConfirmedSkills(extractSkillsFromText(resumeText, rolesDataset));
        } else {
            setConfirmedSkills([]);
        }
    }, [resumeText]);

    // Initial load
    useEffect(() => {
        const loadInitialData = async () => {
            const resume = await getResume();
            if (resume && resume.rawText) {
                setResumeText(resume.rawText);
            }
            const profile = await getProfile();
            if (profile) {
                setProfileData(profile);
            }
        };
        loadInitialData();
    }, []);

    const handleAnalyze = async () => {
        if (confirmedSkills.length === 0) {
            setErrorStatus('Add at least one skill before analyzing.');
            return;
        }

        if (!resumeText) {
            setErrorStatus('No resume found. Please upload a resume first.');
            return;
        }

        setLoading(true);
        setErrorStatus('');

        try {
            const res = analyzeSkillGap({
                targetRoleId: targetRole,
                rolesDataset,
                resumeText,
                resumeRawText: resumeText,
                confirmedSkills
            });

            setAnalysis(res);
            await saveSkillGapResults({
                targetRoleId: targetRole,
                analysis: res
            });
        } catch (e) {
            setErrorStatus(`Analysis error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSaved = async () => {
        const saved = await getSkillGapResults();
        if (saved && saved.targetRoleId === targetRole) {
            setAnalysis(saved.analysis);
        } else {
            setErrorStatus('No saved analysis for this target role.');
        }
    };

    const readiness = useMemo(() => {
        if (!targetRole || !resumeText) return null;
        return calculateReadiness({
            targetRole,
            rolesDataset,
            profileSkills: profileData?.skills || [],
            profileInterests: profileData?.interests || [],
            resumeRawText: resumeText
        });
    }, [targetRole, resumeText, profileData]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Skill Gap Analyzer</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Audit your skill inventory against target career positions.</p>
                </div>
                <div className="flex items-center gap-2">
                    <ExportPdfButton elementId="skill-gap-report" filename="lakshyaved-skill-gap.pdf" label="Export Skill Gap Report" />
                </div>
            </div>

            {/* Resume Status */}
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#121a2a] p-1 shadow-lg border border-slate-200 dark:border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-[#13ec6d]/10 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${resumeText ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#13ec6d]' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                            {resumeText ? <CheckCircle size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">Active Resume Data</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Word count: {resumeText ? resumeText.split(/\s+/).length : 0}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {resumeText && <CheckCircle size={22} className="text-[#13ec6d] hidden sm:block" />}
                        <button 
                            onClick={() => navigate('/upload')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        >
                            <Upload size={14} />
                            {resumeText ? 'Replace' : 'Upload'}
                        </button>
                    </div>
                </div>
            </div>

            {errorStatus && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-xl text-sm font-medium">
                    {errorStatus}
                </div>
            )}

            {/* Controls & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                    <div className="space-y-1.5">
                        <RoleAutocomplete
                            label="Target Role"
                            roles={rolesDataset}
                            selectedRoleId={targetRole}
                            onSelectRole={(role) => setTargetRole(role ? role.roleId : '')}
                            placeholder="Search for your target role..."
                            searchFn={(query) => findRoles(query)}
                        />
                    </div>

                    <div className="flex flex-col rounded-xl bg-white dark:bg-[#121a2a] p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Extracted Skills</span>
                            <button
                                type="button"
                                onClick={() => setConfirmedSkills(extractSkillsFromText(resumeText, rolesDataset))}
                                className="text-[10px] font-bold text-emerald-600 dark:text-[#13ec6d] hover:underline cursor-pointer"
                            >
                                Re-parse resume
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">Edit before analyzing. Remove wrong skills or add missed ones.</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {confirmedSkills.length > 0 ? (
                                confirmedSkills.map(skill => (
                                    <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#13ec6d]/10 text-emerald-600 dark:text-[#13ec6d] border border-[#13ec6d]/30">
                                        {skill}
                                        <button type="button" onClick={() => setConfirmedSkills(prev => prev.filter(s => s !== skill))} className="ml-0.5 text-emerald-500 hover:text-emerald-400 cursor-pointer">×</button>
                                    </span>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic">No skills extracted yet. Upload a resume or add skills manually.</p>
                            )}
                        </div>

                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Add a skill..."
                                value={skillQuery}
                                onChange={(e) => {
                                    setSkillQuery(e.target.value);
                                    setSkillSuggestions(findSkills(e.target.value));
                                    setSkillError('');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const query = skillQuery.trim().toLowerCase();
                                        if (!query) return;
                                        
                                        const allSkills = getAllSkills();
                                        const match = allSkills.find(s => s.skillName.toLowerCase() === query);
                                        
                                        if (match) {
                                            if (!confirmedSkills.includes(match.skillName)) {
                                                setConfirmedSkills(prev => [...prev, match.skillName]);
                                            }
                                            setSkillQuery('');
                                            setSkillSuggestions([]);
                                            setSkillError('');
                                        } else {
                                            setSkillError('Not a known skill');
                                        }
                                    }
                                }}
                                className="w-full text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#13ec6d] focus:border-transparent transition-all"
                            />
                            {skillSuggestions.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                                    {skillSuggestions.slice(0, 5).map(suggestion => (
                                        <button
                                            key={suggestion.skillId || suggestion.skillName}
                                            type="button"
                                            onClick={() => {
                                                if (!confirmedSkills.includes(suggestion.skillName)) {
                                                    setConfirmedSkills(prev => [...prev, suggestion.skillName]);
                                                }
                                                setSkillQuery('');
                                                setSkillSuggestions([]);
                                                setSkillError('');
                                            }}
                                            className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer"
                                        >
                                            {suggestion.skillName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {skillError && <p className="text-xs text-red-500 mt-1">{skillError}</p>}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAnalyze} disabled={loading} className="flex-1 bg-[#13ec6d] text-[#0b0f19] font-bold py-3 rounded-xl shadow-md hover:bg-[#0ea64d] transition-all disabled:opacity-50 cursor-pointer">
                            {loading ? 'Analyzing...' : 'Analyze'}
                        </button>
                        <button onClick={handleLoadSaved} title="Load Saved Analysis" className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <Download size={20} />
                        </button>
                    </div>
                </div>

                <div id="skill-gap-report" className="space-y-6 pb-2">
                    <div className="flex flex-col gap-4">
                        {readiness && (
                            <div className="col-span-1">
                                <ReadinessMeter score={readiness.total} breakdown={readiness.breakdown} />
                            </div>
                        )}

                        <div className="flex flex-col rounded-2xl bg-white dark:bg-[#121a2a] p-4 border border-slate-200 dark:border-[#1e293b] shadow-lg">
                            <div className="flex items-start justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Match Rate</p>
                                <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 dark:border-[#13ec6d]/30 dark:border-t-[#13ec6d] flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-[#13ec6d]">{analysis ? analysis.matchRate : 0}%</span>
                                </div>
                            </div>
                            <div className="mt-auto flex gap-8">
                                <div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{analysis ? analysis.matchedCount : 0}</p>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Matched</p>
                                </div>
                                <div className="h-full w-px bg-slate-200 dark:bg-white/10" />
                                <div>
                                    <p className="text-2xl font-bold text-red-500">{analysis ? analysis.missingCount : 0}</p>
                                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Missing</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Skills Breakdown */}
                <div className={`space-y-4 ${!analysis ? 'opacity-50 pointer-events-none' : ''}`}>

                    <div className="rounded-2xl bg-white dark:bg-[#121a2a] p-5 border border-slate-200 dark:border-[#1e293b] shadow-md">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle size={18} className="text-emerald-600 dark:text-[#13ec6d]" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Matched Skills</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {analysis?.matchedSkills?.length ? (
                                analysis.matchedSkills.map(skill => <SkillChip key={skill} label={skill} type="matched" />)
                            ) : (
                                <p className="text-xs text-slate-500">Run analysis to see matched skills...</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-[#121a2a] p-5 border border-red-300 dark:border-[#ef4444]/20 relative overflow-hidden shadow-md">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-red-500/5 blur-2xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <AlertTriangle size={18} className="text-red-500" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Missing Skills</h3>
                        </div>
                        <div className="flex flex-wrap gap-2 relative z-10">
                            {analysis?.missingSkills?.length ? (
                                analysis.missingSkills.map(skill => <SkillChip key={skill} label={skill} type="missing" />)
                            ) : (
                                <p className="text-xs text-slate-500">Run analysis to see missing skills...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Take Action CTA */}
                {analysis && targetRole && (
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121a2a] p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Ready to close these gaps?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            Generate your week-by-week study roadmap, project your salary trajectory, and track progress on the Career Simulator.
                        </p>
                        <button
                            onClick={() => navigate('/career')}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#13ec6d] text-slate-900 font-bold hover:bg-[#0ea64d] transition-colors cursor-pointer"
                        >
                            Open Career Simulator <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* Roadmap */}
                {analysis && analysis.roadmap && analysis.roadmap.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recommended Roadmap</h2>
                        </div>
                        <div className="space-y-4">
                            {analysis.roadmap.map(rm => (
                                <RoadmapCard
                                    key={rm.title}
                                    title={rm.title}
                                    priority={rm.priority}
                                    steps={rm.steps}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
