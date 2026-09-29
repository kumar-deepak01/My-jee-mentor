/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './courses/**/*.html', './js/**/*.js'],
  theme: { extend: { colors: { brand: '#FF6A00', ink: '#0B1220' }, fontFamily: { sans: ['DM Sans', 'sans-serif'], display: ['Manrope', 'sans-serif'] } } },
  plugins: []
};
