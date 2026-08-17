/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#123a5e',
          50: '#eef4fa',
          100: '#d6e4f0',
          200: '#aecbe1',
          300: '#7ea8cd',
          400: '#4d81b3',
          500: '#2f6395',
          600: '#1f4a75',
          700: '#123a5e',
          800: '#0e2c47',
          900: '#0a1f33',
        },
        accent: {
          DEFAULT: '#1f7a4d',
          50: '#eafaf1',
          100: '#cdeeda',
          200: '#9fdcb9',
          300: '#6bc593',
          400: '#3ba86e',
          500: '#1f7a4d',
          600: '#18633e',
          700: '#134f32',
          800: '#0f3d27',
          900: '#0a2a1b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
