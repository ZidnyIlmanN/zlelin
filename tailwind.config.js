/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Newsreader', 'serif'],
      },
      colors: {
        cream: {
          50: '#FAF8F5',
          100: '#F4EFEA',
          200: '#EBE3D9',
          300: '#DED2C3',
        },
        sage: {
          500: '#788A75',
          600: '#637361',
          100: '#E6EBE5',
        },
        warmbrown: {
          500: '#6E5A4A',
          600: '#59483A',
          100: '#F0EAE3',
        },
        lavender: {
          400: '#A594F9',
          100: '#EFEBFD',
        },
        coral: {
          400: '#E07A5F',
        }
      },
      boxShadow: {
        'cozy': '0 20px 50px rgba(74, 58, 42, 0.08), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'float': '0 30px 60px -12px rgba(50, 40, 30, 0.15), 0 18px 36px -18px rgba(0, 0, 0, 0.12)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
