import { useState, useEffect, useRef } from 'react';
import { 
    Sparkles, Send, Trash2, RotateCcw, Bot, User, 
    Copy, Check, Compass, 
    BookOpen, Briefcase, Award, Zap, RefreshCw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { getProfile, getSkillGapResults } from '../../core/db/repo';
import { getAllRoles } from '../../core/logic/dataStore';

const SUGGESTED_QUESTIONS = [
    {
        icon: Briefcase,
        label: "Coding Interviews",
        query: "How to prepare for coding interviews? What problem patterns should I focus on?"
    },
    {
        icon: Compass,
        label: "Full Stack Roadmap",
        query: "What is the recommended career path and milestone roadmap for a Full Stack Developer?"
    },
    {
        icon: Award,
        label: "Resume Building",
        query: "What are the best resume building tips and formulas to pass ATS scans and impress engineering managers?"
    },
    {
        icon: Zap,
        label: "Skill Gap Advice",
        query: "Based on my current Lakshyaved profile, what high-priority skills should I learn next to improve my readiness?"
    },
    {
        icon: BookOpen,
        label: "Behavioral Interviews",
        query: "How should I structure answers using the STAR method for behavioral tech interview questions?"
    }
];

const INITIAL_GREETING = {
    id: 'welcome-msg',
    role: 'assistant',
    content: `👋 **Welcome to the Lakshyaved Career AI Assistant!**

I am your dedicated career mentor, interview coach, and technical growth strategist. I can help you with:

- 🎯 **Tailored Roadmaps:** Step-by-step pathways across software engineering, cloud, data, and management.
- 💡 **Interview Prep:** Data structure patterns, system design fundamentals, and behavioral STAR stories.
- 📄 **Resume Optimization:** Quantifiable metric formulas, ATS guidelines, and portfolio advice.
- 📊 **Contextual Guidance:** Connected with your Lakshyaved profile to bridge missing skills and target roles.

Choose a suggested topic below or type any career question to get started!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'system'
};

const STORAGE_KEY = 'lakshyaved_ai_chat_history_v1';

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
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [useProfileContext, setUseProfileContext] = useState(true);
    const [profileContext, setProfileContext] = useState(null);
    const [apiHealth, setApiHealth] = useState({ aiConfigured: false, primaryModel: 'gemini-3.8-flash' });
    const [highDemandNotice, setHighDemandNotice] = useState(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearFeedback, setClearFeedback] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Save chat history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save chat history', e);
        }
    }, [messages]);

    // Load profile context from Dexie
    useEffect(() => {
        async function fetchContext() {
            try {
                const [prof, gap] = await Promise.all([
                    getProfile().catch(() => null),
                    getSkillGapResults().catch(() => null)
                ]);

                const ctx = {
                    targetRole: prof?.targetRole || gap?.targetRole || 'Software Engineer',
                    skills: prof?.skills || gap?.matchedSkills || [],
                    interests: prof?.interests || [],
                    missingSkills: gap?.missingSkills || [],
                    readinessScore: gap?.matchedSkills?.length 
                        ? Math.round((gap.matchedSkills.length / Math.max(1, gap.matchedSkills.length + (gap.missingSkills?.length || 0))) * 100)
                        : null
                };
                setProfileContext(ctx);
            } catch (err) {
                console.error('Failed to load Lakshyaved profile context:', err);
            }
        }

        async function checkHealth() {
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const data = await res.json();
                    setApiHealth(data);
                }
            } catch {
                // Ignore failure in health check
            }
        }

        fetchContext();
        checkHealth();
    }, []);

    // Auto-scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSendMessage = async (textToSend, isRetry = false) => {
        const text = (textToSend || inputQuery).trim();
        if (!text || isLoading) return;

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
        }

        setIsLoading(true);

        try {
            const apiPayload = {
                messages: updatedMessages
                    .filter(m => m.role === 'user' || m.role === 'assistant')
                    .map(m => ({ role: m.role, content: m.content })),
                context: useProfileContext ? profileContext : null
            };

            const res = await fetch('/api/career-assistant/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(apiPayload)
            });

            if (!res.ok) {
                // Parse error cleanly without throwing raw JSON
                const errData = await res.json().catch(() => ({}));
                const rawMsg = String(errData.error || res.statusText || '');
                const isHighDemand = res.status === 503 || res.status === 429 || rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand');
                
                // Fallback to client-side offline career recommendations
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

                setHighDemandNotice("AI servers are experiencing high traffic (503). Active in offline recommendation mode.");
                setMessages(prev => [...prev, assistantMsg]);
                return;
            }

            const data = await res.json();
            if (data.isFallback) {
                setHighDemandNotice("Live AI temporarily unavailable due to high demand. Showing offline recommendations.");
            }

            const assistantMsg = createChatMessage({
                role: 'assistant',
                content: data.reply || "I couldn't formulate a response. Please try asking again.",
                source: data.source || 'gemini-3.8-flash',
                isFallback: Boolean(data.isFallback),
                originalQuery: text,
                notice: data.notice
            });

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.warn('Network or server error in Career Assistant:', err);
            // Fallback to client-side local data store
            const offlineContent = generateClientFallback(text, profileContext);
            const assistantMsg = createChatMessage({
                role: 'assistant',
                content: offlineContent,
                source: 'offline-fallback',
                isFallback: true,
                originalQuery: text,
                notice: "Live AI is temporarily unavailable. Showing recommendations from Lakshyaved's local career data store."
            });

            setHighDemandNotice("Live AI is temporarily unavailable. Using offline recommendations.");
            setMessages(prev => [...prev, assistantMsg]);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    // Close clear confirmation modal on Escape key
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
            handleSendMessage();
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

    return (
        <div className="max-w-6xl mx-auto flex flex-col h-[calc(100vh-6.5rem)] space-y-4">
            {/* Top Bar / Header Card */}
            <div className="bg-white dark:bg-[#121a2a] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-[#1e293b] shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d] shadow-[0_0_12px_rgba(19,236,109,0.15)]">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Career AI Assistant
                            </h2>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/30">
                                {apiHealth.aiConfigured ? 'Gemini 2.5 Flash • Auto-Retry' : 'Lakshyaved Career Engine'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Actionable career roadmaps, interview preparation, and resume guidance
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 ml-auto">
                    {/* Context Badge / Toggle */}
                    {profileContext && (
                        <button
                            onClick={() => setUseProfileContext(!useProfileContext)}
                            title="Toggle profile synchronization with AI"
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                useProfileContext
                                    ? 'bg-[#13ec6d]/10 text-[#13ec6d] border-[#13ec6d]/30 hover:bg-[#13ec6d]/20'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10 hover:text-white'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${useProfileContext ? 'bg-[#13ec6d]' : 'bg-slate-400'}`} />
                            <span className="truncate max-w-[160px] sm:max-w-[220px]">
                                {useProfileContext ? `Profile: ${profileContext.targetRole}` : 'Profile Sync Off'}
                            </span>
                        </button>
                    )}

                    {/* Clear history button */}
                    <button
                        id="clear-conversation-button"
                        onClick={handleClearHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
                        title="Clear conversation"
                        aria-label="Clear conversation history"
                    >
                        <Trash2 size={15} />
                        <span className="hidden sm:inline">Clear Chat</span>
                    </button>
                </div>
            </div>

            {/* Clear Success Feedback Banner */}
            {clearFeedback && (
                <div 
                    id="clear-success-toast"
                    className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d] px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-150"
                >
                    <div className="flex items-center gap-2">
                        <Check size={16} />
                        <span className="font-semibold">{clearFeedback}</span>
                    </div>
                    <button
                        onClick={() => setClearFeedback(null)}
                        className="text-[#13ec6d] hover:opacity-75 cursor-pointer font-bold text-xs"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* High demand notification banner */}
            {highDemandNotice && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                        <span>{highDemandNotice}</span>
                    </div>
                    <button 
                        onClick={() => setHighDemandNotice(null)}
                        className="text-amber-400 hover:text-amber-200 font-bold ml-2 cursor-pointer text-sm"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 bg-white dark:bg-[#121a2a] rounded-2xl border border-slate-200 dark:border-[#1e293b] shadow-lg flex flex-col overflow-hidden">
                {/* Messages Viewport */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth">
                    {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div
                                key={msg.id || index}
                                className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isUser && (
                                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d] flex items-center justify-center mt-1 shadow-sm">
                                        <Bot size={18} />
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[90%] sm:max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                                    {/* Author & Timestamp */}
                                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                                        <span>{isUser ? 'You' : 'Lakshyaved AI Mentor'}</span>
                                        <span>•</span>
                                        <span>{msg.timestamp}</span>
                                        {!isUser && msg.source && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                                                {msg.source}
                                            </span>
                                        )}
                                    </div>

                                    {/* Bubble Content */}
                                    <div
                                        className={`relative group rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                                            isUser
                                                ? 'bg-[#13ec6d] text-[#0b0f19] font-medium shadow-md rounded-br-none'
                                                : 'bg-[#f8fafc] dark:bg-[#0b0f19]/70 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#1e293b] shadow-sm rounded-bl-none'
                                        }`}
                                    >
                                        {isUser ? (
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                        ) : (
                                            <div className="career-ai-markdown space-y-3 prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                                                <Markdown>{msg.content}</Markdown>
                                            </div>
                                        )}

                                        {/* Copy button for assistant responses */}
                                        {!isUser && (
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                                <button
                                                    onClick={() => handleCopy(msg.content, index)}
                                                    className="p-1.5 rounded-lg bg-slate-200 dark:bg-[#1e293b] text-slate-600 dark:text-slate-400 hover:text-white transition-colors cursor-pointer"
                                                    title="Copy response"
                                                >
                                                    {copiedIndex === index ? (
                                                        <Check size={14} className="text-[#13ec6d]" />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Notice & Retry Action for Fallback */}
                                    {!isUser && msg.isFallback && (
                                        <div className="flex items-center gap-2 mt-1.5 px-1 flex-wrap">
                                            {msg.notice && (
                                                <span className="text-[11px] text-amber-400/90 italic">
                                                    ℹ️ {msg.notice}
                                                </span>
                                            )}
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

                                    {!isUser && !msg.isFallback && msg.notice && (
                                        <p className="text-[11px] text-slate-500 mt-1.5 px-1 italic">
                                            ℹ️ {msg.notice}
                                        </p>
                                    )}
                                </div>

                                {isUser && (
                                    <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 flex items-center justify-center mt-1 shadow-sm">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Smooth Loading Indicator */}
                    {isLoading && (
                        <div className="flex gap-3 sm:gap-4 items-start">
                            <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-[#13ec6d]/10 border border-[#13ec6d]/30 text-[#13ec6d] flex items-center justify-center mt-1 animate-pulse">
                                <Bot size={18} />
                            </div>
                            <div className="bg-[#f8fafc] dark:bg-[#0b0f19]/70 border border-slate-200 dark:border-[#1e293b] rounded-2xl rounded-bl-none px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="h-2 w-2 rounded-full bg-[#13ec6d] animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-xs text-slate-400 font-medium ml-2">
                                        Consulting Gemini 2.5 Flash & analyzing strategy...
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions Section */}
                {messages.length <= 3 && (
                    <div className="px-4 sm:px-6 pt-2 pb-3 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                            <Sparkles size={12} className="text-[#13ec6d]" /> Suggested Questions
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {SUGGESTED_QUESTIONS.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(item.query)}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap bg-white dark:bg-[#1a2333] hover:bg-slate-100 dark:hover:bg-[#233045] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm hover:border-[#13ec6d]/40 cursor-pointer"
                                >
                                    <item.icon size={14} className="text-[#13ec6d]" />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 border-t border-slate-200 dark:border-[#1e293b] bg-white dark:bg-[#121a2a]">
                    <div className="relative flex items-center rounded-xl bg-slate-100 dark:bg-[#0b0f19] border border-slate-200 dark:border-[#1e293b] focus-within:border-[#13ec6d]/50 focus-within:ring-1 focus-within:ring-[#13ec6d]/50 transition-all">
                        <textarea
                            ref={inputRef}
                            value={inputQuery}
                            onChange={(e) => setInputQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask any career question, interview advice, or resume tip... (Press Enter to send)"
                            rows={1}
                            disabled={isLoading}
                            className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none max-h-32 min-h-[48px]"
                        />
                        <div className="flex items-center pr-3 gap-2">
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputQuery.trim() || isLoading}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg font-bold transition-all cursor-pointer ${
                                    inputQuery.trim() && !isLoading
                                        ? 'bg-[#13ec6d] text-[#0b0f19] hover:bg-[#13ec6d]/90 shadow-[0_0_10px_rgba(19,236,109,0.3)]'
                                        : 'bg-slate-300 dark:bg-white/5 text-slate-500 cursor-not-allowed'
                                }`}
                                title="Send question"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] text-slate-600 dark:text-slate-300">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px] text-slate-600 dark:text-slate-300">Shift + Enter</kbd> for new line</span>
                        <span>Primary: Gemini 2.5 Flash • Offline Engine Ready</span>
                    </div>
                </div>
            </div>

            {/* Clear Conversation Confirmation Modal */}
            {showClearConfirm && (
                <div 
                    id="clear-conversation-backdrop"
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
                    onClick={() => setShowClearConfirm(false)}
                >
                    <div 
                        id="clear-conversation-dialog"
                        className="bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-[#1e293b] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="clear-modal-title"
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="flex-shrink-0 h-11 w-11 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shadow-sm">
                                <Trash2 size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 id="clear-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
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
                                id="cancel-clear-btn"
                                type="button"
                                onClick={() => setShowClearConfirm(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                id="confirm-clear-btn"
                                type="button"
                                onClick={confirmClearHistory}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                            >
                                <Trash2 size={14} />
                                <span>Yes, Clear Conversation</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
