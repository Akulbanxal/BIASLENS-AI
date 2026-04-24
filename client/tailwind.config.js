/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        neon: '0 0 30px rgba(99, 102, 241, 0.35)',
      },
      backgroundImage: {
        'grid-glow':
          'linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.12) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}

