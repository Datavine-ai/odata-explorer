/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['PP Neue Montreal', 'system-ui', 'sans-serif'],
        mono: ['PP Neue Montreal Mono', 'ui-monospace', 'monospace'],
        editorial: ['PP Editorial New', 'Georgia', 'serif'],
      },
      colors: {
        datavine: {
          cream: '#FDF8F2',
          forest: '#124921',
          orange: '#F55504',
          black: '#000000',
        },
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        datavine: {
          "primary": "#124921",          // Forest Green
          "primary-content": "#FDF8F2",  // Cream text on primary
          "secondary": "#1a6b2e",        // Lighter forest for secondary
          "secondary-content": "#FDF8F2",
          "accent": "#F55504",           // Orange
          "accent-content": "#FDF8F2",
          "neutral": "#1f2937",
          "neutral-content": "#FDF8F2",
          "base-100": "#FDF8F2",         // Cream - main background
          "base-200": "#f5ede3",         // Slightly darker cream
          "base-300": "#e8ddd0",         // Even darker cream
          "base-content": "#000000",     // Black text
          "info": "#3b82f6",
          "info-content": "#ffffff",
          "success": "#124921",          // Forest green for success
          "success-content": "#FDF8F2",
          "warning": "#F55504",          // Orange for warnings
          "warning-content": "#FDF8F2",
          "error": "#dc2626",
          "error-content": "#ffffff",
        },
      },
      {
        "datavine-dark": {
          "primary": "#2ecc71",          // Brighter green for dark mode
          "primary-content": "#000000",
          "secondary": "#124921",
          "secondary-content": "#FDF8F2",
          "accent": "#F55504",           // Orange stays
          "accent-content": "#FDF8F2",
          "neutral": "#1f1f1f",
          "neutral-content": "#FDF8F2",
          "base-100": "#1a1a1a",         // Dark background
          "base-200": "#242424",
          "base-300": "#2e2e2e",
          "base-content": "#FDF8F2",     // Cream text
          "info": "#60a5fa",
          "info-content": "#000000",
          "success": "#2ecc71",
          "success-content": "#000000",
          "warning": "#F55504",
          "warning-content": "#FDF8F2",
          "error": "#ef4444",
          "error-content": "#ffffff",
        },
      },
    ],
  },
}
