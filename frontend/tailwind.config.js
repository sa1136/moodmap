/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{js,ts,jsx,tsx}"
    ],
    theme: {
      extend: {
        colors: {
          // MoodMap Custom Color Palette
          primary: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            400: '#38bdf8',
            500: '#0ea5e9', // Main primary
            600: '#0284c7',
            700: '#0369a1',
            800: '#075985',
            900: '#0c4a6e',
          },
          secondary: {
            50: '#fdf4ff',
            100: '#fae8ff',
            200: '#f5d0fe',
            300: '#f0abfc',
            400: '#e879f9',
            500: '#d946ef', // Main secondary
            600: '#c026d3',
            700: '#a21caf',
            800: '#86198f',
            900: '#701a75',
          },
          accent: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308', // Main accent
            600: '#ca8a04',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
          },
          mood: {
            relaxed: '#10b981', // Emerald
            energetic: '#f59e0b', // Amber
            adventurous: '#8b5cf6', // Violet
            social: '#ef4444', // Red
            creative: '#06b6d4', // Cyan
            focused: '#6366f1', // Indigo
          },
          neutral: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#e5e5e5',
            300: '#d4d4d4',
            400: '#a3a3a3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
          }
        },
        fontFamily: {
          'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
          'display': ['Poppins', 'ui-sans-serif', 'system-ui'],
        },
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
          'doodle-pattern': 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f0f9ff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'2\'/%3E%3Ccircle cx=\'10\' cy=\'10\' r=\'1\'/%3E%3Ccircle cx=\'50\' cy=\'10\' r=\'1\'/%3E%3Ccircle cx=\'10\' cy=\'50\' r=\'1\'/%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'1\'/%3E%3Cpath d=\'M30 5c0-2.5-2-4.5-4.5-4.5S21 2.5 21 5s2 4.5 4.5 4.5S30 7.5 30 5zm0 50c0-2.5-2-4.5-4.5-4.5S21 52.5 21 55s2 4.5 4.5 4.5S30 57.5 30 55z\'/%3E%3Cpath d=\'M5 30c-2.5 0-4.5-2-4.5-4.5S2.5 21 5 21s4.5 2 4.5 4.5S7.5 30 5 30zm50 0c-2.5 0-4.5-2-4.5-4.5S52.5 21 55 21s4.5 2 4.5 4.5S57.5 30 55 30z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        },
        animation: {
          'float': 'float 6s ease-in-out infinite',
          'bounce-slow': 'bounce 3s infinite',
          'pulse-slow': 'pulse 4s infinite',
        },
        keyframes: {
          float: {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          }
        }
      },
    },
    plugins: [],
  }
  