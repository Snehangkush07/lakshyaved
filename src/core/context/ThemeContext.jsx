/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => {},
    setTheme: () => {},
    isDark: true,
});

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        try {
            const saved = localStorage.getItem('lakshyaved_theme');
            if (saved === 'light' || saved === 'dark') return saved;
        } catch {
            // ignore localStorage error
        }
        return 'dark'; // default to dark cyber aesthetic
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
            root.style.colorScheme = 'light';
        }
        try {
            localStorage.setItem('lakshyaved_theme', theme);
        } catch {
            // ignore
        }
    }, [theme]);

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const setTheme = (newTheme) => {
        if (newTheme === 'dark' || newTheme === 'light') {
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return ctx;
}
