import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dae6ff",
          200: "#bdd3ff",
          300: "#90b6ff",
          400: "#5b8dff",
          500: "#3564fb",
          600: "#1f43f0",
          700: "#1732dd",
          800: "#192bb3",
          900: "#1a2b8d",
          950: "#151c56"
        }
      }
    }
  },
  plugins: []
};
export default config;
