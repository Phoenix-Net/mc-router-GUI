/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}", "./views/**/*.{html,ejs}"],
  theme: {
    extend: {
      colors: {
        minecraft: {
          green: '#00AA00',
          dark: '#2D2D2D',
          light: '#F5F5F5'
        }
      }
    },
  },
  plugins: [],
}