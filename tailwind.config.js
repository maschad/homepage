/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // ✅ SCAN YOUR REACT FILES HERE
  ],
  theme: {
    extend: {
      colors: {
        terminal: '#00ff00',
      },
      dropShadow: {
        'green-glow': '0 0 8px #00ff00',
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
      },
      typography: ({ theme }) => ({
        green: {
          css: {
            '--tw-prose-body': theme('colors.green.300'),
            '--tw-prose-headings': theme('colors.green.400'),
            '--tw-prose-links': theme('colors.green.400'),
            '--tw-prose-pre-bg': '#111',
            '--tw-prose-pre-color': theme('colors.green.200'),
          },
        },
      }),
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
