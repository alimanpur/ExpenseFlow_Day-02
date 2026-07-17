import axios from "axios";
import { api } from "../lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

// Create a separate axios instance for refresh that bypasses interceptors
const rawAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await api.post("/auth/register", userData);
    return response.data.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post("/auth/login", credentials);
    return response.data.data;
  },

  // Logout user
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      // Even if logout fails on server, clear local storage
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  },

  // Refresh access token (used by interceptors - has retry logic)
  refreshToken: async (refreshToken) => {
    const response = await api.post("/auth/refresh-token", { refreshToken });
    return response.data.data;
  },

  // Refresh access token for init (bypasses interceptors to avoid redirect)
  refreshTokenForInit: async (refreshToken) => {
    const response = await rawAxios.post("/auth/refresh-token", { refreshToken });
    return response.data.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get("/auth/profile");
    return response.data.data;
  },

  // Get current user profile for init (bypasses interceptors to avoid redirect)
  getProfileForInit: async (accessToken) => {
    const response = await rawAxios.get("/auth/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return response.data.data;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.patch("/auth/profile", profileData);
    return response.data.data;
  },

  // Get user preferences
  getPreferences: async () => {
    const response = await api.get("/auth/preferences");
    return response.data.data;
  },

  // Update user preferences
  updatePreferences: async (preferences) => {
    const response = await api.patch("/auth/preferences", preferences);
    return response.data.data;
  },

  // Request password reset
  forgotPassword: async (email) => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token, newPassword) => {
    const response = await api.post("/auth/reset-password", { token, newPassword });
    return response.data.data;
  },

  // Link a guest member into the current (newly registered) account
  linkGuest: async (memberId) => {
    const response = await api.post("/auth/link-guest", { memberId });
    return response.data.data;
  },
};
