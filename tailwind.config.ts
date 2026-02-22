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
export default config;