import { createClient } from "@supabase/supabase-js";

// Headers is a global Web API type available in Node.js 18+ and browsers
interface HeadersLike {
  get(name: string): string | null;
}

export function initAuth(options: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey?: string;
}) {
  // Create Supabase client for server-side operations
  const supabase = createClient(
    options.supabaseUrl,
    options.supabaseServiceRoleKey ?? options.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return {
    supabase,
    api: {
      /**
       * Get session from headers (similar to better-auth's getSession)
       * Supports both Authorization header and Cookie-based sessions
       */
      async getSession(opts: { headers: HeadersLike }) {
        const authHeader = opts.headers.get("authorization");
        const cookieHeader = opts.headers.get("cookie");

        let accessToken: string | null = null;

        // Try to get token from Authorization header
        if (authHeader?.startsWith("Bearer ")) {
          accessToken = authHeader.substring(7);
        } else if (cookieHeader) {
          // Try to get token from cookies (for web clients)
          const cookies = parseCookies(cookieHeader);
          const tokenFromCookie =
            cookies["sb-access-token"] ?? cookies["supabase-auth-token"];
          accessToken = tokenFromCookie ?? null;
        }

        if (!accessToken) {
          return null;
        }

        try {
          // Verify the token and get user
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser(accessToken);

          if (userError || !user) {
            return null;
          }

          return {
            user: {
              id: user.id,
              email: user.email ?? "",
              emailVerified: !!user.email_confirmed_at,
            },
          };
        } catch {
          return null;
        }
      },
    },
  };
}

/**
 * Parse cookies from cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Awaited<ReturnType<Auth["api"]["getSession"]>>;
