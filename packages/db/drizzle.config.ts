import type { Config } from "drizzle-kit";

/**
 * Get the database URL for drizzle-kit
 * Drizzle-kit needs a non-pooling connection URL
 * Neon uses port 6543 for pooling and 5432 for direct connections
 */
function getDatabaseUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing POSTGRES_URL environment variable. Please ensure it is set in your .env file.",
    );
  }

  // Convert pooling URL (port 6543) to direct connection URL (port 5432)
  // This is required for drizzle-kit migrations and schema operations
  // Only replace if the URL contains :6543 (pooling port)
  if (url.includes(":6543")) {
    return url.replace(":6543", ":5432");
  }

  // If URL doesn't contain :6543, return as-is (might already be direct connection)
  return url;
}

export default {
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: getDatabaseUrl() },
  casing: "snake_case",
} satisfies Config;
