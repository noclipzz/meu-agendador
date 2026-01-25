/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class", // <--- ADICIONE ESTA LINHA
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: { 'nohud': { 'light': '#3b82f6', 'dark': '#1e3a8a' } }
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;