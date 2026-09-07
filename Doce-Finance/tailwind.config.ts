import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: 'hsl(var(--color-brand-50) / <alpha-value>)',
          100: 'hsl(var(--color-brand-100) / <alpha-value>)',
          200: 'hsl(var(--color-brand-200) / <alpha-value>)',
          300: 'hsl(var(--color-brand-300) / <alpha-value>)',
          400: 'hsl(var(--color-brand-400) / <alpha-value>)',
          500: 'hsl(var(--color-brand-500) / <alpha-value>)',
          600: 'hsl(var(--color-brand-600) / <alpha-value>)',
          700: 'hsl(var(--color-brand-700) / <alpha-value>)',
          800: 'hsl(var(--color-brand-800) / <alpha-value>)',
          900: 'hsl(var(--color-brand-900) / <alpha-value>)',
        },
        surface: {
          DEFAULT: '#F8F7F5',
          card: '#FFFFFF',
        },
        success: '#16A34A',
        danger: '#DC2626',
        warning: '#D97706',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}

export default config
