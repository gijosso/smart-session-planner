import * as SecureStore from "expo-secure-store";

import { TOKEN_EXPIRATION_BUFFER_SECONDS } from "~/constants/time";

const ACCESS_TOKEN_KEY = "supabase_access_token";
const REFRESH_TOKEN_KEY = "supabase_refresh_token";
const EXPIRES_AT_KEY = "supabase_expires_at";

/**
 * Auth client that stores session tokens securely
 * All auth operations should go through tRPC API (server-side)
 * This client only manages token storage for API requests
 */
export const authClient = {
  /**
   * Store session tokens securely
   */
  setSession: async (data: {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: number | null;
  }): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    if (data.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    if (data.expiresAt !== null && data.expiresAt !== undefined) {
      await SecureStore.setItemAsync(EXPIRES_AT_KEY, data.expiresAt.toString());
    }
  },

  /**
   * Store access token securely (backward compatibility)
   */
  setAccessToken: async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },

  /**
   * Get stored access token
   */
  getAccessToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken: async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  /**
   * Get stored expiration time (Unix timestamp in seconds)
   */
  getExpiresAt: async (): Promise<number | null> => {
    const expiresAtStr = await SecureStore.getItemAsync(EXPIRES_AT_KEY);
    if (!expiresAtStr) return null;
    const expiresAt = parseInt(expiresAtStr, 10);
    return isNaN(expiresAt) ? null : expiresAt;
  },

  /**
   * Check if token is expired or will expire soon (within expiration buffer)
   */
  isTokenExpired: async (): Promise<boolean> => {
    const expiresAt = await authClient.getExpiresAt();
    if (!expiresAt) return false; // If no expiration, assume not expired
    // Check if token expires within the expiration buffer
    const now = Math.floor(Date.now() / 1000);
    return expiresAt <= now + TOKEN_EXPIRATION_BUFFER_SECONDS;
  },

  /**
   * Remove all stored tokens
   */
  removeAccessToken: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(EXPIRES_AT_KEY);
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
