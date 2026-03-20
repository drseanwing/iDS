import { create } from 'zustand';

interface AuthState {
  user: {
    sub: string;
    email: string;
    name: string;
    roles: string[];
  } | null;
  token: string | null;
  setUser: (user: AuthState['user']) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

function decodeJwtPayload(token: string): AuthState['user'] | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    if (!base64Url) return null;
    // Replace URL-safe chars and pad to a valid base64 string
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json);
    return {
      sub: payload.sub ?? '',
      email: payload.email ?? '',
      name: payload.name || payload.preferred_username || '',
      roles: payload.realm_access?.roles ?? [],
    };
  } catch {
    return null;
  }
}

const storedToken = localStorage.getItem('access_token');

export const useAuth = create<AuthState>((set) => ({
  user: storedToken ? decodeJwtPayload(storedToken) : null,
  token: storedToken,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
      set({ token, user: decodeJwtPayload(token) });
    } else {
      localStorage.removeItem('access_token');
      set({ token: null, user: null });
    }
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null, token: null });
  },
}));
