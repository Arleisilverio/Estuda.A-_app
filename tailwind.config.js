/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'estuda-primary': 'hsl(43, 100%, 59%)',
        'estuda-secondary': 'hsl(232, 50%, 20%)',
        'estuda-highlight': 'hsl(1, 95%, 50%)',
        'estuda-bg': 'hsl(232, 93%, 8%)',
        'estuda-surface': 'hsl(232, 93%, 12%)',
        'estuda-text': 'hsl(150, 16%, 95%)',
      },
      fontFamily: {
        'display': ['Lexend', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [],
}
// Force tailwind rebuild: 2
