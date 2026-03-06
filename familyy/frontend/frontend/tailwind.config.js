/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#3b82f6',
        'brand-muted': '#9ca3af',
      },
    },
  },
  plugins: [],
}
