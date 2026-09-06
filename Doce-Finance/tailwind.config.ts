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
          50: '#FDF6F3',
          100: '#FAE8E0',
          200: '#F5D0C0',
          300: '#EBB09A',
          400: '#D98A6A',
          500: '#C4673E',
          600: '#A8522E',
          700: '#7C4A35',
          800: '#5C3526',
          900: '#3D2219',
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
