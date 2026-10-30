import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', "Geist", "system-ui", "sans-serif"],
        mono: ['"Geist Mono Variable"', '"Geist Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "500" }], // 36
        h1: ["1.75rem", { lineHeight: "1.1", letterSpacing: "-0.025em", fontWeight: "500" }],      // 28
        h2: ["1.25rem", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "500" }],     // 20
        h3: ["1rem", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "500" }],         // 16
        body: ["0.875rem", { lineHeight: "1.5", letterSpacing: "-0.002em" }],                      // 14
        "body-sm": ["0.8125rem", { lineHeight: "1.45" }],                                           // 13
        caption: ["0.75rem", { lineHeight: "1.35", letterSpacing: "0.01em" }],                      // 12
        label: ["0.75rem", { lineHeight: "1", letterSpacing: "0.06em", fontWeight: "500" }],       // 12 mono
        meta: ["0.8125rem", { lineHeight: "1.4" }],                                                 // 13 mono
      },
      colors: {
        border: {
          DEFAULT: "hsl(var(--border))",
          subtle: "hsl(var(--border-subtle))",
        },
        "border-strong": "hsl(var(--border-strong))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        "fg-2": "hsl(var(--fg-2))",
        "surface-3": "hsl(var(--surface-3))",
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
          hover: "hsl(var(--accent-hover))",
          subtle: "hsl(var(--accent-subtle))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          subtle: "hsl(var(--success-subtle))",
          fg: "hsl(var(--success-fg))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          subtle: "hsl(var(--warning-subtle))",
          fg: "hsl(var(--warning-fg))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--destructive-foreground))",
          subtle: "hsl(var(--danger-subtle))",
          fg: "hsl(var(--danger-fg))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle))",
          fg: "hsl(var(--info-fg))",
        },
      },
      borderRadius: {
        xl: "1rem",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        sm: "0 1px 2px rgb(0 0 0 / 0.25)",
        md: "0 4px 12px rgb(0 0 0 / 0.3)",
        lg: "0 12px 32px -8px rgb(0 0 0 / 0.5)",
        xl: "0 24px 64px -12px rgb(0 0 0 / 0.6)",
        card: "0 0 0 1px hsl(var(--border))",
        ember: "0 8px 20px -4px hsl(var(--accent) / 0.35)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
