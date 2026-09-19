/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          emerald: '#13ec6d',
          dark: '#0b0f19',
          card: '#121a2a',
          surface: '#162032',
          cyan: '#00f0ff',
        }
      },
      boxShadow: {
        'neon-green': '0 0 20px -2px rgba(19, 236, 109, 0.35)',
        'neon-cyan': '0 0 20px -2px rgba(0, 240, 255, 0.35)',
        'card-glow': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
      }
    }
  },
  plugins: [],
};
