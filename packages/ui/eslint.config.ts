import { baseConfig } from "@ssp/eslint-config/base";
import { reactConfig } from "@ssp/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
