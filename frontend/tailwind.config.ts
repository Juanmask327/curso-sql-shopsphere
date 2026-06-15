import type { Config } from "tailwindcss";

// ShopSphere Design System — Tailwind Configuration
// -------------------------------------------------------
// COLOR RATIONALE:
//   Primary #F97316 (Orange 500): Energía latinoamericana, acción, e-commerce.
//     El naranja comunica urgencia sin agresividad, dinamismo sin frivolidad.
//     Dominante en Mercado Libre, Amazon — el usuario lo asocia con "hacer cosas".
//   Secondary #7C3AED (Violet 600): Contraste con el naranja, transmite conocimiento
//     y tecnología. Usado para elementos educativos/informativos.
//   Accent #059669 (Emerald 600): Éxito, correcto, progreso. Verde semántico universal.
//   Neutral: Zinc scale — más cálido que el gris frío de slate, sin llegar al marrón.
//
// TYPOGRAPHY RATIONALE:
//   Sans — Plus Jakarta Sans: Moderna, con personalidad propia (no genérica como Inter).
//     Los counters y liga de sus letras le dan carácter sin sacrificar legibilidad.
//     Perfecta para una empresa que es profesional pero no corporativa.
//   Mono — JetBrains Mono: El mejor monospaced para código. Diseñado específicamente
//     para desarrollo, con ligaduras que mejoran la lectura de SQL.
//     Los estudiantes van a pasar horas mirando queries — merece la mejor fuente.

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ShopSphere Brand — Primary (Orange)
        primary: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",   // Main brand color
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
          DEFAULT: "#f97316",
          foreground: "#ffffff",
        },
        // Secondary — Violet (educación, conocimiento)
        secondary: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",   // Main secondary
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
          DEFAULT: "#7c3aed",
          foreground: "#ffffff",
        },
        // Accent — Emerald (éxito, correcto)
        accent: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",   // Main accent
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          DEFAULT: "#059669",
          foreground: "#ffffff",
        },
        // Warning — Amber
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          DEFAULT: "#f59e0b",
          foreground: "#1c1917",
        },
        // Error — Rose
        error: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          DEFAULT: "#f43f5e",
          foreground: "#ffffff",
        },
        // Success (alias for accent)
        success: {
          DEFAULT: "#059669",
          foreground: "#ffffff",
          light: "#d1fae5",
        },
        // Neutral — Zinc (cálido, no frío como slate)
        neutral: {
          50: "#fafafa",
          100: "#f4f4f5",
          150: "#ececee",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        // Surface colors — para cards, paneles, fondos
        surface: {
          DEFAULT: "#ffffff",
          raised: "#fafafa",
          overlay: "#f4f4f5",
          sunken: "#f0f0f2",
        },
        // ShopSphere brand warm background
        canvas: {
          DEFAULT: "#fdfcfa",   // Ligeramente más cálido que blanco puro
          dark: "#18181b",
        },
        // SQL Editor specific
        editor: {
          bg: "#1e1e2e",         // Catppuccin-inspired, no el negro genérico
          line: "#2a2a3e",
          selection: "#3d3d5c",
          comment: "#6c7086",
          keyword: "#cba6f7",
          string: "#a6e3a1",
          number: "#fab387",
          function: "#89b4fa",
          type: "#f5c2e7",
        },
      },

      fontFamily: {
        // Plus Jakarta Sans — UI principal
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        // JetBrains Mono — Editor SQL y code snippets
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
        // Display — para headings grandes si necesitamos algo diferente
        display: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },

      fontSize: {
        // Escala modular 1.25 (Major Third)
        "2xs": ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.005em" }],
        base: ["1rem", { lineHeight: "1.5rem", letterSpacing: "0" }],
        lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        xl: ["1.25rem", { lineHeight: "1.875rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.015em" }],
        "3xl": ["1.875rem", { lineHeight: "2.375rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
        "5xl": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.03em" }],
      },

      borderRadius: {
        // Escala semántica — no solo valores numéricos
        none: "0",
        xs: "0.125rem",   // 2px — inputs tight
        sm: "0.25rem",    // 4px — badges, tags pequeños
        DEFAULT: "0.5rem", // 8px — default para la mayoría
        md: "0.5rem",     // 8px
        lg: "0.75rem",    // 12px — cards, panels
        xl: "1rem",       // 16px — modals, drawers
        "2xl": "1.5rem",  // 24px — hero elements
        full: "9999px",   // Pills, avatars
      },

      boxShadow: {
        // Sombras semánticas — con matiz cálido (no gris frío)
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        sm: "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)",
        DEFAULT: "0 2px 8px -1px rgb(0 0 0 / 0.08), 0 1px 4px -1px rgb(0 0 0 / 0.06)",
        md: "0 4px 12px -2px rgb(0 0 0 / 0.09), 0 2px 6px -2px rgb(0 0 0 / 0.06)",
        lg: "0 8px 24px -4px rgb(0 0 0 / 0.10), 0 4px 10px -3px rgb(0 0 0 / 0.07)",
        xl: "0 16px 48px -8px rgb(0 0 0 / 0.12), 0 8px 20px -6px rgb(0 0 0 / 0.08)",
        // Sombras con color de marca
        primary: "0 4px 14px 0 rgb(249 115 22 / 0.25)",
        "primary-lg": "0 8px 24px 0 rgb(249 115 22 / 0.20)",
        secondary: "0 4px 14px 0 rgb(124 58 237 / 0.20)",
        accent: "0 4px 14px 0 rgb(5 150 105 / 0.20)",
        // Inner shadows
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.06)",
        "inner-sm": "inset 0 1px 2px 0 rgb(0 0 0 / 0.04)",
        // Sin sombra
        none: "none",
      },

      spacing: {
        // Escala 4px base — los valores estándar de Tailwind son correctos
        // Añadimos alias semánticos para consistency
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },

      animation: {
        // Micro-animaciones con propósito
        "fade-in": "fadeIn 0.2s ease-out",
        "fade-up": "fadeUp 0.3s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "slide-in-bottom": "slideInBottom 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "spin-slow": "spin 2s linear infinite",
        "bounce-subtle": "bounceSubtle 0.6s ease-out",
        "check-draw": "checkDraw 0.4s ease-out forwards",
        "shimmer": "shimmer 1.5s infinite",
        "confetti-fall": "confettiFall 1s ease-out forwards",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInBottom: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        bounceSubtle: {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.15)" },
          "60%": { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        checkDraw: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(60px) rotate(360deg)", opacity: "0" },
        },
      },

      transitionTimingFunction: {
        "spring": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        "ease-in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },

      backgroundImage: {
        // Gradientes de marca
        "gradient-brand": "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
        "gradient-warm": "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
        "gradient-hero": "linear-gradient(135deg, #1e1e2e 0%, #2d2b55 100%)",
        "shimmer-loading":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      },

      screens: {
        xs: "375px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
  ],
};

export default config;
