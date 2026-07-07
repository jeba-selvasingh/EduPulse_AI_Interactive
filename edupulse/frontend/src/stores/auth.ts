import { resolveHomeRoute } from '@/src/lib/auth';
import {
  clearSession,
  consumePendingRedirect,
  loadSession,
  saveSession,
  type StoredUser,
} from '@/src/lib/session';
import { create } from 'zustand';

type AuthState = {
  user: StoredUser | null;
  accessToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (accessToken: string, user: StoredUser, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  resolvePostLoginRoute: () => Promise<string>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isHydrated: false,

  hydrate: async () => {
    const session = await loadSession();
    set({
      user: session.user,
      accessToken: session.accessToken,
      isHydrated: true,
    });
  },

  setSession: async (accessToken, user, refreshToken) => {
    await saveSession(accessToken, user, refreshToken);
    set({ accessToken, user });
  },

  logout: async () => {
    await clearSession();
    set({ accessToken: null, user: null });
  },

  resolvePostLoginRoute: async (): Promise<string> => {
    const pending = await consumePendingRedirect();
    const { user } = get();
    return pending ?? resolveHomeRoute(user?.roles ?? []);
  },
}));
