// Shared Tailwind Config für alle BioLP-Seiten
// Einbinden NACH dem Tailwind CDN-Script
if (typeof tailwind !== 'undefined') {
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        colors: {
          forest: {
            50:  '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
            950: '#052e16',
          }
        },
        keyframes: {
          fadeIn:  { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
          slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
          float:   { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        },
        animation: {
          fadeIn:  'fadeIn 0.5s ease-out forwards',
          slideUp: 'slideUp 0.6s ease-out forwards',
          float:   'float 4s ease-in-out infinite',
        }
      }
    }
  };
}
