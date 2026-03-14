/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: "var(--bg-dark)",
        bgLight: "var(--bg-light)",
        textPrimary: "var(--text-primary)",
        textMuted: "var(--text-muted)",
        accent: "var(--accent)",
        positive: "var(--positive)",
        negative: "var(--negative)",
      }
    },
  },
  plugins: [],
}
