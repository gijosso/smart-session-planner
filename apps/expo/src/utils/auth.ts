import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "supabase_access_token";

/**
 * Auth client that stores session tokens securely
 * All auth operations should go through tRPC API (server-side)
 * This client only manages token storage for API requests
 */
export const authClient = {
  /**
   * Store access token securely
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
   * Remove stored access token
   */
  removeAccessToken: async (): Promise<void> => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
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
