import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      
      if (!accessToken && !refreshToken) {
        setLoading(false);
        return;
      }

      // If no access token but have refresh token, try to refresh first
      if (!accessToken && refreshToken) {
        try {
          const refreshResponse = await authService.refreshTokenForInit(refreshToken);
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.tokens;
          
          localStorage.setItem("accessToken", newAccessToken);
          localStorage.setItem("refreshToken", newRefreshToken);
          
          const profileResponse = await authService.getProfileForInit(newAccessToken);
          setUser(profileResponse);
        } catch (refreshError) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await authService.getProfileForInit(accessToken);
        setUser(response);
      } catch (error) {
        const isAuthError = error.response?.status === 401;
        if (isAuthError && refreshToken) {
          try {
            const refreshResponse = await authService.refreshTokenForInit(refreshToken);
            const { accessToken: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.tokens;
            
            localStorage.setItem("accessToken", newAccessToken);
            localStorage.setItem("refreshToken", newRefreshToken);
            
            const profileResponse = await authService.getProfileForInit(newAccessToken);
            setUser(profileResponse);
          } catch (refreshError) {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            setUser(null);
          }
        } else if (isAuthError) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          setUser(null);
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setError(null);
      const { user, tokens } = await authService.login(credentials);

      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      setUser(user);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || "Login failed";
      setError(errorMessage);
      throw error;
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setError(null);
      const result = await authService.register(userData);
      const { user, tokens } = result;

      localStorage.setItem("accessToken", tokens.accessToken);
      localStorage.setItem("refreshToken", tokens.refreshToken);
      setUser(user);
      return result;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || "Registration failed";
      setError(errorMessage);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if server logout fails, clear local state
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    try {
      setError(null);
      const user = await authService.updateProfile(profileData);
      setUser(user);
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || "Profile update failed";
      setError(errorMessage);
      throw error;
    }
  }, []);

  const updatePreferences = useCallback(async (preferences) => {
    try {
      setError(null);
      const prefs = await authService.updatePreferences(preferences);
      setUser((prev) => ({ ...prev, preferences: prefs }));
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || "Preferences update failed";
      setError(errorMessage);
      throw error;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    updatePreferences,
    needsCurrencySelection: !user?.preferences?.currencyChosen,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
