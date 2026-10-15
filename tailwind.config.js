/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Tonal surfaces (no outlines): page, then cards, then controls on cards.
      // Values live in src/index.css so light and dark mode swap them.
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        container: 'rgb(var(--container) / <alpha-value>)',
        'container-high': 'rgb(var(--container-high) / <alpha-value>)',
        'container-highest': 'rgb(var(--container-highest) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '"Manrope Variable"',
          'Manrope',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
