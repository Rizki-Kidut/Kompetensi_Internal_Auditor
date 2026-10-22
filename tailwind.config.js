/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Base 12px scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 9px
        'sm': ['0.833rem', { lineHeight: '1.25rem' }],  // 10px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 12px
        'lg': ['1.167rem', { lineHeight: '1.75rem' }],  // 14px
        'xl': ['1.333rem', { lineHeight: '1.75rem' }],  // 16px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 18px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 22.5px
      },
      colors: {
        // CertiTrack brand colors – kept as aliases so we never hardcode hex
        certitrack: {
          sidebar: '#1e40af',      // blue-800
          'sidebar-dark': '#1e3a8a', // blue-900
          'sidebar-text': '#bfdbfe', // blue-200
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
