/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // ─────────────────────────────────────────────
      // Colors - Mapped to CSS design tokens
      // ─────────────────────────────────────────────
      colors: {
        // Surfaces
        surface: {
          base: 'hsl(var(--surface-base))',
          elevated: 'hsl(var(--surface-elevated))',
          overlay: 'hsl(var(--surface-overlay))',
        },
        // Glass system (use with bg-glass-* for backgrounds)
        glass: {
          DEFAULT: 'hsl(var(--glass-bg))',
          hover: 'hsl(var(--glass-bg-hover))',
          active: 'hsl(var(--glass-bg-active))',
          border: 'hsl(var(--glass-border))',
          'border-strong': 'hsl(var(--glass-border-strong))',
        },
        // Semantic colors
        danger: 'hsl(var(--color-danger))',
        success: 'hsl(var(--color-success))',
        // Accent
        accent: {
          DEFAULT: 'hsl(var(--accent-primary))',
          muted: 'hsl(var(--accent-muted))',
        },
        // Legacy compatibility (phasing out)
        background: 'hsl(var(--surface-base))',
        foreground: 'hsl(var(--text-primary))',
        border: 'hsl(var(--glass-border))',
        muted: {
          foreground: 'hsl(var(--text-tertiary))',
        },
        card: {
          DEFAULT: 'hsl(var(--surface-elevated))',
          foreground: 'hsl(var(--text-primary))',
        },
      },

      // ─────────────────────────────────────────────
      // Border Radius - Mapped to CSS tokens
      // ─────────────────────────────────────────────
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },

      // ─────────────────────────────────────────────
      // Box Shadow - Mapped to CSS tokens
      // ─────────────────────────────────────────────
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },

      // ─────────────────────────────────────────────
      // Transitions - Mapped to CSS tokens
      // ─────────────────────────────────────────────
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },

      // ─────────────────────────────────────────────
      // Keyframes - Unique to Tailwind (CSS has others)
      // ─────────────────────────────────────────────
      keyframes: {
        'music-bar': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '20px' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'music-bar': 'music-bar 0.6s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },

      // ─────────────────────────────────────────────
      // Backdrop Blur
      // ─────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
