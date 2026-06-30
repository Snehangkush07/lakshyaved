import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, CheckCircle, Circle, RefreshCw, Sparkles, Clock, Target } from 'lucide-react';
import ProgressBar from './ProgressBar';
import { generateRoadmap } from '../../core/logic/roadmapEngine';
import { saveRoadmapPlan, getRoadmapPlanByRole, saveRoadmapProgress, getRoadmapProgress, deleteRoadmapPlan } from '../../core/db/repo';

const getNow = () => Date.now();

export default function RoadmapPlanner({ targetRole, targetRoleName, missingSkills = [] }) {
    const [duration, setDuration] = useState(4);
    const [plan, setPlan] = useState(null);
    const [progress, setProgress] = useState({ completedTaskIds: [], completedAtByTaskId: {} });
    const [loading, setLoading] = useState(true);
    const [expandedWeeks, setExpandedWeeks] = useState({ 1: true }); // By default week 1 is expanded

    // "Today" View configurations
    const [startDateMs, setStartDateMs] = useState(() => getNow());

    // Load active plan if exists
    useEffect(() => {
        const loadExisting = async () => {
            if (!targetRole) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // Try to load a plan for the selected targetRole + chosen duration (or any duration if we want to search broadly, but here we scope to exact)
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

            // clear old progress just in case
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

    const handleReset = async () => {
        if (!plan) return;
        if (!confirm("Are you sure you want to reset all progress for this plan?")) return;

        const resetState = { completedTaskIds: [], completedAtByTaskId: {}, startDateMs: getNow() };
        setProgress(resetState);
        setStartDateMs(getNow());
        await saveRoadmapProgress(plan.id, resetState);
    };

    const handleRegenerate = async () => {
        if (!confirm("Are you sure you want to delete this plan and generate a new one?")) return;
        if (plan) {
            await deleteRoadmapPlan(plan.id);
        }
        handleGenerate();
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

    // Calculate current week index (1-based) based on startDate vs today
    // 1 week = 7 * 24 * 60 * 60 * 1000 ms
    const currentWeekIndex = useMemo(() => {
        if (!plan) return 1;
        const now = getNow();
        const diffValid = now - startDateMs;
        if (diffValid < 0) return 1; // future start date?
        const weeksPassed = Math.floor(diffValid / (7 * 24 * 60 * 60 * 1000));
        return Math.min(plan.durationWeeks, weeksPassed + 1);
    }, [startDateMs, plan]);

    // Overall Progress %
    const overallProgress = useMemo(() => {
        if (!plan || plan.summary.totalTasks === 0) return 0;
        return (progress.completedTaskIds.length / plan.summary.totalTasks) * 100;
    }, [plan, progress.completedTaskIds]);

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

    // STATE: No Plan Generated Yet
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
                        className="w-full sm:w-1/2 bg-[#13ec6d] text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-[#0ea64d] transition-all flex justify-center gap-2"
                    >
                        Generate Offline Plan
                    </button>
                </div>
            </div>
        );
    }

    // STATE: Plan Active
    const currentWeekData = plan.weeks.find(w => w.week === currentWeekIndex);

    return (
        <div className="space-y-6">
            <div className="bg-[#121a2a] rounded-2xl p-6 shadow-lg border border-slate-700/50">
                {/* Header Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                            {duration}-Week Builder
                        </h3>
                        <p className="text-sm text-[#13ec6d] font-bold tracking-wide uppercase mt-1">
                            {targetRoleName || targetRole}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleReset} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-700">
                            <RefreshCw size={12} /> Reset Progress
                        </button>
                        <button onClick={handleRegenerate} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-slate-700">
                            Rebuild Plan
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6 flex flex-col sm:flex-row gap-6 items-center">
                    <div className="w-full sm:w-2/3">
                        <ProgressBar value={overallProgress} label="Total Plan Progress" />
                    </div>
                    <div className="flex justify-around w-full sm:w-1/3 text-center">
                        <div>
                            <span className="block text-2xl font-bold text-white">{progress.completedTaskIds.length}<span className="text-slate-500 text-sm">/{plan.summary.totalTasks}</span></span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tasks</span>
                        </div>
                        <div className="w-px bg-slate-800 h-8 self-center" />
                        <div>
                            <span className="block text-2xl font-bold text-white">{plan.summary.totalEstHours}h</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Est. Effort</span>
                        </div>
                    </div>
                </div>

                {/* "Today / This Week" WOW View */}
                {currentWeekData && (
                    <div className="bg-gradient-to-r from-blue-900/20 to-emerald-900/10 border border-blue-800/30 rounded-xl p-5 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <Clock size={100} />
                        </div>
                        <div className="flex justify-between items-end mb-4 relative z-10">
                            <div>
                                <h4 className="text-[#13ec6d] font-bold text-sm uppercase tracking-wider mb-1 flex items-center gap-2">
                                    <Calendar size={14} /> Current Target (Week {currentWeekIndex})
                                </h4>
                                <p className="text-slate-300 text-sm font-medium">Focus: {currentWeekData.focusSkills.join(', ')}</p>
                            </div>
                            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-800 font-bold">Today</span>
                        </div>

                        <div className="space-y-2 relative z-10">
                            {currentWeekData.tasks.map(task => {
                                const isDone = progress.completedTaskIds.includes(task.id);
                                return (
                                    <div
                                        key={`today-${task.id}`}
                                        onClick={() => toggleTask(task.id)}
                                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isDone ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : 'bg-[#121a2a] border-slate-700 hover:border-slate-500 shadow-sm'}`}
                                    >
                                        <button className="flex-shrink-0 mt-0.5 text-slate-400 hover:text-[#13ec6d] transition-colors focus:outline-none">
                                            {isDone ? <CheckCircle size={18} className="text-[#13ec6d]" fill="rgba(19,236,109,0.1)" /> : <Circle size={18} />}
                                        </button>
                                        <div>
                                            <p className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-white'}`}>{task.text}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}


                {/* Full Plan View */}
                <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    Complete Schedule
                </h4>

                <div className="space-y-3">
                    {plan.weeks.map(w => {
                        const isExpanded = !!expandedWeeks[w.week];
                        const completedInWeek = w.tasks.filter(t => progress.completedTaskIds.includes(t.id)).length;
                        const weekProgress = (completedInWeek / w.tasks.length) * 100;

                        return (
                            <div key={w.week} className="border border-slate-800 rounded-xl overflow-hidden bg-[#151e2e]">
                                {/* Week Header (Clickable) */}
                                <div
                                    onClick={() => toggleWeek(w.week)}
                                    className="p-4 cursor-pointer hover:bg-slate-800/50 transition-colors flex items-center justify-between select-none"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-900 text-slate-300 font-bold w-10 h-10 rounded-lg flex items-center justify-center border border-slate-800">
                                            W{w.week}
                                        </div>
                                        <div>
                                            <h5 className="text-white font-bold text-sm">Week {w.week}</h5>
                                            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">{w.focusSkills.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="hidden sm:block w-24">
                                            <ProgressBar value={weekProgress} />
                                        </div>
                                        <div className="text-slate-500">
                                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Week Tasks */}
                                {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-slate-800/50 bg-[#121a2a]">
                                        <div className="space-y-1 mt-4">
                                            {w.tasks.map(task => {
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
                                                                <span className={`text-sm ${isDone ? 'text-slate-500 line-through' : 'text-slate-300 font-medium'}`}>
                                                                    {task.text}
                                                                </span>
                                                                <div className="flex gap-2 shrink-0">
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${task.type === 'learn' ? 'bg-purple-900/30 text-purple-400' :
                                                                            task.type === 'practice' ? 'bg-blue-900/30 text-blue-400' :
                                                                                task.type === 'build' ? 'bg-amber-900/30 text-amber-400' :
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
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
