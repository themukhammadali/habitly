/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Tonal surfaces (no outlines): page, then cards, then controls on cards.
      // Values live in src/index.css so light and dark mode swap them.
      // Springy easing for Material's expressive motion.
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      borderRadius: {
        card: '28px',
      },
      colors: {
        surface: 'rgb(var(--surface) / <alpha-value>)',
        container: 'rgb(var(--container) / <alpha-value>)',
        'container-high': 'rgb(var(--container-high) / <alpha-value>)',
        'container-highest': 'rgb(var(--container-highest) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'on-primary': 'rgb(var(--on-primary) / <alpha-value>)',
        'primary-container': 'rgb(var(--primary-container) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--on-primary-container) / <alpha-value>)',
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
