import tailwindcssAnimate from "tailwindcss-animate";
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        // DM Sans is the one app-wide family (see docs/ui-audit.md section 4/5 —
        // Inter was only ever visible on /login and 404 as a routing-tree
        // accident, never an intentional second face). `sans` and `display`
        // both point here; kept as two names because `font-display` is
        // already used at a few call sites (NotFound.tsx, ErrorBoundary.tsx).
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        // Single-purpose accent face for the rich-text editor's h2/h3 only
        // (ProseMirror rules in index.css) — not used as a body/heading font.
        serif: ['Playfair Display', 'Georgia', 'serif'],
        // Retired the unused .admin-mono CSS class in favor of wiring its
        // curated stack directly into the `font-mono` utility everyone
        // already reaches for.
        mono: ['ui-monospace', 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        // 7-step type scale (docs/ui-audit.md section 5: no consistent scale
        // existed — 207 arbitrary text-[Npx] calls vs. 311 standard-scale
        // ones). `body`/`body-sm` intentionally reuse the two sizes (14px/
        // 12px) that already dominate real usage (187/124 occurrences)
        // instead of inventing new ones — the fix is naming and binding
        // weight/tracking/line-height consistently, not new pixel values.
        // h3 and body share a size on purpose; weight is what separates them.
        display: ['1.5rem',    { lineHeight: '2rem',     letterSpacing: '-0.02em',  fontWeight: '700' }], // 24/32
        h1:      ['1.25rem',   { lineHeight: '1.75rem',  letterSpacing: '-0.015em', fontWeight: '700' }], // 20/28
        h2:      ['1rem',      { lineHeight: '1.5rem',   letterSpacing: '-0.01em',  fontWeight: '600' }], // 16/24
        h3:      ['0.875rem',  { lineHeight: '1.25rem',  letterSpacing: '0em',      fontWeight: '600' }], // 14/20
        body:    ['0.875rem',  { lineHeight: '1.25rem',  letterSpacing: '0em',      fontWeight: '400' }], // 14/20
        'body-sm': ['0.75rem', { lineHeight: '1rem',     letterSpacing: '0em',      fontWeight: '400' }], // 12/16
        caption: ['0.6875rem', { lineHeight: '0.875rem', letterSpacing: '0.04em',   fontWeight: '500' }], // 11/14
      },
      colors: {
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
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
          // --danger aliases --destructive (see index.css), so its
          // foreground is --destructive-foreground — no separate
          // --danger-foreground variable exists. This key was missing
          // entirely, so `text-danger-foreground` compiled to nothing
          // and the two unread-count badges in AdminLayout.tsx rendered
          // with unstyled (invisible) digits.
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
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
