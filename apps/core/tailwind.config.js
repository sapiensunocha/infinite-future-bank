/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // IFB Core Brand Colors (Mission Blue & Alpha Glass)
        ifb: {
          background: '#0B0F19', // The deep, secure void
          surface: 'rgba(255, 255, 255, 0.03)', // The base glass tint
          border: 'rgba(255, 255, 255, 0.1)', // The glass light reflection
          primary: '#2563EB', // Trust Blue
          accent: '#06B6D4', // AI Electric Cyan
          success: '#10B981', // Wealth Emerald
          text: '#F8FAFC', // Crisp White
          muted: '#94A3B8', // Secondary Slate Text
          
          // Legacy Logo Colors (Retained for the D-E-U-S header)
          logoI: '#4285F4',
          logoF: '#EA4335',
          logoB: '#FBBC04',
          logoG: '#34A853',
        }
      },
      backgroundImage: {
        // The ambient, floating orbs of light behind the glass
        'deus-gradient': 'radial-gradient(circle at top right, rgba(37, 99, 235, 0.15), transparent 40%), radial-gradient(circle at bottom left, rgba(6, 182, 212, 0.1), transparent 40%)',
      },
      boxShadow: {
        // Soft, diffused shadows for floating dark glass
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'glass-hover': '0 12px 48px 0 rgba(0, 0, 0, 0.6)',
        'glow': '0 0 20px rgba(6, 182, 212, 0.3)', // Cyan hover glow
        'glow-blue': '0 0 25px rgba(37, 99, 235, 0.4)', // Deep trust blue glow
        'inner-glass': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)',
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