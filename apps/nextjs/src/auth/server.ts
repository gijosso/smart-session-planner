import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { initAuth } from "@ssp/auth";

import { env } from "~/env";

// Use server-side env vars (already validated by env schema)
export const auth = initAuth({
  supabaseUrl: env.SUPABASE_URL,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
