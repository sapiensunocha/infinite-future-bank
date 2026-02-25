/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your exact MI Dashboard color palette
        ifb: {
          slate: '#1e293b',      // Deep slate for text
          muted: '#64748b',      // Muted slate for labels
          blue: '#2563eb',       // Core blue
          red: '#dc2626',        // Alert red
          green: '#16a34a',      // Success green
          yellow: '#ca8a04',     // Warning/Lightning yellow
          bg: '#f8fafc',         // Slate-50 background
          
          // Your specific Logo Colors
          logoI: '#4285F4',
          logoF: '#EA4335',
          logoB: '#FBBC04',
          logoG: '#34A853',
        }
      },
      boxShadow: {
        // Your exact MI Dashboard shadow rules
        'glass': '0 20px 25px -5px rgba(226, 232, 240, 0.4), 0 8px 10px -6px rgba(226, 232, 240, 0.4)',
        'glass-hover': '0 25px 50px -12px rgba(226, 232, 240, 0.5)',
        'inner-glass': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3)',
      },
      borderRadius: {
        // Your signature massive curved edges
        'glass': '2.5rem',
        'glass-lg': '3.5rem',
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}