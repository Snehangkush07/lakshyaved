import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Sparkles, Send, Square, Trash2, Bot, User, 
    Copy, Check, RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getProfile, getResume, getSkillGapResults, getRoadmapPlanByRole, getRoadmapProgress } from '../../core/db/repo';
import { getAllRoles } from '../../core/logic/dataStore';
import { calculateReadiness } from '../../core/logic/readiness';
import { useAuth } from '../../core/context/AuthContext';

const INITIAL_GREETING = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `👋 Hi! I'm your Lakshyaved career assistant.

I can help with:
- Your roadmap — what to learn next
- Skill gaps — how to close them
- Interviews — coding, system design, behavioral
- Resume — how to sharpen it
- Roles & salaries — realistic expectations

Ask me anything, or tap a suggestion below.`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'system'
};

const STORAGE_KEY = 'lakshyaved_ai_chat_history_v1';

const QUICK_ACTIONS = [
    { label: '📚 Study plan', query: 'What should I study this week?' },
    { label: '🎯 Skill gaps', query: 'What are my top 3 skill gaps?' },
    { label: '💼 Interview prep', query: 'How should I prepare for an interview?' },
    { label: '📄 Resume tips', query: 'Review my resume and tell me what to improve.' },
];

function generateClientFallback(query, context) {
    const q = (query || '').toLowerCase();
    const roles = getAllRoles();
    const matched = roles.find(r => 
        r.roleName && (q.includes(r.roleName.toLowerCase()) || 
        (r.aliases && r.aliases.some(a => q.includes(a.toLowerCase()))))
    );

    if (matched) {
        const salaryText = matched.baseSalaryINR && matched.seniorSalaryINR
            ? `₹${(matched.baseSalaryINR / 100000).toFixed(1)}L - ₹${(matched.seniorSalaryINR / 100000).toFixed(1)}L INR/yr`
            : 'Market competitive';

        return `### 🎯 Offline Career Profile: ${matched.roleName}

*(Generated from Lakshyaved local dataset while live AI is in high demand)*

#### 📊 Market & Compensation
- **Industry Demand:** \`${(matched.demandLevel || 'High').toUpperCase()}\`
- **Estimated Compensation:** **${salaryText}**

#### 🛠️ Core Skills to Master
${(matched.requiredSkills || []).map(s => `- **${s}**`).join('\n')}

${matched.niceToHaveSkills?.length ? `#### ✨ Advanced Differentiators\n${matched.niceToHaveSkills.map(s => `- ${s}`).join('\n')}` : ''}

${context?.targetRole ? `\n> **Profile Note:** Your target role is set to **${context.targetRole}**.` : ''}`;
    }

    if (q.includes("interview") || q.includes("prepare") || q.includes("coding")) {
        return `### 🎯 Strategic Technical & Coding Interview Preparation (Offline Guide)

#### 1. Core Algorithm Archetypes
- **Priority Patterns:** Two Pointers, Sliding Window, Fast/Slow Pointers, Top-K Heap, and Monotonic Stack.
- Focus on clean syntax, edge case analysis, and time/space complexity calculation before coding.

#### 2. System Design Fundamentals
- Clarify requirements (throughput, availability, latency).
- Structure diagrams: Client -> Load Balancer -> Web Servers -> Cache (Redis) -> Primary/Replica DB.

#### 3. Behavioral Excellence (STAR Method)
- Frame responses with **Situation**, **Task**, **Action** (what *you* did), and **Result** (with metrics).`;
    }

    if (q.includes("resume") || q.includes("cv") || q.includes("portfolio")) {
        return `### 📄 Resume & Portfolio Optimization (Offline Guide)

#### 1. Google XYZ Metric Formula
- Structure bullet points: *"Accomplished [X], as measured by [Y], by doing [Z]"*.
- Highlight measurable improvements (e.g. latency, user adoption, test coverage).

#### 2. ATS Clean Format
- Single-column layout with standard headings: Summary, Technical Skills, Experience, Projects, Education.`;
    }

    return `### 💡 Career Guidance & Strategic Next Steps (Offline Guide)

While live AI services are experiencing temporary high traffic, here is actionable guidance from your Lakshyaved local profile:

- **Targeted Skill Mastery:** Focus on core required skills for your target role (${context?.targetRole || 'Software Engineering'}).
- **Portfolio Depth:** Build production-grade projects featuring database persistence, API design, and CI/CD pipelines.
- **Skill Gap Tracking:** Check the **Skill Gap Analyzer** tab to view matched and missing skills directly from your profile.`;
}

let messageCounter = 0;
function createChatMessage({ role, content, source = '', isFallback = false, originalQuery = null, notice = null }) {
    messageCounter += 1;
    let timestamp = '';
    try {
        timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        timestamp = '';
    }
    return {
        id: `msg_${role}_${messageCounter}_${Math.random().toString(36).slice(2, 6)}`,
        role,
        content,
        timestamp,
        source,
        isFallback,
        originalQuery,
        notice
    };
}

export default function CareerAssistant() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const hasAutoSentRef = useRef(false);
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to load chat history', e);
        }
        return [INITIAL_GREETING];
    });

    const [inputQuery, setInputQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingSlow, setTypingSlow] = useState(false);
    const typingTimeoutRef = useRef(null);
    const [copiedIndex, setCopiedIndex] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [useProfileContext, setUseProfileContext] = useState(true);
    const [profileContext, setProfileContext] = useState(null);
    const [apiHealth, setApiHealth] = useState({ aiConfigured: false, primaryModel: 'Gemini 2.5 Flash' });
    const [aiSource, setAiSource] = useState('unknown');
    const [highDemandNotice, setHighDemandNotice] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearFeedback, setClearFeedback] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);
    const stoppedByUserRef = useRef(false);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

    // Save chat history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save chat history', e);
        }
    }, [messages]);

    const fetchContext = useCallback(async () => {
        try {
            const [prof, gap, resume] = await Promise.all([
                getProfile().catch(() => null),
                getSkillGapResults().catch(() => null),
                getResume().catch(() => null)
            ]);

            const rawResume = typeof resume?.rawText === 'string' ? resume.rawText : '';
            const resumeText = rawResume.slice(0, 20000);

            const targetRole = prof?.targetRole || gap?.targetRole || (prof ? 'Software Engineer' : null);
            const allRoles = getAllRoles();
            const targetRoleLower = (targetRole || '').toLowerCase();
            const matchedRole = targetRoleLower ? allRoles.find(r => 
                r.roleId?.toLowerCase() === targetRoleLower || 
                r.roleName?.toLowerCase() === targetRoleLower ||
                (r.aliases && r.aliases.some(a => a.toLowerCase() === targetRoleLower))
            ) : null;

            let plan = targetRole ? await getRoadmapPlanByRole(targetRole, 4).catch(() => null) : null;
            if (targetRole && !plan) plan = await getRoadmapPlanByRole(targetRole, 8).catch(() => null);
            if (targetRole && !plan) plan = await getRoadmapPlanByRole(targetRole, 12).catch(() => null);
            let progress = null;
            if (plan) {
                progress = await getRoadmapProgress(plan.id).catch(() => null);
            }

            let nextTask = null;
            if (plan) {
                const completed = progress?.completedTaskIds || [];
                for (const week of (plan.weeks || [])) {
                    for (const task of (week.tasks || [])) {
                        if (!completed.includes(task.id)) {
                            nextTask = task.title || task.text;
                            break;
                        }
                    }
                    if (nextTask) break;
                }
            }

            let computedMatchedSkills = null;
            let computedOtherSkills = [];
            let computedMissingSkills = null;
            let computedReadiness = null;

            if (prof && prof.targetRole) {
                const reqSkills = matchedRole?.requiredSkills || [];
                const userSkills = prof.skills || [];
                
                computedMatchedSkills = userSkills.filter(
                    us => reqSkills.some(rs => rs.toLowerCase() === us.toLowerCase())
                );

                computedOtherSkills = userSkills.filter(
                    us => !reqSkills.some(rs => rs.toLowerCase() === us.toLowerCase())
                );

                computedMissingSkills = reqSkills.filter(
                    rs => !userSkills.some(us => us.toLowerCase() === rs.toLowerCase())
                );
                
                const readinessTarget = matchedRole?.roleId || prof.targetRole;
                const readinessResult = calculateReadiness({
                    targetRole: readinessTarget,
                    rolesDataset: allRoles,
                    profileSkills: userSkills,
                    profileInterests: prof.interests ?? [],
                    resumeRawText: resume?.rawText ?? '',
                    education: prof.education ?? '',
                    skillsWithLevels: prof.skillsWithLevels ?? []
                });
                
                if (readinessResult && typeof readinessResult.total === 'number') {
                    computedReadiness = readinessResult.total;
                }
            }

            const finalMatchedSkills = computedMatchedSkills !== null ? computedMatchedSkills : (gap?.matchedSkills ?? []);
            const finalOtherSkills = computedOtherSkills;
            const finalMissingSkills = computedMissingSkills !== null ? computedMissingSkills : (gap?.missingSkills ?? []);
            
            let finalReadiness = computedReadiness;
            if (finalReadiness === null) {
                if (gap?.matchedSkills?.length) {
                    finalReadiness = Math.round(((gap.matchedSkills.length) / Math.max(1, gap.matchedSkills.length + (gap.missingSkills?.length ?? 0))) * 100);
                } else {
                    finalReadiness = null;
                }
            }

            const ctx = {
                targetRole: matchedRole?.roleName || targetRole || null,
                skills: prof?.skills ?? gap?.matchedSkills ?? [],
                matchedSkills: finalMatchedSkills,
                otherSkills: finalOtherSkills,
                interests: prof?.interests ?? [],
                missingSkills: finalMissingSkills,
                readinessScore: finalReadiness,
                hasPlan: !!plan,
                nextRoadmapTask: nextTask,
                resumeText: resumeText
            };
            setProfileContext(ctx);
        } catch (err) {
            console.error('Failed to load Lakshyaved profile context:', err);
        }
    }, []);

    // Health check on mount
    useEffect(() => {
        async function checkHealth() {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const data = await res.json();
                    setApiHealth(data);
                    if (!data.aiConfigured) {
                        setAiSource('offline');
                    }
                } else {
                    setAiSource('offline');
                }
            } catch {
                setAiSource('offline');
            }
        }

        checkHealth();
    }, []);

    // Load profile context from Dexie on mount and after auth resolves
    useEffect(() => {
        if (!authLoading) {
            fetchContext();
        }
    }, [authLoading, user, fetchContext]);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const safeAppendToLocalStorage = (msg) => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            let currentSaved = [];
            if (saved) {
                try {
                    currentSaved = JSON.parse(saved);
                } catch (parseErr) {
                    console.warn('Failed to parse chat history from localStorage', parseErr);
                }
            }
            if (!Array.isArray(currentSaved)) currentSaved = [];
            if (!currentSaved.some(m => m.id === msg.id)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify([...currentSaved, msg]));
            }
        } catch (storageErr) {
            console.error('Failed to append message to localStorage', storageErr);
        }
    };

    const handleStop = () => {
        stoppedByUserRef.current = true;
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    };

    const handleSendMessage = async (textToSend, isRetry = false) => {
        const text = (textToSend || inputQuery).trim();
        if (!text || isLoading) return;

        stoppedByUserRef.current = false;
        setHighDemandNotice(null);

        let updatedMessages = messages;
        if (!isRetry) {
            const userMsg = createChatMessage({
                role: 'user',
                content: text
            });
            updatedMessages = [...messages, userMsg];
            setMessages(updatedMessages);
            setInputQuery('');
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMessages));
            } catch (e) {
                console.error('Failed to save chat history to localStorage', e);
            }
        }

        setIsLoading(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setTypingSlow(false);
        typingTimeoutRef.current = setTimeout(() => {
            setTypingSlow(true);
        }, 5000);

        try {
            abortControllerRef.current = new AbortController();

            const apiPayload = {
                messages: updatedMessages
                    .filter(m => m.role === 'user' || m.role === 'assistant')
                    .map(m => ({ role: m.role, content: m.content })),
                context: useProfileContext ? profileContext : null
            };

            const res = await fetch('/api/career-assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload),
                signal: abortControllerRef.current.signal
            });

            if (!res.ok) {
                setAiSource('offline');
                const errData = await res.json().catch(() => ({}));
                const rawMsg = String(errData.error || res.statusText || '');
                const isHighDemand = res.status === 503 || res.status === 429 || rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand');
                
                const offlineContent = generateClientFallback(text, profileContext);
                const assistantMsg = createChatMessage({
                    role: 'assistant',
                    content: offlineContent,
                    source: 'offline-fallback',
                    isFallback: true,
                    originalQuery: text,
                    notice: isHighDemand 
                        ? "Live AI model is experiencing high demand (HTTP 503). Providing offline guidance from Lakshyaved's local data store."
                        : "Showing recommendations from Lakshyaved offline knowledge base."
                });

                safeAppendToLocalStorage(assistantMsg);
                setHighDemandNotice("AI servers are experiencing high traffic (503). Active in offline recommendation mode.");
                setMessages(prev => [...prev, assistantMsg]);
                return;
            }

            const data = await res.json();
            if (data.source && data.source.startsWith('gemini')) {
                setAiSource('live');
            } else if (data.source === 'offline-fallback' || data.source === 'built-in') {
                setAiSource('offline');
            }

            if (data.isFallback) {
                setHighDemandNotice("Live AI temporarily unavailable due to high demand. Showing offline recommendations.");
            }

            const assistantMsg = createChatMessage({
                role: 'assistant',
                content: data.reply || "I couldn't formulate a response. Please try asking again.",
                source: data.source || 'gemini-2.5-flash',
                isFallback: Boolean(data.isFallback),
                originalQuery: text,
                notice: data.notice
            });

            safeAppendToLocalStorage(assistantMsg);
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            if (err?.name === 'AbortError') {
                if (stoppedByUserRef.current) {
                    stoppedByUserRef.current = false;
                    setMessages(prev => {
                        const lastIdx = prev.length - 1;
                        if (lastIdx >= 0 && prev[lastIdx].role === 'user') {
                            const updated = [...prev];
                            updated[lastIdx] = { ...updated[lastIdx], stopped: true };
                            try {
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                            } catch (e) {
                                console.error('Failed to save chat history', e);
                            }
                            return updated;
                        }
                        return prev;
                    });
                }
                return;
            }
            console.warn('Network or server error in Career Assistant:', err);
            setAiSource('offline');
            const offlineContent = generateClientFallback(text, profileContext);
            const assistantMsg = createChatMessage({
                role: 'assistant',
                content: offlineContent,
                source: 'offline-fallback',
                isFallback: true,
                originalQuery: text,
                notice: "Live AI is temporarily unavailable. Showing recommendations from Lakshyaved's local career data store."
            });

            safeAppendToLocalStorage(assistantMsg);
            setHighDemandNotice("Live AI is temporarily unavailable. Using offline recommendations.");
            setMessages(prev => [...prev, assistantMsg]);
        } finally {
            abortControllerRef.current = null;
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            setTypingSlow(false);
            setIsLoading(false);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    // Auto-send prompt when navigated with ?prompt=...
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        if (promptParam && promptParam.trim()) {
            if (!isLoading && !hasAutoSentRef.current) {
                hasAutoSentRef.current = true;
                const cleanPrompt = promptParam.trim();
                setSearchParams({}, { replace: true });
                handleSendMessage(cleanPrompt);
            }
        } else {
            hasAutoSentRef.current = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, isLoading]);

    useEffect(() => {
        if (!showClearConfirm) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') setShowClearConfirm(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showClearConfirm]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading) {
                handleSendMessage();
            }
        }
    };

    const handleClearHistory = () => {
        setShowClearConfirm(true);
    };

    const confirmClearHistory = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('Failed to clear chat history from localStorage', e);
        }
        const freshGreeting = {
            ...INITIAL_GREETING,
            id: `welcome_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([freshGreeting]);
        setHighDemandNotice(null);
        setInputQuery('');
        setShowClearConfirm(false);
        setClearFeedback("Conversation history cleared successfully");
        setTimeout(() => {
            setClearFeedback(null);
        }, 3000);
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    const handleCopy = (content, index) => {
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getSuggestedQuestions = () => {
        const qs = [];
        if (profileContext?.missingSkills?.length > 0) {
            qs.push("What's my biggest skill gap?");
        }
        if (profileContext?.hasPlan) {
            qs.push("What should I study this week?");
        }
        if (profileContext?.targetRole) {
            qs.push(`How do I prepare for a ${profileContext.targetRole} interview?`);
        }
        qs.push("Review my resume", "Am I ready to apply for jobs?", "How do I negotiate my first salary?");
        return qs;
    };

    return (
        <div className="h-full flex flex-col overflow-hidden gap-4 max-w-7xl mx-auto w-full">
            {/* Top Bar / Header Card */}
            <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-4 border border-slate-200 dark:border-[#1e293b] shadow-lg flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d]">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Career AI Assistant
                            </h2>
                            {aiSource === 'live' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/30 uppercase tracking-wider">
                                    Live
                                </span>
                            )}
                            {aiSource === 'offline' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                                    Offline
                                </span>
                            )}
                            {aiSource === 'unknown' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                                    …
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {apiHealth.primaryModel || "Gemini 2.5 Flash"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    {/* Clear history button */}
                    <button
                        id="clear-conversation-button"
                        onClick={handleClearHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                        title="Clear conversation"
                    >
                        <Trash2 size={15} />
                        <span className="hidden sm:inline">Clear Chat</span>
                    </button>
                </div>
            </div>

            {/* Clear Success Feedback Banner */}
            {clearFeedback && (
                <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <Check size={16} />
                        <span className="font-semibold">{clearFeedback}</span>
                    </div>
                    <button onClick={() => setClearFeedback(null)} className="text-[#13ec6d] hover:opacity-75 cursor-pointer font-bold text-xs">✕</button>
                </div>
            )}

            {/* High demand notification banner */}
            {highDemandNotice && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                        <span>{highDemandNotice}</span>
                    </div>
                    <button onClick={() => setHighDemandNotice(null)} className="text-amber-500 dark:text-amber-400 hover:opacity-75 font-bold ml-2 cursor-pointer text-sm">✕</button>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="flex-1 min-h-0 grid lg:grid-cols-3 gap-6 min-w-0">
                
                {/* Chat Column */}
                <div className="lg:col-span-2 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#121a2a] rounded-2xl border border-slate-200 dark:border-[#1e293b] shadow-lg min-w-0">
                    {/* Messages Viewport */}
                    <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
                        <div className="max-w-5xl mx-auto w-full px-4 md:px-6 py-4 sm:py-6 space-y-6 min-w-0">
                            {messages.map((msg, index) => {
                                const isUser = msg.role === 'user';
                                return (
                                    <div key={msg.id || index} className={`flex gap-3 sm:gap-4 min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        {!isUser && (
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs mt-1">
                                                L
                                            </div>
                                        )}

                                        <div className={`flex flex-col min-w-0 ${isUser ? 'items-end max-w-[80%]' : 'items-start max-w-[92%]'}`}>
                                            <div
                                                className={`relative group rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-full break-words overflow-hidden ${
                                                    isUser
                                                        ? 'bg-[#13ec6d]/15 text-emerald-900 dark:text-emerald-200'
                                                        : 'bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                                                }`}
                                            >
                                                {isUser ? (
                                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                                ) : (
                                                    <div className="career-ai-markdown space-y-3 prose dark:prose-invert max-w-none min-w-0 break-words">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                    </div>
                                                )}

                                                {!isUser && (
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleCopy(msg.content, index)}
                                                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-white transition-colors cursor-pointer"
                                                            title="Copy response"
                                                        >
                                                            {copiedIndex === index ? <Check size={14} className="text-[#13ec6d]" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isUser && msg.stopped && (
                                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                                                    Stopped.
                                                </span>
                                            )}

                                            {/* Notice & Retry Action for Fallback */}
                                            {!isUser && msg.isFallback && (
                                                <div className="flex items-center gap-2 mt-1.5 px-1 flex-wrap">
                                                    <span className="text-[11px] text-amber-500 dark:text-amber-400 font-medium">
                                                        ⚠️ Offline mode — using built-in knowledge, not live AI.
                                                    </span>
                                                    {msg.notice && <span className="text-[11px] text-amber-500/80 dark:text-amber-400/80 italic">({msg.notice})</span>}
                                                    {msg.originalQuery && (
                                                        <button
                                                            onClick={() => handleSendMessage(msg.originalQuery, true)}
                                                            disabled={isLoading}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#13ec6d] hover:underline cursor-pointer bg-[#13ec6d]/10 px-2 py-0.5 rounded border border-[#13ec6d]/20"
                                                        >
                                                            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
                                                            Retry with Live AI
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {isLoading && (
                                <div className="flex gap-3 sm:gap-4 items-start">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs mt-1 animate-pulse">
                                        L
                                    </div>
                                    <div className="bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                        {typingSlow && (
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                                                Still thinking…
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {messages.length <= 1 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {getSuggestedQuestions().map(q => (
                                        <button
                                            key={q}
                                            onClick={() => handleSendMessage(q)}
                                            disabled={isLoading}
                                            className="text-left px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#1a2333] hover:bg-slate-100 dark:hover:bg-[#233045] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm cursor-pointer"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="shrink-0 p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0b0f19]">
                        <div className="max-w-5xl mx-auto w-full">
                            {!isLoading && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {QUICK_ACTIONS.map(a => (
                                        <button 
                                            key={a.label} 
                                            onClick={() => handleSendMessage(a.query)} 
                                            className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
                                        >
                                            {a.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="relative flex items-center rounded-xl bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-white/10 p-1 focus-within:border-[#13ec6d]/50 focus-within:ring-1 focus-within:ring-[#13ec6d]/50 transition-all">
                                <textarea
                                    ref={inputRef}
                                    value={inputQuery}
                                    onChange={(e) => setInputQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask about roles, skills, interviews, or your roadmap..."
                                    rows={1}
                                    className="w-full resize-none bg-transparent px-3 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none min-h-[44px] max-h-32"
                                />
                                {isLoading ? (
                                    <button
                                        type="button"
                                        onClick={handleStop}
                                        title="Stop generating"
                                        aria-label="Stop generating"
                                        className="flex-shrink-0 h-10 w-10 mr-1 rounded-full flex items-center justify-center bg-[#13ec6d] text-[#0b0f19] hover:bg-[#13ec6d]/90 shadow-md transition-all cursor-pointer"
                                    >
                                        <Square size={16} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSendMessage()}
                                        disabled={!inputQuery.trim()}
                                        title="Send message"
                                        aria-label="Send message"
                                        className={`flex-shrink-0 h-10 w-10 mr-1 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                            inputQuery.trim()
                                                ? 'bg-[#13ec6d] text-[#0b0f19] hover:bg-[#13ec6d]/90 shadow-md'
                                                : 'bg-slate-200 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={16} />
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
                                <span>Enter to send • Shift+Enter for new line</span>
                                <span>{apiHealth.aiConfigured ? apiHealth.primaryModel : "Offline Engine"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Profile Sidebar (Right Column, Desktop Only) */}
                <div className="hidden lg:block lg:col-span-1 min-h-0 overflow-y-auto">
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121a2a] p-5 flex flex-col shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Your Profile</h3>
                            <button 
                                onClick={fetchContext} 
                                className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                            >
                                <RefreshCw size={10} /> Refresh
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Target Role</div>
                                <div className="text-sm text-slate-900 dark:text-white font-medium">
                                    {profileContext?.targetRole || <span className="text-slate-400 italic">Not set</span>}
                                </div>
                            </div>

                            <div>
                                <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Readiness Score</div>
                                {profileContext?.readinessScore != null ? (
                                    <div>
                                        <div className="text-sm text-[#13ec6d] font-bold">{profileContext?.readinessScore ?? 0}%</div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Based on your saved profile</p>
                                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                            <div className="h-full bg-[#13ec6d] rounded-full transition-all duration-500" style={{ width: `${profileContext?.readinessScore ?? 0}%` }} />
                                        </div>
                                        {(profileContext?.readinessScore ?? 0) < 30 && (
                                            <p className="text-[11px] text-emerald-600 dark:text-[#13ec6d] mt-1">
                                                Focus on your top missing skill below to raise this fastest.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic">Score not available</div>
                                )}
                            </div>

                            <div>
                                <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-2">Matched to Role</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(profileContext?.matchedSkills?.length ?? 0) > 0 ? (profileContext?.matchedSkills ?? []).map(s => (
                                        <span key={s} className="px-2 py-1 rounded-md text-[10px] font-bold bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/20">
                                            {s}
                                        </span>
                                    )) : <span className="text-xs text-slate-400 italic">No skills yet — add them on Career Simulator</span>}
                                </div>
                            </div>

                            {(profileContext?.otherSkills?.length ?? 0) > 0 && (
                                <div>
                                    <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-2">Other Skills</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(profileContext?.otherSkills ?? []).slice(0, 6).map(s => (
                                            <span key={s} className="px-2 py-1 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-2">Top 3 Missing Skills</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {(profileContext?.missingSkills?.length ?? 0) > 0 ? (profileContext?.missingSkills ?? []).slice(0, 3).map(s => (
                                        <span key={s} className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                            {s}
                                        </span>
                                    )) : <span className="text-xs text-slate-400 italic">None</span>}
                                </div>
                            </div>

                            {profileContext?.nextRoadmapTask && (
                                <div>
                                    <div className="text-[11px] text-slate-500 uppercase font-bold tracking-wider mb-1">Next Roadmap Task</div>
                                    <div className="text-sm text-slate-900 dark:text-slate-300 font-medium">
                                        <span className="flex items-start gap-2">
                                            <span className="text-[#13ec6d] mt-0.5">→</span>
                                            {profileContext.nextRoadmapTask}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => navigate('/career')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#13ec6d]/10 text-emerald-600 dark:text-[#13ec6d] border border-[#13ec6d]/30 hover:bg-[#13ec6d]/20 transition-colors cursor-pointer"
                            >
                                Go to Career Simulator →
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Clear Conversation Confirmation Modal */}
            {showClearConfirm && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowClearConfirm(false)}
                >
                    <div 
                        className="bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-sm">
                                <Trash2 size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    Clear Conversation History?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    This will reset your chat and restore the initial greeting.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            Are you sure you want to clear this conversation? Your saved local chat history will be erased. This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmClearHistory}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 size={14} />
                                <span>Yes, Clear Chat</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
