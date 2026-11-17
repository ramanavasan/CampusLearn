/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sage Green (#9CAF88)
        sage: {
          50:  '#F4F7F2',
          100: '#E6ECE0',
          200: '#D2DEC8',
          300: '#B7C9AB',
          400: '#9CAF88', // Exact User Color
          500: '#849870',
          600: '#677855',
          700: '#505E42',
          800: '#414D37',
          900: '#353F2D',
          950: '#1D2418',
        },
        // Concrete Grey (#A7A7A7)
        concrete: {
          50:  '#FAFAFA',
          100: '#F3F3F3',
          200: '#E5E5E5',
          300: '#C9C9C9',
          400: '#A7A7A7', // Exact User Color
          500: '#8A8A8A',
          600: '#6D6D6D',
          700: '#545454',
          800: '#3C3C3C',
          900: '#242424',
        },
        // Burnt Amber (#CC5500)
        amber: {
          50:  '#FEF6F0',
          100: '#FDE9DC',
          200: '#FAD2B8',
          300: '#F5B38B',
          400: '#EE8850',
          500: '#CC5500', // Exact User Color
          600: '#B64600',
          700: '#943503',
          800: '#772C09',
          900: '#62260B',
          950: '#381102',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
