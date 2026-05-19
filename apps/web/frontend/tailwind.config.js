/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'er-red': '#E53E3E',
        'er-yellow': '#D69E2E',
        'er-green': '#38A169',
      }
    },
  },
  plugins: [],
}
