import type { Auth } from "@ssp/auth";

export type SupabaseUser = NonNullable<
  Awaited<ReturnType<Auth["supabase"]["auth"]["admin"]["createUser"]>>["data"]
>["user"];

/**
 * Get user session from context
 */
export function getUserSession(
  session: Awaited<ReturnType<Auth["api"]["getSession"]>>,
) {
  return session;
}

/**
 * Create a user in Supabase Auth
 */
export async function createSupabaseUser(
  auth: Auth,
  options: {
    email: string;
    password: string;
    emailConfirm?: boolean;
    userMetadata?: Record<string, unknown>;
  },
): Promise<NonNullable<SupabaseUser>> {
  const createResult = await auth.supabase.auth.admin.createUser({
    email: options.email,
    password: options.password,
    email_confirm: options.emailConfirm ?? true,
    user_metadata: options.userMetadata,
  });

  if (createResult.error) {
    throw new Error(`Failed to create user: ${createResult.error.message}`);
  }

  // TypeScript guarantees data.user is non-null when error is null
  return createResult.data.user;
}

/**
 * Sign in a user and return session tokens
 */
export async function signInUser(auth: Auth, email: string, password: string) {
  const signInResult = await auth.supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error) {
    throw new Error(`Failed to sign in: ${signInResult.error.message}`);
  }

  const session = signInResult.data.session;
  const accessToken = session.access_token;
  const refreshToken = session.refresh_token;
  const expiresAt = session.expires_at;

  if (!accessToken) {
    throw new Error("Failed to sign in: No session token returned");
  }

  return {
    user: {
      id: signInResult.data.user.id,
      email: signInResult.data.user.email ?? email,
      emailVerified: !!signInResult.data.user.email_confirmed_at,
    },
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? null,
  };
}

/**
 * Refresh a user's access token
 */
export async function refreshUserToken(auth: Auth, refreshToken: string) {
  const refreshResult = await auth.supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (refreshResult.error) {
    throw new Error(`Failed to refresh token: ${refreshResult.error.message}`);
  }

  const session = refreshResult.data.session;
  const accessToken = session?.access_token;
  const newRefreshToken = session?.refresh_token;
  const expiresAt = session?.expires_at;

  if (!accessToken) {
    throw new Error("Failed to refresh token: No session token returned");
  }

  return {
    accessToken,
    refreshToken: newRefreshToken ?? null,
    expiresAt: expiresAt ?? null,
  };
}
