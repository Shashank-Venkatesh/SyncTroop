/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        brand: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        midnight: '#07111f',
        panel: 'rgba(12, 20, 35, 0.82)',
        panelSoft: 'rgba(17, 27, 46, 0.65)',
        line: 'rgba(255, 255, 255, 0.08)',
        brand: {
          50: '#effaf7',
          100: '#d8fbef',
          200: '#abf2df',
          300: '#6de6c8',
          400: '#2fd4ac',
          500: '#16b98f',
          600: '#0e8f72',
          700: '#0d715d',
          800: '#105b4d',
          900: '#104b42',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffeed4',
          200: '#ffd49c',
          300: '#ffb55a',
          400: '#ff9f2d',
          500: '#f9790e',
          600: '#dc5c08',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 28px 80px rgba(0,0,0,0.45)',
        float: '0 20px 60px rgba(7, 17, 31, 0.35)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -14px, 0) scale(1.04)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.12)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translate3d(0, 14px, 0) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
      },
      animation: {
        drift: 'drift 10s ease-in-out infinite',
        glow: 'glow 5s ease-in-out infinite',
        rise: 'rise 0.35s ease-out both',
      },
      backgroundImage: {
        'radial-soft': 'radial-gradient(circle at top left, rgba(47, 212, 172, 0.25), transparent 34%), radial-gradient(circle at top right, rgba(255, 159, 45, 0.18), transparent 26%), linear-gradient(180deg, rgba(7, 17, 31, 0.9), rgba(7, 17, 31, 1))',
      },
    },
  },
  plugins: [],
}