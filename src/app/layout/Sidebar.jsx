import { Gamepad2, BarChart2, X, Hexagon, Database, Sparkles, KeyRound, User, ChevronRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../core/context/AuthContext';
import LakshyavedLogo from '../../ui/components/LakshyavedLogo';

export default function Sidebar({ isOpen, onClose, collapsed = false }) {
    const { user, isAuthenticated } = useAuth();

    const navItems = [
        { id: 'career', path: '/career', icon: Gamepad2, label: 'Career Simulator' },
        { id: 'skillgap', path: '/skill-gap', icon: BarChart2, label: 'Skill Gap Analyzer' },
        { id: 'compare', path: '/compare', icon: Hexagon, label: 'Compare Roles' },
        { id: 'assistant', path: '/career-assistant', icon: Sparkles, label: 'Career AI Assistant' },
        { id: 'data', path: '/data', icon: Database, label: 'Data Manager' },
        { id: 'login', path: '/login', icon: KeyRound, label: '3D Login Portal' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed inset-y-0 left-0 z-30 w-64 ${collapsed ? 'md:w-16' : 'md:w-64'} flex flex-col border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#121a2a] shadow-xl md:shadow-none transition-all duration-300 ease-in-out md:static md:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Brand Header */}
                <div className={`flex h-16 items-center border-b border-slate-200/80 dark:border-white/10 ${collapsed ? 'md:justify-center md:px-0 px-6 justify-between' : 'justify-between px-6'}`}>
                    <LakshyavedLogo size={32} collapsed={collapsed} />
                    <button 
                        onClick={onClose} 
                        className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className={`flex-1 space-y-1.5 overflow-y-auto py-4 ${collapsed ? 'md:px-2 px-3' : 'px-3'}`}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            title={item.label}
                            onClick={() => { if (onClose) onClose(); }}
                            className={({ isActive }) => `
                                w-full group flex items-center gap-3 rounded-xl py-2.5 text-xs font-semibold transition-all text-left cursor-pointer
                                ${collapsed ? 'md:justify-center md:px-0 px-3.5' : 'px-3.5'}
                                ${isActive
                                    ? 'bg-[#13ec6d]/15 text-emerald-700 dark:text-[#13ec6d] font-bold shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                            `}
                        >
                            {({ isActive }) => (
                                <>
                                    <item.icon 
                                        size={18} 
                                        className={`shrink-0 ${isActive ? 'text-emerald-600 dark:text-[#13ec6d]' : 'text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-[#13ec6d] transition-colors'}`} 
                                    />
                                    <span className={`truncate ${collapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                                    {isActive && (
                                        <span className={`ml-auto h-2 w-2 rounded-full bg-emerald-500 dark:bg-[#13ec6d] shadow-[0_0_8px_rgba(19,236,109,0.8)] ${collapsed ? 'md:hidden' : ''}`} />
                                    )}
                                    {item.id === 'login' && !isActive && (
                                        <span className={`ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-bold ${collapsed ? 'md:hidden' : ''}`}>
                                            3D
                                        </span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User Status Profile Card at Bottom */}
                <div className={`p-3 border-t border-slate-200/80 dark:border-white/10 ${collapsed ? 'md:px-2' : ''}`}>
                    <NavLink
                        to="/login"
                        title={isAuthenticated && user ? user.name : 'Guest User'}
                        onClick={() => { if (onClose) onClose(); }}
                        className={`group flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-[#13ec6d]/40 transition-all cursor-pointer ${collapsed ? 'md:justify-center md:p-2' : ''}`}
                    >
                        {isAuthenticated && user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="h-9 w-9 rounded-lg object-cover border border-[#13ec6d]/40 shrink-0"
                            />
                        ) : (
                            <div className="h-9 w-9 rounded-lg bg-[#13ec6d]/15 text-emerald-600 dark:text-[#13ec6d] flex items-center justify-center font-bold text-xs border border-[#13ec6d]/30 shrink-0">
                                {isAuthenticated && user ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                        )}
                        <div className={`flex-1 min-w-0 ${collapsed ? 'md:hidden' : ''}`}>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {isAuthenticated && user ? user.name : 'Guest User'}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {isAuthenticated && user ? (user.role || 'Active Session') : 'Click for 3D Login'}
                            </p>
                        </div>
                        <ChevronRight size={14} className={`text-slate-400 group-hover:text-[#13ec6d] group-hover:translate-x-0.5 transition-all ${collapsed ? 'md:hidden' : ''}`} />
                    </NavLink>
                </div>
            </aside>
        </>
    );
}
