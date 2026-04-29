
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",   // importante en Next.js 13+
    "./pages/**/*.{js,ts,jsx,tsx}", // si usas pages router
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}