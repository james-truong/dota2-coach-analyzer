/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dota-red': '#c23c2a',
        'dota-green': '#2ea043',
        'dota-blue': '#1e88e5',
      },
    },
  },
  plugins: [],
}
