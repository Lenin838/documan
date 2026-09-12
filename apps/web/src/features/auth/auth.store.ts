import { create } from "zustand";

import {
  register as registerRequest,
  login as loginRequest,
  logout as logoutRequest,
  logoutAll as logoutAllRequest,
  refreshAccessToken as refreshRequest,
  getCurrentUser,
} from "./auth.api";

import type { AuthUser, LoginRequest, RegisterRequest } from "./auth.types";

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean;

  signup: (userData: RegisterRequest) => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearAuth: () => void;
}

let restorePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,

  signup: async (userData) => {
    set({
      isLoading: true,
    });

    try {
      const response = await registerRequest(userData);

      set({
        accessToken: response.data.accessToken,
        user: response.data.user,
        isAuthenticated: true,
      });
    } finally {
      set({
        isLoading: false,
      });
    }
  },

  login: async (credentials) => {
    set({
      isLoading: true,
    });

    try {
      const response = await loginRequest(credentials);

      set({
        accessToken: response.data.accessToken,
        user: response.data.user,
        isAuthenticated: true,
      });
    } finally {
      set({
        isLoading: false,
      });
    }
  },

  restoreSession: async () => {
    if (restorePromise) {
      return restorePromise;
    }

    restorePromise = (async () => {
      set({
        isRestoring: true,
      });

      try {
        const refreshResponse = await refreshRequest();

        const accessToken = refreshResponse.data.accessToken;

        set({
          accessToken,
          isAuthenticated: true,
        });

        const userResponse = await getCurrentUser();

        set({
          user: userResponse.data,
          isAuthenticated: true,
        });
      } catch {
        set({
          accessToken: null,
          user: null,
          isAuthenticated: false,
        });
      } finally {
        set({
          isRestoring: false,
        });

        restorePromise = null;
      }
    })();

    return restorePromise;
  },

  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    }
  },

  logoutAll: async () => {
    try {
      await logoutAllRequest();
    } finally {
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      });
    }
  },

  clearAuth: () => {
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
    });
  },
}));
