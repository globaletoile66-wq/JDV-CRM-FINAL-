/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],

  darkMode: 'class',

  theme: {
    container: {
      center: true,
      padding: '1rem',
    },

    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',

        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },

        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },

        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },

        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },

        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        danger: 'var(--danger)',
        warning: 'var(--warning)',
        success: 'var(--success)',
        info: 'var(--info)',
      },

      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },

      boxShadow: {
        'gold-sm':
          '0 0 0 1px rgba(212,175,55,0.2), 0 2px 8px rgba(212,175,55,0.1)',

        'gold-md':
          '0 0 0 1px rgba(212,175,55,0.3), 0 4px 24px rgba(212,175,55,0.15)',

        'gold-lg':
          '0 0 0 1px rgba(212,175,55,0.4), 0 8px 40px rgba(212,175,55,0.2)',

        card:
          '0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,0.3)',

        modal:
          '0 0 0 1px rgba(212,175,55,0.2), 0 24px 80px rgba(0,0,0,0.6)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up':
          'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in':
          'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        shimmer: 'shimmer 2s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
      },
    },
  },

  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};
