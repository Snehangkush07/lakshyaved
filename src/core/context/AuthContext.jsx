/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { saveAuthSession, clearAuthSession, getProfile } from '../db/repo';

const AuthContext = createContext({
    user: null,
    login: async () => {},
    logout: async () => {},
    demoLogin: async () => {},
    continueAsGuest: async () => {},
    isAuthenticated: false,
    loading: true,
});

export const DEMO_USERS = [
    {
        id: 'demo-fullstack',
        name: 'Alex Chen',
        email: 'alex.chen@lakshyaved.dev',
        role: 'Full Stack Developer',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Tailwind CSS'],
        badge: 'Staff Engineer'
    },
    {
        id: 'demo-aiml',
        name: 'Priya Sharma',
        email: 'priya.sharma@lakshyaved.dev',
        role: 'AI / Machine Learning Engineer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        skills: ['Python', 'PyTorch', 'TensorFlow', 'LLMs', 'FastAPI', 'Data Pipelines'],
        badge: 'ML Specialist'
    },
    {
        id: 'demo-cloud',
        name: 'Marcus Vance',
        email: 'marcus.vance@lakshyaved.dev',
        role: 'Cloud & DevOps Architect',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        skills: ['Kubernetes', 'AWS', 'Terraform', 'CI/CD', 'Go', 'Prometheus'],
        badge: 'Cloud Architect'
    }
];

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function initAuth() {
            try {
                const saved = localStorage.getItem('lakshyaved_user');
                if (saved) {
                    setUser(JSON.parse(saved));
                } else {
                    const prof = await getProfile().catch(() => null);
                    if (prof && prof.name) {
                        const fallbackUser = {
                            id: 'local-user',
                            name: prof.name,
                            email: prof.email || 'user@lakshyaved.local',
                            role: prof.targetRole || 'Full Stack Developer',
                            avatar: prof.avatar || '',
                            isGuest: false
                        };
                        setUser(fallbackUser);
                        localStorage.setItem('lakshyaved_user', JSON.stringify(fallbackUser));
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                setLoading(false);
            }
        }
        initAuth();
    }, []);

    const login = async (userData) => {
        const u = {
            id: userData.id || `user_${Date.now()}`,
            name: userData.name || 'Developer',
            email: userData.email,
            role: userData.role || userData.targetRole || 'Full Stack Developer',
            avatar: userData.avatar || '',
            isGuest: false,
            loggedInAt: Date.now()
        };
        setUser(u);
        try {
            localStorage.setItem('lakshyaved_user', JSON.stringify(u));
            await saveAuthSession({
                name: u.name,
                email: u.email,
                targetRole: u.role,
                avatar: u.avatar
            });
        } catch (e) {
            console.error('Failed to persist auth session', e);
        }
        return u;
    };

    const demoLogin = async (demoIdOrRole = 'demo-fullstack') => {
        const preset = DEMO_USERS.find(d => d.id === demoIdOrRole || d.role === demoIdOrRole) || DEMO_USERS[0];
        return login(preset);
    };

    const continueAsGuest = async () => {
        const guestUser = {
            id: 'guest',
            name: 'Guest Explorer',
            email: 'guest@lakshyaved.local',
            role: 'Software Engineer',
            avatar: '',
            isGuest: true,
            loggedInAt: Date.now()
        };
        setUser(guestUser);
        try {
            localStorage.setItem('lakshyaved_user', JSON.stringify(guestUser));
            await saveAuthSession({
                name: guestUser.name,
                email: guestUser.email,
                targetRole: guestUser.role
            });
        } catch (e) {
            console.error('Failed to persist guest session', e);
        }
        return guestUser;
    };

    const logout = async () => {
        setUser(null);
        try {
            localStorage.removeItem('lakshyaved_user');
            await clearAuthSession();
        } catch (e) {
            console.error('Failed to clear auth session', e);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            demoLogin,
            continueAsGuest,
            isAuthenticated: !!user,
            loading
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
