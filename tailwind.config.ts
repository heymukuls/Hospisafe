import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effcf8",
          100: "#d8f7ec",
          500: "#159b82",
          600: "#0e806e",
          700: "#116657",
          900: "#123b43"
        }
      },
      boxShadow: {
        soft: "0 20px 60px rgba(17, 75, 78, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
