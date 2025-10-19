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
        dark: {
          900: '#000000',
          800: '#111111',
          700: '#1e1e1e',
          600: '#2d2d2d',
          500: '#3d3d3d',
          400: '#5a5a5a',
          300: '#7a7a7a',
          200: '#aaaaaa',
          100: '#dddddd',
        },
        light: {
          900: '#ffffff',
          800: '#f5f5f5',
          700: '#e5e5e5',
          600: '#d4d4d4',
          500: '#a3a3a3',
          400: '#737373',
          300: '#525252',
          200: '#404040',
          100: '#262626',
        }
      }
    },
  },
  plugins: [],
}