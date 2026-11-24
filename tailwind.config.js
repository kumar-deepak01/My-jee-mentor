/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/**/*.html', './client/**/*.js'],
  theme: { extend: { colors: { brand: '#FF6A00', ink: '#0B1220' }, fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] } } },
  plugins: []
};
