import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
        tight: "-0.02em",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        status: {
          applied: "hsl(var(--status-applied))",
          oa: "hsl(var(--status-oa))",
          screen: "hsl(var(--status-screen))",
          interview: "hsl(var(--status-interview))",
          final: "hsl(var(--status-final))",
          offer: "hsl(var(--status-offer))",
          rejected: "hsl(var(--status-rejected))",
          ghosted: "hsl(var(--status-ghosted))",
          withdrawn: "hsl(var(--status-withdrawn))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontSize: {
        "display-xl": ["4rem", { lineHeight: "1.05", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-lg": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "600" }],
        "display-md": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-sm": ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
      },
      backdropBlur: {
        "3xl": "64px",
        "4xl": "96px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-30px) translateX(20px)" },
        },
        "float-slow-reverse": {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(40px) translateX(-30px)" },
        },
        "ken-burns": {
          "0%": { transform: "scale(1) translate(0, 0)" },
          "100%": { transform: "scale(1.08) translate(-1%, -1%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in": "scale-in 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
        "shimmer": "shimmer 2.5s linear infinite",
        "float-slow": "float-slow 18s ease-in-out infinite",
        "float-slow-reverse": "float-slow-reverse 22s ease-in-out infinite",
        "ken-burns": "ken-burns 8s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
