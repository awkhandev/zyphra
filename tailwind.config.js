/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    "#0A0A0B",
          surface: "#111113",
          raised:  "#18181C",
          border:  "#1E1E24",
        },
        ink: {
          primary:   "#F0F0F4",
          secondary:  "#9898A6",
          muted:      "#56565F",
        },
        brand: {
          DEFAULT: "#6366F1",
          dim:     "#4F46E5",
          glow:    "#818CF8",
        },
        success: "#10B981",
        warning: "#F59E0B",
        danger:  "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
