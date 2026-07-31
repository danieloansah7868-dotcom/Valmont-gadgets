/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './account.html',
    './admin.html',
    './admin-login.html',
    './assets/js/gadgets.js',
    './assets/js/account.js',
    './assets/js/admin.js',
    './app.js',
    './scripts/prerender.js',
  ],
  theme: {
    extend: {
      // Mirrors the inline `tailwind.config` that admin.html used to declare
      // for the CDN build.
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      colors: {
        navy: { deep: '#0b1a38', ink: '#071126', light: '#10214a' },
        panel: '#12234a',
        gold: '#ff8c00',
      },
    },
  },
  plugins: [],
};
