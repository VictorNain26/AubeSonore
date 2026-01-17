/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Surfaces - Dark theme (matching frontend)
        surface: {
          base: "#0f1118",       // hsl(222, 20%, 6%)
          elevated: "#171a24",   // hsl(222, 18%, 10%)
          overlay: "#000000",    // hsl(0, 0%, 0%)
        },
        // Glass morphism
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          hover: "rgba(255, 255, 255, 0.06)",
          active: "rgba(255, 255, 255, 0.10)",
          border: "rgba(255, 255, 255, 0.08)",
          strong: "rgba(255, 255, 255, 0.12)",
        },
        // Text hierarchy
        text: {
          primary: "rgba(255, 255, 255, 1)",
          secondary: "rgba(255, 255, 255, 0.70)",
          tertiary: "rgba(255, 255, 255, 0.50)",
          muted: "rgba(255, 255, 255, 0.35)",
        },
        // Accent - Brand purple (matching frontend)
        accent: {
          DEFAULT: "#9370DB",    // hsl(270, 60%, 60%)
          muted: "rgba(147, 112, 219, 0.20)",
        },
        // Semantic colors
        danger: "#dc2626",       // hsl(0, 72%, 51%)
        success: "#22c55e",      // hsl(142, 71%, 45%)
      },
      borderRadius: {
        sm: "0.5rem",   // 8px
        md: "0.75rem",  // 12px
        lg: "1rem",     // 16px
        xl: "1.25rem",  // 20px
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
