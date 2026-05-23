/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0f0a',
          secondary: '#0d1a0d',
          card: '#0f1f0f',
        },
        green: {
          accent: '#22c55e',
          muted: '#86efac',
          deep: '#16a34a',
          glow: '#22c55e33',
        },
        border: {
          DEFAULT: '#1e3a1e',
          light: '#2d5a2d',
        },
        text: {
          primary: '#f0fdf0',
          dim: '#86efac',
          muted: '#4ade80',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      backgroundImage: {
        'green-gradient': 'linear-gradient(135deg, #16a34a, #22c55e)',
        'card-gradient': 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(22,163,74,0.04))',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(34,197,94,0.2)',
        'green-glow-lg': '0 0 40px rgba(34,197,94,0.3)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideIn: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34,197,94,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(34,197,94,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease forwards',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
}
