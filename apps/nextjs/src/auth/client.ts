"use client";

/**
 * Auth client that stores session tokens securely
 * All auth operations should go through tRPC API (server-side)
 * This client only manages token storage for API requests
 */
const ACCESS_TOKEN_KEY = "supabase_access_token";

export const authClient = {
  /**
   * Store access token securely (using localStorage for web)
   */
  setAccessToken: (token: string): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    }
    return Promise.resolve();
  },

  /**
   * Get stored access token
   */
  getAccessToken: (): Promise<string | null> => {
    if (typeof window === "undefined") return Promise.resolve(null);
    return Promise.resolve(localStorage.getItem(ACCESS_TOKEN_KEY));
  },

  /**
   * Remove stored access token
   */
  removeAccessToken: (): Promise<void> => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    return Promise.resolve();
  },

  /**
   * Get Authorization header for tRPC requests
   */
  getAuthHeader: async (): Promise<string | null> => {
    const token = await authClient.getAccessToken();
    return token ? `Bearer ${token}` : null;
  },

  /**
   * Get Cookie header for tRPC requests (fallback)
   */
  getCookie: async (): Promise<string | null> => {
    const token = await authClient.getAccessToken();
    return token ? `sb-access-token=${token}` : null;
  },
};
