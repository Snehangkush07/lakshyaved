import { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Hexagon, Sparkles, Lock, Mail, User, Briefcase, ArrowRight, 
    Eye, EyeOff, CheckCircle2, ShieldCheck, Sun, Moon, Zap
} from 'lucide-react';
import Login3DScene from '../../ui/components/Login3DScene';
import { useAuth, DEMO_USERS } from '../../core/context/AuthContext';
import { useTheme } from '../../core/context/ThemeContext';
import { getAllRoles } from '../../core/logic/dataStore';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, demoLogin, continueAsGuest } = useAuth();
    const { toggleTheme, isDark } = useTheme();

    const [tab, setTab] = useState('signin'); // 'signin' | 'signup' | 'demo'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [targetRole, setTargetRole] = useState('Full Stack Developer');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const availableRoles = getAllRoles();

    // 3D Card Tilt state
    const cardRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [cardTransform, setCardTransform] = useState({
        rotateX: 0,
        rotateY: 0,
        sheenX: 50,
        sheenY: 50
    });

    const handleMouseMove = (e) => {
        const { innerWidth, innerHeight } = window;
        const normX = (e.clientX / innerWidth) * 2 - 1; // -1 to 1
        const normY = (e.clientY / innerHeight) * 2 - 1;
        setMousePos({ x: normX, y: normY });

        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const cardX = e.clientX - rect.left;
        const cardY = e.clientY - rect.top;

        const pX = (cardX / rect.width) * 100;
        const pY = (cardY / rect.height) * 100;

        const maxAngle = 10;
        const rotY = ((cardX - rect.width / 2) / (rect.width / 2)) * maxAngle;
        const rotX = -((cardY - rect.height / 2) / (rect.height / 2)) * maxAngle;

        setCardTransform({
            rotateX: rotX,
            rotateY: rotY,
            sheenX: pX,
            sheenY: pY
        });
    };

    const handleMouseLeave = () => {
        setCardTransform({
            rotateX: 0,
            rotateY: 0,
            sheenX: 50,
            sheenY: 50
        });
        setMousePos({ x: 0, y: 0 });
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError(null);
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }

        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 600)); // smooth visual feedback
            const displayName = email.split('@')[0].replace(/[._]/g, ' ') || 'Developer';
            await login({
                email: email.trim(),
                name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
                targetRole: 'Full Stack Developer',
            });
            const origin = location.state?.from?.pathname || '/career';
            navigate(origin, { replace: true });
        } catch (err) {
            setError(err.message || 'Failed to sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim() || !email.trim() || !password.trim()) {
            setError('Please complete all required fields.');
            return;
        }

        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 700));
            await login({
                name: name.trim(),
                email: email.trim(),
                targetRole: targetRole || 'Full Stack Developer',
            });
            navigate('/career', { replace: true });
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleDemoSelect = async (demoId) => {
        setLoading(true);
        try {
            await new Promise((r) => setTimeout(r, 500));
            await demoLogin(demoId);
            navigate('/career', { replace: true });
        } catch {
            setError('Demo login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuest = async () => {
        setLoading(true);
        try {
            await continueAsGuest();
            navigate('/career', { replace: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-gradient-to-br from-[#090d16] via-[#0b0f19] to-[#0d1526] dark:from-[#090d16] dark:via-[#0b0f19] dark:to-[#0d1526] text-slate-100 select-none"
        >
            {/* 3D WebGL Three.js Holographic Constellation */}
            <Login3DScene mousePos={mousePos} />

            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#13ec6d]/15 rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-[#00f0ff]/10 rounded-full blur-[140px] pointer-events-none" />

            {/* Top Bar Header with Brand & Theme Toggle */}
            <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 sm:px-10 py-5">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#13ec6d]/15 border border-[#13ec6d]/40 text-[#13ec6d] shadow-[0_0_15px_rgba(19,236,109,0.3)]">
                        <Hexagon size={22} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <span className="text-lg font-black tracking-wider text-white">LAKSHYAVED</span>
                        <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/30">
                            Career Nexus
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Mode Toggle Button */}
                    <button
                        id="login-theme-toggle"
                        onClick={toggleTheme}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 transition-all shadow-sm backdrop-blur-md cursor-pointer hover:border-[#13ec6d]/50"
                        title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
                    >
                        {isDark ? (
                            <>
                                <Sun size={15} className="text-amber-400 animate-spin-slow" />
                                <span className="hidden sm:inline">Light Mode</span>
                            </>
                        ) : (
                            <>
                                <Moon size={15} className="text-cyan-400" />
                                <span className="hidden sm:inline">Cyber Dark</span>
                            </>
                        )}
                    </button>

                    {/* Quick Guest Bypass */}
                    <button
                        id="login-guest-btn"
                        onClick={handleGuest}
                        disabled={loading}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all cursor-pointer"
                    >
                        Explore as Guest
                    </button>
                </div>
            </header>

            {/* 3D Perspective Card Container */}
            <div 
                className="relative z-20 w-full max-w-md pt-12 sm:pt-6"
                style={{ perspective: '1200px' }}
            >
                <div
                    ref={cardRef}
                    style={{
                        transform: `rotateX(${cardTransform.rotateX}deg) rotateY(${cardTransform.rotateY}deg)`,
                        transformStyle: 'preserve-3d',
                        transition: 'transform 0.12s ease-out',
                    }}
                    className="relative rounded-3xl bg-[#121a2a]/85 backdrop-blur-xl border border-white/15 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_2px_1px_rgba(255,255,255,0.1)] overflow-hidden"
                >
                    {/* Dynamic Specular Sheen Highlight */}
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{
                            background: `radial-gradient(circle 320px at ${cardTransform.sheenX}% ${cardTransform.sheenY}%, rgba(255,255,255,0.09), transparent 80%)`,
                        }}
                    />

                    {/* Corner Cyber Accent Borders */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#13ec6d]/20 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[#00f0ff]/15 to-transparent pointer-events-none" />

                    {/* 3D Depth Layer 1: Header */}
                    <div style={{ transform: 'translateZ(28px)' }} className="space-y-1.5 text-center mb-6">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#13ec6d]/10 text-[#13ec6d] border border-[#13ec6d]/30 mb-1">
                            <Sparkles size={13} />
                            <span>AI-Powered Career Intelligence</span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {tab === 'signin' && 'Welcome Back'}
                            {tab === 'signup' && 'Create Your Account'}
                            {tab === 'demo' && 'Instant Demo Portals'}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {tab === 'signin' && 'Access your skill gap analytics, roadmaps, and AI mentor'}
                            {tab === 'signup' && 'Begin your customized engineering journey today'}
                            {tab === 'demo' && 'Select a pre-configured professional persona'}
                        </p>
                    </div>

                    {/* 3D Depth Layer 2: Tabs Navigation */}
                    <div 
                        style={{ transform: 'translateZ(24px)' }} 
                        className="grid grid-cols-3 p-1 rounded-xl bg-slate-900/90 border border-slate-800 mb-5"
                    >
                        <button
                            type="button"
                            onClick={() => { setTab('signin'); setError(null); }}
                            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                tab === 'signin'
                                    ? 'bg-[#13ec6d] text-[#0b0f19] shadow-[0_0_12px_rgba(19,236,109,0.3)]'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            type="button"
                            onClick={() => { setTab('signup'); setError(null); }}
                            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                tab === 'signup'
                                    ? 'bg-[#13ec6d] text-[#0b0f19] shadow-[0_0_12px_rgba(19,236,109,0.3)]'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            Sign Up
                        </button>
                        <button
                            type="button"
                            onClick={() => { setTab('demo'); setError(null); }}
                            className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                tab === 'demo'
                                    ? 'bg-[#00f0ff] text-[#0b0f19] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Zap size={12} fill="currentColor" />
                            <span>1-Click Demo</span>
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div 
                            style={{ transform: 'translateZ(30px)' }}
                            className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-in fade-in"
                        >
                            <span>⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* 3D Depth Layer 3: Forms */}
                    <div style={{ transform: 'translateZ(32px)' }}>
                        {/* 1. SIGN IN FORM */}
                        {tab === 'signin' && (
                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                        Email Address
                                    </label>
                                    <div className="relative flex items-center">
                                        <Mail size={16} className="absolute left-3.5 text-slate-400" />
                                        <input
                                            id="signin-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="alex.chen@lakshyaved.dev"
                                            required
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-300">
                                            Password
                                        </label>
                                        <span className="text-[11px] text-[#13ec6d] hover:underline cursor-pointer">
                                            Forgot?
                                        </span>
                                    </div>
                                    <div className="relative flex items-center">
                                        <Lock size={16} className="absolute left-3.5 text-slate-400" />
                                        <input
                                            id="signin-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••••••"
                                            required
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 text-slate-400 hover:text-slate-200"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    id="signin-submit-btn"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#0b0f19] shadow-[0_0_18px_rgba(19,236,109,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Enter Lakshyaved Nexus</span>
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* 2. SIGN UP FORM */}
                        {tab === 'signup' && (
                            <form onSubmit={handleSignUp} className="space-y-3.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Full Name
                                    </label>
                                    <div className="relative flex items-center">
                                        <User size={16} className="absolute left-3.5 text-slate-400" />
                                        <input
                                            id="signup-name"
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Alex Chen"
                                            required
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Target Career Role
                                    </label>
                                    <div className="relative flex items-center">
                                        <Briefcase size={16} className="absolute left-3.5 text-slate-400" />
                                        <select
                                            id="signup-role"
                                            value={targetRole}
                                            onChange={(e) => setTargetRole(e.target.value)}
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        >
                                            {availableRoles.slice(0, 15).map((r) => (
                                                <option key={r.roleId || r.roleName} value={r.roleName}>
                                                    {r.roleName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Email Address
                                    </label>
                                    <div className="relative flex items-center">
                                        <Mail size={16} className="absolute left-3.5 text-slate-400" />
                                        <input
                                            id="signup-email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="alex@example.com"
                                            required
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Password
                                    </label>
                                    <div className="relative flex items-center">
                                        <Lock size={16} className="absolute left-3.5 text-slate-400" />
                                        <input
                                            id="signup-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Min 6 characters"
                                            required
                                            className="w-full rounded-xl bg-slate-900/80 border border-slate-700/80 pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 text-slate-400 hover:text-slate-200"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    id="signup-submit-btn"
                                    type="submit"
                                    disabled={loading}
                                    className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#0b0f19] shadow-[0_0_18px_rgba(19,236,109,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Initialize Profile</span>
                                            <ArrowRight size={15} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* 3. ONE-CLICK DEMO PERSONAS */}
                        {tab === 'demo' && (
                            <div className="space-y-2.5">
                                <p className="text-[11px] text-slate-400 mb-2">
                                    Click any persona to log in instantly with realistic career data:
                                </p>
                                {DEMO_USERS.map((demo) => (
                                    <div
                                        key={demo.id}
                                        onClick={() => handleDemoSelect(demo.id)}
                                        className="group p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-[#00f0ff]/50 hover:bg-slate-800/80 transition-all cursor-pointer flex items-center gap-3.5 shadow-sm"
                                    >
                                        <img
                                            src={demo.avatar}
                                            alt={demo.name}
                                            className="h-10 w-10 rounded-xl object-cover border border-white/10 group-hover:border-[#00f0ff]/60 transition-colors"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-white group-hover:text-[#00f0ff] transition-colors truncate">
                                                    {demo.name}
                                                </h4>
                                                <span className="text-[10px] font-semibold text-[#13ec6d] px-1.5 py-0.5 rounded bg-[#13ec6d]/10 border border-[#13ec6d]/20">
                                                    {demo.badge}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                {demo.role}
                                            </p>
                                        </div>
                                        <ArrowRight size={15} className="text-slate-500 group-hover:text-[#00f0ff] group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Security / Offline Guarantee Badge */}
                    <div 
                        style={{ transform: 'translateZ(20px)' }}
                        className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400"
                    >
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#13ec6d]" />
                            <span>100% Offline-First Dexie Storage</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#13ec6d]">
                            <CheckCircle2 size={13} />
                            <span>Privacy Assured</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
