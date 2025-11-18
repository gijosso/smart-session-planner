import { baseConfig, restrictEnvAccess } from "@ssp/eslint-config/base";
import { nextjsConfig } from "@ssp/eslint-config/nextjs";
import { reactConfig } from "@ssp/eslint-config/react";
import { defineConfig } from "eslint/config";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
