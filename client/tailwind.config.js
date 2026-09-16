/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        budo: {
          bg: '#0B0F19',
          surface: '#151D30',
          card: '#1E293B',
          primary: '#3B82F6',
          accent: '#F59E0B',
          red: '#EF4444',
          green: '#10B981',
          yellow: '#F59E0B',
          blue: '#3B82F6',
          orange: '#F97316',
          cyan: '#06B6D4',
          purple: '#8B5CF6',
          lime: '#84CC16'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(59, 130, 246, 0.4)',
        'glow-lg': '0 0 25px rgba(59, 130, 246, 0.6)',
        'gold-glow': '0 0 20px rgba(245, 158, 11, 0.5)'
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'roll-dice': 'rollDice 0.6s ease-in-out',
        'float': 'float 3s ease-in-out infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.85' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        }
      }
    },
  },
  plugins: [],
}
