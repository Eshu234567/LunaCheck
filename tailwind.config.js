/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f9f9',
          100: '#ddeff0',
          200: '#bfe0e2',
          300: '#92cace',
          400: '#5faab1',
          500: '#438e96',
          600: '#3a757e',
          700: '#346068',
          800: '#315057',
          900: '#2c444a',
        }
      }
    },
  },
  plugins: [],
}
