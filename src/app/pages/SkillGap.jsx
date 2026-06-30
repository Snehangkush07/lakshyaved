import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, FileText, Download, Upload } from 'lucide-react';
import SkillChip from '../../ui/components/SkillChip';
import RoadmapCard from '../../ui/components/RoadmapCard';

import { getAllRoles, findRoles } from '../../core/logic/dataStore';
import { getResume, getProfile, saveSkillGapResults, getSkillGapResults } from '../../core/db/repo';
import { analyzeSkillGap } from '../../core/logic/skillEngine';
import { calculateReadiness } from '../../core/logic/readiness';
import { generateRecommendations } from '../../core/logic/recommendationEngine';
import { detectResumeSections } from '../../core/parsing/resumeParser';
import ReadinessMeter from '../../ui/components/ReadinessMeter';
import RoadmapPlanner from '../../ui/components/RoadmapPlanner';
import ExportPdfButton from '../../ui/components/ExportPdfButton';
import RoleAutocomplete from '../../ui/components/RoleAutocomplete';
import RecommendationList from '../../ui/components/RecommendationList';

export default function SkillGap() {
    const navigate = useNavigate();
    const rolesDataset = getAllRoles();
    const [resumeText, setResumeText] = useState('');
    const [targetRole, setTargetRole] = useState(rolesDataset[0]?.roleId || '');
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorStatus, setErrorStatus] = useState('');
    const [profileData, setProfileData] = useState({ skills: [], interests: [] });

    useEffect(() => {
        const loader = async () => {
            const resume = await getResume();
            if (resume && resume.rawText) {
                setResumeText(resume.rawText);
            }

            const p = await getProfile();
            if (p) {
                setProfileData(p);
                if (p.targetRole) {
                    setTargetRole(p.targetRole);
                }
            }

            const savedGap = await getSkillGapResults();
            if (savedGap && savedGap.targetRoleId) {
                setAnalysis(savedGap);
                setTargetRole(savedGap.targetRoleId);
            }
        };
        loader();
    }, []);

    const handleAnalyze = async () => {
        if (!resumeText) {
            setErrorStatus("No resume found in DB. Please upload first.");
            return;
        }
        if (!targetRole) {
            setErrorStatus("Please select a target role.");
            return;
        }

        setErrorStatus('');
        setLoading(true);

        try {
            const result = analyzeSkillGap({
                resumeText,
                targetRoleId: targetRole,
                rolesDataset
            });

            setAnalysis(result);
            await saveSkillGapResults(result);
        } catch (err) {
            setErrorStatus(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadSaved = async () => {
        const savedGap = await getSkillGapResults();
        if (savedGap) {
            setAnalysis(savedGap);
            setTargetRole(savedGap.targetRoleId || targetRole);
            setErrorStatus("Loaded saved analysis.");
            setTimeout(() => setErrorStatus(''), 3000);
        } else {
            setErrorStatus("No saved analysis found.");
            setTimeout(() => setErrorStatus(''), 3000);
        }
    };

    const readiness = useMemo(() => {
        return calculateReadiness({
            targetRole,
            rolesDataset,
            profileSkills: profileData?.skills || (analysis?.extractedSkills || []),
            profileInterests: profileData?.interests || [],
            resumeRawText: resumeText
        });
    }, [targetRole, rolesDataset, profileData, analysis, resumeText]);

    const resumeSections = useMemo(() => {
        return resumeText ? detectResumeSections(resumeText) : null;
    }, [resumeText]);

    const recs = useMemo(() => {
        if (!analysis || !targetRole) return [];
        return generateRecommendations({
            targetRole,
            rolesDataset,
            profileSkills: profileData?.skills || [],
            profileInterests: profileData?.interests || [],
            resumeSections,
            matchRate: analysis.matchRate || 0,
            missingSkills: analysis.missingSkills || [],
            readinessScore: readiness?.total || 0
        });
    }, [analysis, targetRole, rolesDataset, profileData, resumeSections, readiness]);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Skill Gap Analyzer</h1>
                </div>
                <div className="flex items-center gap-2">
                    <ExportPdfButton elementId="skill-gap-report" filename="lakshyaved-skill-gap.pdf" label="Export Skill Gap Report" />
                </div>
            </div>

            {/* Resume Status */}
            <div className="relative overflow-hidden rounded-xl bg-[#121a2a] p-1 shadow-lg ring-1 ring-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-[#13ec6d]/10 to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${resumeText ? 'bg-[#13ec6d]/20 text-[#13ec6d]' : 'bg-slate-800 text-slate-500'}`}>
                            {resumeText ? <CheckCircle size={20} /> : <FileText size={20} />}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Upload Resume</p>
                            <p className="text-xs text-gray-400">Word count: {resumeText ? resumeText.split(/\s+/).length : 0}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {resumeText && <CheckCircle size={24} className="text-[#13ec6d] hidden sm:block" />}
                        <button 
                            onClick={() => navigate('/upload')}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                        >
                            <Upload size={14} />
                            {resumeText ? 'Replace' : 'Upload'}
                        </button>
                    </div>
                </div>
            </div>

            {errorStatus && (
                <div className="p-3 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium">
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
                    <div className="flex gap-2">
                        <button onClick={handleAnalyze} disabled={loading} className="flex-1 bg-[#13ec6d] text-[#0b0f19] font-bold py-3 rounded-lg shadow-lg shadow-[#13ec6d]/20 hover:bg-[#13ec6d]/90 transition-all disabled:opacity-50 cursor-pointer">
                            {loading ? 'Analyzing...' : 'Analyze'}
                        </button>
                        <button onClick={handleLoadSaved} title="Load Saved Analysis" className="px-4 bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 cursor-pointer">
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

                        <div className="flex flex-col rounded-xl bg-[#121a2a] p-4 border border-[#1e293b] shadow-lg">
                            <div className="flex items-start justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Match Rate</p>
                                <div className="h-8 w-8 rounded-full border-2 border-[#13ec6d]/30 border-t-[#13ec6d] flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-[#13ec6d]">{analysis ? analysis.matchRate : 0}%</span>
                                </div>
                            </div>
                            <div className="mt-auto flex gap-8">
                                <div>
                                    <p className="text-2xl font-bold text-white">{analysis ? analysis.matchedCount : 0}</p>
                                    <p className="text-[10px] font-medium text-gray-400">Matched</p>
                                </div>
                                <div className="h-full w-px bg-white/10" />
                                <div>
                                    <p className="text-2xl font-bold text-[#ef4444]">{analysis ? analysis.missingCount : 0}</p>
                                    <p className="text-[10px] font-medium text-gray-400">Missing</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Skills Breakdown */}
                <div className={`space-y-4 ${!analysis ? 'opacity-50 pointer-events-none' : ''}`}>

                    <div className="rounded-xl bg-[#121a2a] p-5 border border-[#1e293b]">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle size={18} className="text-[#13ec6d]" />
                            <h3 className="text-sm font-bold text-white">Matched Skills</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {analysis?.matchedSkills?.length ? (
                                analysis.matchedSkills.map(skill => <SkillChip key={skill} label={skill} type="matched" />)
                            ) : (
                                <p className="text-xs text-slate-500">Run analysis to see matched skills...</p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl bg-[#121a2a] p-5 border border-[#ef4444]/20 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ef4444]/5 blur-2xl pointer-events-none" />
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <AlertTriangle size={18} className="text-[#ef4444]" />
                            <h3 className="text-sm font-bold text-white">Missing Skills</h3>
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

                {/* AI Generated Offline Roadmap - NEW */}
                {analysis && targetRole && (
                    <div className="pt-4 border-t border-[#1e293b]">
                        <RoadmapPlanner
                            targetRole={targetRole}
                            targetRoleName={rolesDataset.find(r => r.roleId === targetRole)?.roleName}
                            missingSkills={analysis.missingSkills || []}
                        />
                    </div>
                )}

                {/* Roadmap */}
                {analysis && analysis.roadmap && analysis.roadmap.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h2 className="text-lg font-bold text-white">Recommended Roadmap</h2>
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
                {/* Recommendations */}
                {analysis && targetRole && (
                    <RecommendationList recs={recs} />
                )}
            </div>
        </div>
    );
}
