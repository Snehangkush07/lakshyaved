import { useState, useRef, useEffect } from 'react';
import { Menu, Sparkles, Sun, Moon, LogIn, LogOut, User, ChevronDown, KeyRound } from 'lucide-react';
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import InstallPwaBanner from '../../ui/components/InstallPwaBanner';
import ErrorBoundary from '../../ui/components/ErrorBoundary';
import { useTheme } from '../../core/context/ThemeContext';
import { useAuth } from '../../core/context/AuthContext';

export default function Shell() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const { user, logout, isAuthenticated } = useAuth();

    // Close user dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getPageTitle = (pathname) => {
        if (pathname.includes('/career-assistant')) return 'Career AI Assistant';
        if (pathname.includes('/career')) return 'Career Simulator';
        if (pathname.includes('/skill-gap')) return 'Skill Gap Analyzer';
        if (pathname.includes('/compare')) return 'Compare Roles';
        if (pathname.includes('/upload')) return 'Resume Upload';
        if (pathname.includes('/data')) return 'Data Manager';
        return 'LAKSHYAVED';
    };

    const title = getPageTitle(location.pathname);
    const isAssistantPage = location.pathname.includes('/career-assistant');

    const handleLogout = async () => {
        setUserMenuOpen(false);
        await logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden relative">
                {/* Header */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-[#0b0f19]/85 px-4 md:px-6 backdrop-blur-md z-10 transition-colors duration-200">
                    <div className="flex items-center gap-3">
                        <button
                            id="sidebar-toggle-btn"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                            aria-label="Toggle navigation menu"
                        >
                            <Menu size={22} />
                        </button>
                        <div>
                            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{title}</span>
                                {isAssistantPage && (
                                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#13ec6d]/15 text-[#13ec6d] border border-[#13ec6d]/30">
                                        Live
                                    </span>
                                )}
                            </h1>
                        </div>
                    </div>

                    {/* Header Controls */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Ask AI Mentor CTA */}
                        {!isAssistantPage && (
                            <NavLink
                                id="header-ai-mentor-btn"
                                to="/career-assistant"
                                className="hidden xs:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#13ec6d]/10 hover:bg-[#13ec6d]/20 text-emerald-600 dark:text-[#13ec6d] border border-emerald-500/25 dark:border-[#13ec6d]/30 transition-all shadow-[0_0_10px_rgba(19,236,109,0.12)] cursor-pointer"
                            >
                                <Sparkles size={14} className="text-emerald-500 dark:text-[#13ec6d]" />
                                <span className="hidden sm:inline">Ask AI Mentor</span>
                            </NavLink>
                        )}

                        {/* Attractive Light/Dark Mode Switcher */}
                        <button
                            id="header-theme-toggle"
                            type="button"
                            onClick={toggleTheme}
                            className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-xs hover:border-[#13ec6d]/40"
                            title={`Switch to ${isDark ? 'Light' : 'Cyber Dark'} mode`}
                            aria-label="Toggle theme mode"
                        >
                            {isDark ? (
                                <>
                                    <Sun size={16} className="text-amber-400 transition-transform duration-300 hover:rotate-45" />
                                    <span className="hidden md:inline text-[11px] font-medium">Light</span>
                                </>
                            ) : (
                                <>
                                    <Moon size={16} className="text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
                                    <span className="hidden md:inline text-[11px] font-medium">Dark</span>
                                </>
                            )}
                        </button>

                        {/* User Profile / 3D Login Portal Menu */}
                        {isAuthenticated && user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    id="header-user-menu-btn"
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-[#121a2a] hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer"
                                    title={user.name}
                                >
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="h-7 w-7 rounded-lg object-cover border border-[#13ec6d]/40 shadow-xs"
                                        />
                                    ) : (
                                        <div className="h-7 w-7 rounded-lg bg-[#13ec6d]/15 text-emerald-600 dark:text-[#13ec6d] font-bold text-xs flex items-center justify-center border border-[#13ec6d]/30">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="hidden lg:block text-left">
                                        <p className="text-xs font-bold text-slate-800 dark:text-white leading-none truncate max-w-[120px]">
                                            {user.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-[120px] mt-1">
                                            {user.role || 'Developer'}
                                        </p>
                                    </div>
                                    <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
                                </button>

                                {/* User Dropdown Popover */}
                                {userMenuOpen && (
                                    <div 
                                        id="header-user-dropdown"
                                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#121a2a] border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <div className="p-2 border-b border-slate-100 dark:border-white/5">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{user.name}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email || user.role}</p>
                                            {user.isGuest && (
                                                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                    Guest Session
                                                </span>
                                            )}
                                        </div>

                                        <div className="py-1">
                                            <button
                                                onClick={() => { setUserMenuOpen(false); navigate('/login'); }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                                            >
                                                <KeyRound size={14} className="text-[#13ec6d]" />
                                                <span>3D Login / Switch Account</span>
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                                            >
                                                <LogOut size={14} />
                                                <span>Sign Out</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <NavLink
                                id="header-login-btn"
                                to="/login"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#13ec6d] hover:bg-[#13ec6d]/90 text-[#0b0f19] shadow-[0_0_12px_rgba(19,236,109,0.3)] transition-all cursor-pointer"
                            >
                                <LogIn size={14} />
                                <span>Sign In</span>
                            </NavLink>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scroll-smooth transition-colors duration-200">
                    <ErrorBoundary>
                        <Outlet />
                    </ErrorBoundary>
                </main>
                <InstallPwaBanner />
            </div>
        </div>
    );
}
