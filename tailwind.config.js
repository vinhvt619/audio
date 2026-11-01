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
        sepia: {
          bg: '#fbf0d9',
          surface: '#f4e6c9',
          text: '#433422',
          border: '#e4d3b4'
        },
        night: {
          bg: '#121214',
          surface: '#1c1c21',
          text: '#e2e2e8',
          border: '#2a2a32'
        },
        forest: {
          bg: '#eef6f0',
          surface: '#e0eee3',
          text: '#22462e',
          border: '#cde0d2'
        }
      },
      fontFamily: {
        serif: ['Lora', 'Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
