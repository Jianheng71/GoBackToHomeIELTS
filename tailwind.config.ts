import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-void)",
        foreground: "var(--text-primary)",
        border: "rgba(167, 139, 250, 0.18)",
        input: "rgba(167, 139, 250, 0.28)",
        ring: "#C4B5FD",
        primary: {
          DEFAULT: "#6E4A9E",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "rgba(32, 26, 48, 0.94)",
          foreground: "#F4F2F8",
        },
        muted: {
          DEFAULT: "rgba(22, 18, 32, 0.88)",
          foreground: "rgba(244, 242, 248, 0.62)",
        },
        accent: {
          DEFAULT: "#3D2A5C",
          foreground: "#F4F2F8",
        },
        card: {
          DEFAULT: "rgba(22, 18, 32, 0.94)",
          foreground: "#F4F2F8",
        },
        popover: {
          DEFAULT: "rgba(32, 26, 48, 0.98)",
          foreground: "#F4F2F8",
        },
        destructive: {
          DEFAULT: "#F87171",
          foreground: "#0E0B14",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.625rem",
        sm: "0.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
};
export default config;
