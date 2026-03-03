import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          screen: "var(--gc-screen-bg)",
          menu: "var(--gc-menu-bg)",
          "menu-text": "var(--gc-menu-text)",
          icon: "var(--gc-menu-icon)",
          hover: "var(--gc-menu-hover)",
          btn: "var(--gc-btn-dark-bg)",
          "btn-text": "var(--gc-btn-dark-text)",
        },
      },
    },
  },
  plugins: [],
};
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-up': { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } }
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-up': 'scale-up 0.2s ease-out'
      }
    }
  }
}
export default config;