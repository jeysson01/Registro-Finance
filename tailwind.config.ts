import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        background: "#F9FAFB",
        card: "#FFFFFF",
        foreground: "#111827",
        muted: "#6B7280",
        border: "#E5E7EB",
        success: { DEFAULT: "#10B981", light: "#ECFDF5", dark: "#059669" },
        danger: { DEFAULT: "#EF4444", light: "#FEF2F2", dark: "#DC2626" },
        info: { DEFAULT: "#3B82F6", light: "#EFF6FF", dark: "#2563EB" },
        warning: { DEFAULT: "#F59E0B", light: "#FFFBEB", dark: "#D97706" },
        primary: { DEFAULT: "#000000", foreground: "#FFFFFF" },
      },
      borderRadius: {
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
