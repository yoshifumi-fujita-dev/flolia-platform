/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'zen': ['var(--font-zen-maru)', 'sans-serif'],
        'shippori': ['var(--font-shippori)', 'serif'],
      },
    },
  },
  plugins: [],
}
