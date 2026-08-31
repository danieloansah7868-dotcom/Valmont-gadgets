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
      // Half-step icon sizes used throughout the storefront. Without these,
      // SVGs fall back to their large browser-default dimensions.
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
      },
    },
  },
  plugins: [],
};
