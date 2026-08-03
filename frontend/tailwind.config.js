/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f4f6f8',
        panel: '#ffffff',
        panelHover: '#f1f3f5',
        border: '#e5e7eb',
        primary: '#ff4d4f',
        primaryHover: '#ff7875',
        text: '#1f2329',
        muted: '#8a8f99',
      },
    },
  },
  plugins: [],
}
