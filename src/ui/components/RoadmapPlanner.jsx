import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle, Circle, RefreshCw, Sparkles, Target } from 'lucide-react';
import { generateRoadmap } from '../../core/logic/roadmapEngine';
import { saveRoadmapPlan, getRoadmapPlanByRole, saveRoadmapProgress, getRoadmapProgress, deleteRoadmapPlan } from '../../core/db/repo';

const getNow = () => Date.now();

export default function RoadmapPlanner({ targetRole, targetRoleName, missingSkills = [] }) {
    const navigate = useNavigate();
    const [duration, setDuration] = useState(4);
    const [plan, setPlan] = useState(null);
    const [progress, setProgress] = useState({ completedTaskIds: [], completedAtByTaskId: {} });
    const [loading, setLoading] = useState(true);
    const [expandedWeeks, setExpandedWeeks] = useState({ 1: true });

    const [startDateMs, setStartDateMs] = useState(() => getNow());
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [pendingDuration, setPendingDuration] = useState(duration);

    useEffect(() => {
        const loadExisting = async () => {
            if (!targetRole) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const existingPlan = await getRoadmapPlanByRole(targetRole, duration);
                if (existingPlan) {
                    setPlan(existingPlan);
                    const existingProgress = await getRoadmapProgress(existingPlan.id);
                    if (existingProgress) {
                        setProgress({
                            completedTaskIds: existingProgress.completedTaskIds || [],
                            completedAtByTaskId: existingProgress.completedAtByTaskId || {},
                            startDateMs: existingProgress.startDateMs || getNow()
                        });
                        if (existingProgress.startDateMs) setStartDateMs(existingProgress.startDateMs);
                    } else {
                        setProgress({ completedTaskIds: [], completedAtByTaskId: {} });
                        setStartDateMs(existingPlan.createdAt || getNow());
                    }
                } else {
                    setPlan(null);
                }
            } catch (err) {
                console.error("Failed to load roadmap", err);
            }
            setLoading(false);
        };
        loadExisting();
    }, [targetRole, duration]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const newPlan = generateRoadmap({
                targetRole,
                missingSkills,
                durationWeeks: duration
            });
            await saveRoadmapPlan(newPlan);

            setPlan(newPlan);
            setProgress({ completedTaskIds: [], completedAtByTaskId: {} });
            setStartDateMs(getNow());

            await saveRoadmapProgress(newPlan.id, {
                completedTaskIds: [],
                completedAtByTaskId: {},
                startDateMs: getNow()
            });

            setExpandedWeeks({ 1: true });
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleReset = () => {
        if (!plan) return;
        setConfirmDialog({
            title: "Reset Progress?",
            message: "Are you sure you want to reset all progress for this plan? Your completed tasks will be cleared.",
            confirmText: "Reset Progress",
            onConfirm: async () => {
                const resetState = { completedTaskIds: [], completedAtByTaskId: {}, startDateMs: getNow() };
                setProgress(resetState);
                setStartDateMs(getNow());
                await saveRoadmapProgress(plan.id, resetState);
                setConfirmDialog(null);
            }
        });
    };

    const handleRegenerate = () => {
        setPendingDuration(duration);
        setConfirmDialog({
            title: "Rebuild Plan?",
            message: "Are you sure you want to delete this plan and generate a new one? This will recalculate the weekly milestones.",
            confirmText: "Rebuild Plan",
            durationPicker: true,
            onConfirm: async (selectedDuration) => {
                setLoading(true);
                try {
                    if (plan) {
                        await deleteRoadmapPlan(plan.id);
                        await saveRoadmapProgress(plan.id, { completedTaskIds: [], completedAtByTaskId: {}, startDateMs: getNow() });
                    }
                    const newPlan = generateRoadmap({ targetRole, missingSkills, durationWeeks: selectedDuration });
                    await saveRoadmapPlan(newPlan);

                    setPlan(newPlan);
                    setDuration(selectedDuration);
                    setProgress({ completedTaskIds: [], completedAtByTaskId: {}, startDateMs: getNow() });
                    setConfirmDialog(null);

                    const existingProgress = await getRoadmapProgress(newPlan.id);
                    if (existingProgress) {
                        setProgress({
                            completedTaskIds: existingProgress.completedTaskIds || [],
                            completedAtByTaskId: existingProgress.completedAtByTaskId || {},
                            startDateMs: existingProgress.startDateMs || getNow()
                        });
                        if (existingProgress.startDateMs) setStartDateMs(existingProgress.startDateMs);
                    } else {
                        setStartDateMs(getNow());
                    }
                } catch (err) {
                    console.error('Rebuild failed:', err);
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const toggleTask = async (taskId) => {
        if (!plan) return;

        const isCompleted = progress.completedTaskIds.includes(taskId);
        let newIds, newDates;

        if (isCompleted) {
            newIds = progress.completedTaskIds.filter(id => id !== taskId);
            newDates = { ...progress.completedAtByTaskId };
            delete newDates[taskId];
        } else {
            newIds = [...progress.completedTaskIds, taskId];
            newDates = { ...progress.completedAtByTaskId, [taskId]: getNow() };
        }

        const newState = { completedTaskIds: newIds, completedAtByTaskId: newDates, startDateMs };
        setProgress(newState);
        await saveRoadmapProgress(plan.id, newState);
    };

    const toggleWeek = (weekNum) => {
        setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
    };

    const handlePillClick = (weekNum) => {
        setExpandedWeeks(prev => ({ ...prev, [weekNum]: true }));
        document.getElementById('week-card-' + weekNum)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };


    const totalTasksCount = useMemo(() => {
        if (!plan) return 0;
        return plan.summary?.totalTasks || plan.weeks.reduce((acc, w) => acc + (w.tasks?.length || 0), 0);
    }, [plan]);

    const overallProgress = useMemo(() => {
        if (!plan || totalTasksCount === 0) return 0;
        return (progress.completedTaskIds.length / totalTasksCount) * 100;
    }, [plan, totalTasksCount, progress.completedTaskIds]);

    const buildAIPrompt = (task) => {
        const role = targetRoleName || targetRole || 'my target role';
        const skill = task.skillName || 'this skill';
        const title = task.title || 'this task';

        if (task.type === 'practice') {
            return `I am studying "${skill}" for a ${role} role. Generate 10 practice questions with hints and answers on "${title}". Make them progressively harder, starting with fundamentals and ending with an interview-level question.`;
        }
        if (task.type === 'build') {
            return `I am building a project for a ${role} role using "${skill}". Give me 3 specific project ideas for "${title}", and for the best one, outline the scope, core features, tech stack, and success criteria.`;
        }
        if (task.type === 'revise') {
            return `I've been learning "${skill}" for a ${role} role. Generate 15 quick-revision flashcards (question on front, answer on back) covering "${title}". Keep each answer under 40 words.`;
        }
        // learn (default)
        return `I'm learning "${title}" as part of "${skill}" for a ${role} role. Explain it in simple terms with one concrete example and one common mistake to avoid.`;
    };

    const handleAskAI = (task, e) => {
        e.stopPropagation(); // prevent the parent row's toggleTask from firing
        const prompt = buildAIPrompt(task);
        navigate(`/career-assistant?prompt=${encodeURIComponent(prompt)}`);
    };

    if (!targetRole) {
        return (
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50 text-center text-slate-500 py-12">
                <Target size={40} className="mx-auto mb-4 opacity-30" />
                <p>Select a target role above to generate a roadmap.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50 flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#13ec6d]"></div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#13ec6d]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Sparkles size={20} className="text-[#13ec6d]" />
                    Actionable Learning Plan
                </h3>
                <p className="text-sm text-slate-400 mb-6">Create a deterministic, week-by-week roadmap to bridge your skill gaps for <strong>{targetRoleName || targetRole}</strong>.</p>

                <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 flex flex-col sm:flex-row items-end gap-4 mb-2">
                    <div className="w-full sm:w-1/2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Pace / Duration</label>
                        <select
                            value={duration}
                            onChange={(e) => setDuration(parseInt(e.target.value))}
                            className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-[#13ec6d]"
                        >
                            <option value={4}>4 Weeks (Intense)</option>
                            <option value={8}>8 Weeks (Balanced)</option>
                            <option value={12}>12 Weeks (Relaxed)</option>
                        </select>
                    </div>
                    <button
                        onClick={handleGenerate}
                        className="w-full sm:w-1/2 bg-[#13ec6d] text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-[#0ea64d] transition-all flex justify-center gap-2 cursor-pointer"
                    >
                        Generate Offline Plan
                    </button>
                </div>
            </div>
        );
    }

    const summary = plan.summary || {};
    const durationWeeks = plan.durationWeeks || duration;
    const totalEstHours = summary.totalEstHours !== undefined ? summary.totalEstHours : plan.weeks.reduce((sum, w) => sum + (w.estHours || w.weekEstHours || 0), 0);
    const hoursPerWeek = summary.hoursPerWeek !== undefined ? summary.hoursPerWeek : (durationWeeks > 0 ? Math.round(totalEstHours / durationWeeks) : 0);
    const completedPercent = Math.round(overallProgress);


    return (
        <div className="space-y-6">
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            {durationWeeks}-Week Builder
                        </h3>
                        <p className="text-sm text-[#13ec6d] font-bold tracking-wide uppercase mt-1">
                            {targetRoleName || targetRole}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleReset} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer">
                            <RefreshCw size={12} /> Reset Progress
                        </button>
                        <button onClick={handleRegenerate} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-700 cursor-pointer">
                            Rebuild Plan
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121a2a] p-5 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                TOTAL WEEKS
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                {durationWeeks}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                TOTAL HOURS
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                                {totalEstHours}h
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                HOURS / WEEK
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                                <span>~{hoursPerWeek}h</span>
                                {hoursPerWeek > 25 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                                        Intense
                                    </span>
                                )}
                                {hoursPerWeek <= 15 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#13ec6d]/20 text-emerald-600 dark:text-[#13ec6d] border border-[#13ec6d]/30">
                                        Relaxed
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#151e2e] border border-slate-200/60 dark:border-white/5">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                PROGRESS
                            </div>
                            <div className="text-xl font-bold text-[#13ec6d] mt-1">
                                {completedPercent}%
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                <div
                                    className="h-full bg-[#13ec6d] rounded-full transition-all duration-300"
                                    style={{ width: `${completedPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Week Timeline
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {plan.weeks.map(week => {
                                const weekTasks = week.tasks || [];
                                const doneCount = weekTasks.filter(t => progress.completedTaskIds.includes(t.id)).length;
                                const totalCount = weekTasks.length;
                                const isAllDone = totalCount > 0 && doneCount === totalCount;
                                const isSomeDone = doneCount > 0 && doneCount < totalCount;

                                let pillStyle = "border-slate-300 dark:border-slate-700 text-slate-500 bg-transparent";
                                if (isAllDone) {
                                    pillStyle = "bg-[#13ec6d]/20 text-[#13ec6d] border-[#13ec6d]/40 font-bold";
                                } else if (isSomeDone) {
                                    pillStyle = "border-[#13ec6d] text-[#13ec6d] bg-transparent font-bold";
                                }

                                return (
                                    <button
                                        key={week.week}
                                        type="button"
                                        onClick={() => handlePillClick(week.week)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-all hover:scale-105 cursor-pointer ${pillStyle}`}
                                    >
                                        W{week.week}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>



                <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    Complete Schedule
                </h4>

                <div className="space-y-3">
                    {plan.weeks.map(week => {
                        const isExpanded = !!expandedWeeks[week.week];
                        const completedTasksInWeek = week.tasks.filter(t => progress.completedTaskIds.includes(t.id)).length;
                        const totalTasksInWeek = week.tasks.length;
                        const weekProgress = totalTasksInWeek > 0 ? (completedTasksInWeek / totalTasksInWeek) * 100 : 0;

                        return (
                            <div
                                key={week.week}
                                id={"week-card-" + week.week}
                                className="border border-slate-800 rounded-xl overflow-hidden bg-[#151e2e] scroll-mt-6"
                            >
                                <div
                                    onClick={() => toggleWeek(week.week)}
                                    className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors select-none"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="bg-slate-900 text-slate-300 font-bold w-10 h-10 rounded-lg flex items-center justify-center border border-slate-800 shrink-0">
                                                W{week.week}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h5 className="text-white font-bold text-sm">Week {week.week}</h5>
                                                    {week.focusSkills && week.focusSkills.map((skill, si) => (
                                                        <span
                                                            key={si}
                                                            className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/20"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-xs text-slate-400">
                                                {completedTasksInWeek}/{totalTasksInWeek} tasks
                                            </span>
                                            <div className="text-slate-500">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-3">
                                        <div
                                            className="h-full bg-[#13ec6d] rounded-full transition-all duration-300"
                                            style={{ width: `${weekProgress}%` }}
                                        />
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-slate-800/50 bg-[#121a2a]">
                                        <div className="space-y-1 mt-4">
                                            {week.tasks.map(task => {
                                                const isDone = progress.completedTaskIds.includes(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => toggleTask(task.id)}
                                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 group cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 w-full">
                                                            <button className="flex-shrink-0 text-slate-500 group-hover:text-[#13ec6d] transition-colors focus:outline-none">
                                                                {isDone ? <CheckCircle size={18} className="text-[#13ec6d]" /> : <Circle size={18} />}
                                                            </button>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 w-full justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}`}>
                                                                        {task.title || task.text || ''}
                                                                    </span>
                                                                    {task.resources && task.resources.length > 0 && (
                                                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                                                            {task.resources.map((r, i) => (
                                                                                <a
                                                                                    key={i}
                                                                                    href={r.url}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    onClick={e => e.stopPropagation()}
                                                                                    className="text-[11px] text-[#13ec6d] hover:underline inline-flex items-center gap-1"
                                                                                >
                                                                                    {r.type === 'docs' ? '📄' : r.type === 'video' ? '▶' : '🔗'} {r.title}
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2 shrink-0 items-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleAskAI(task, e)}
                                                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#13ec6d]/10 text-emerald-600 dark:text-[#13ec6d] border border-[#13ec6d]/30 hover:bg-[#13ec6d]/20 transition-colors cursor-pointer whitespace-nowrap"
                                                                        title="Ask the AI assistant about this task"
                                                                    >
                                                                        ✨ Ask AI
                                                                    </button>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                                                        task.type === 'learn' ? 'bg-purple-900/30 text-purple-400' :
                                                                        task.type === 'practice' ? 'bg-blue-900/30 text-blue-400' :
                                                                        task.type === 'build' ? 'bg-amber-900/30 text-amber-400' :
                                                                        task.type === 'revise' ? 'bg-emerald-900/30 text-[#13ec6d]' :
                                                                        'bg-slate-800 text-slate-400'
                                                                    }`}>
                                                                        {task.type}
                                                                    </span>
                                                                    <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-700 px-2 py-0.5 rounded font-bold">
                                                                        {task.estHours}h
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {confirmDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setConfirmDialog(null)}
                >
                    <div
                        className="bg-[#121a2a] border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-bold text-white">
                            {confirmDialog.title}
                        </h3>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            {confirmDialog.message}
                        </p>

                        {confirmDialog.durationPicker && (
                            <div className="pt-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Duration</label>
                                <div className="flex gap-2">
                                    {[4, 8, 12].map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setPendingDuration(d)}
                                            className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                                                pendingDuration === d
                                                    ? 'bg-[#13ec6d]/15 text-emerald-600 dark:text-[#13ec6d] border-emerald-500/30'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 border-slate-700'
                                            }`}
                                        >
                                            {d} Weeks
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmDialog(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => confirmDialog.onConfirm(confirmDialog.durationPicker ? pendingDuration : null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer"
                            >
                                {confirmDialog.confirmText || 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
