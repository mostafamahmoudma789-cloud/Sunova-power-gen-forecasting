/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Solar gold — primary accent, warmer & more saturated than default Tailwind amber
        solar: {
          50: '#fffaeb',
          100: '#fef0c7',
          200: '#fdda8d',
          300: '#fcbf4f',
          400: '#ffb627',
          500: '#f59810',
          600: '#d9760a',
          700: '#b4570c',
          800: '#924511',
          900: '#783a11',
          950: '#451c04',
        },
        // Flux teal — actual/measured data, positive/connected states
        flux: {
          50: '#effffb',
          100: '#c8fff2',
          200: '#92ffe6',
          300: '#50f6d6',
          400: '#00d9c0',
          500: '#00b3a3',
          600: '#008d83',
          700: '#03716b',
          800: '#075a56',
          900: '#0a4a48',
          950: '#022b2b',
        },
        // Flame — errors, alerts
        flame: {
          50: '#fff1f3',
          100: '#ffe0e5',
          200: '#ffc6d0',
          300: '#ff9bac',
          400: '#ff5470',
          500: '#f81f47',
          600: '#e40836',
          700: '#c1032c',
          800: '#a1062a',
          900: '#8a0a28',
          950: '#4d0212',
        },
        // Dusk violet — secondary accent, tracker/interactive tags (signature risk color)
        dusk: {
          50: '#f4f3ff',
          100: '#ebe8ff',
          200: '#d9d4ff',
          300: '#bcb0ff',
          400: '#9c86ff',
          500: '#7c6ff0',
          600: '#6748db',
          700: '#5638b8',
          800: '#472f96',
          900: '#3c2a79',
          950: '#241847',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
