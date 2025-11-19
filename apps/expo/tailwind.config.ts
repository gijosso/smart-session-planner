import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [
    require("@ssp/tailwind-config/native"),
    require("nativewind/preset"),
  ],
  theme: {
    screens: {
      sm: "390px",
      md: "414px",
    },
  },
} satisfies Config;
