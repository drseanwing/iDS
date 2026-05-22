import { create } from 'zustand';
import {
  clearAuthTransaction,
  exchangeAuthorizationCode,
  getApiBaseUrl,
  getOidcConfig,
  readAuthTransaction,
  redirectToKeycloak,
  refreshToken,
  TokenSet,
} from '../lib/auth-client';

interface AuthState {
  user: {
    sub: string;
    email: string;
    name: string;
    roles: string[];
  } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthReady: boolean;
  authError: string | null;
  setUser: (user: AuthState['user']) => void;
  setToken: (token: string | null) => void;
  handleAuthRedirect: () => Promise<void>;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => void;
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): AuthState['user'] | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;
  return {
    sub: (payload.sub as string) ?? '',
    email: (payload.email as string) ?? '',
    name: (payload.name as string) || (payload.preferred_username as string) || '',
    roles: (payload.realm_access as { roles?: string[] })?.roles ?? [],
  };
}

function tokenExpiresSoon(token: string | null): boolean {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload) return true;
  const expiresAt = Number(payload.exp || 0) * 1000;
  return expiresAt <= Date.now() + 30_000;
}

let _refreshTimerId: ReturnType<typeof setTimeout> | null = null;

function clearTokenRefreshTimer() {
  if (_refreshTimerId !== null) {
    clearTimeout(_refreshTimerId);
    _refreshTimerId = null;
  }
}

function scheduleTokenRefresh(accessToken: string) {
  clearTokenRefreshTimer();
  const payload = parseJwtPayload(accessToken);
  if (!payload) return;
  const exp = Number(payload.exp || 0);
  const msUntilRefresh = exp * 1000 - Date.now() - 30_000;
    if (msUntilRefresh <= 0) return;
    _refreshTimerId = setTimeout(() => {
      const storedRefresh = localStorage.getItem('refresh_token');
      if (!storedRefresh) {
        window.dispatchEvent(new Event('auth:expired'));
        return;
      }
      refreshToken({ config: getOidcConfig(), refreshToken: storedRefresh })
        .then((tokens) => {
          storeTokenSet(tokens);
          useAuth.setState({
            token: tokens.access_token,
            refreshToken: tokens.refresh_token ?? storedRefresh,
            user: decodeJwtPayload(tokens.access_token),
          });
          scheduleTokenRefresh(tokens.access_token);
        })
        .catch(() => {
          clearStoredTokens();
          useAuth.setState({ token: null, refreshToken: null, user: null });
          window.dispatchEvent(new Event('auth:expired'));
        });
    }, msUntilRefresh);
}

function storeTokenSet(tokens: TokenSet): AuthState['user'] | null {
  localStorage.setItem('access_token', tokens.access_token);
  if (tokens.refresh_token) localStorage.setItem('refresh_token', tokens.refresh_token);
  if (tokens.id_token) localStorage.setItem('id_token', tokens.id_token);
  return decodeJwtPayload(tokens.access_token);
}

function clearStoredTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('id_token');
}

function cleanAuthQuery() {
  const url = new URL(window.location.href);
  ['code', 'state', 'session_state', 'iss', 'error', 'error_description'].forEach((key) => {
    url.searchParams.delete(key);
  });
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

async function fetchProfile(token: string): Promise<AuthState['user'] | null> {
  const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return decodeJwtPayload(token);
  const profile = await response.json();
  return {
    sub: profile.sub ?? profile.id ?? '',
    email: profile.email ?? '',
    name: profile.name ?? profile.displayName ?? '',
    roles: profile.roles ?? [],
  };
}

const storedToken = localStorage.getItem('access_token');
const storedRefreshToken = localStorage.getItem('refresh_token');

export const useAuth = create<AuthState>((set) => ({
  user: storedToken ? decodeJwtPayload(storedToken) : null,
  token: storedToken,
  refreshToken: storedRefreshToken,
  isAuthReady: false,
  authError: null,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
      set({ token, user: decodeJwtPayload(token) });
    } else {
      clearStoredTokens();
      set({ token: null, refreshToken: null, user: null });
    }
  },
  handleAuthRedirect: async () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description') || error;
      clearAuthTransaction();
      cleanAuthQuery();
      set({ authError: description, isAuthReady: true });
      return;
    }

    const code = params.get('code');
    if (code) {
      const transaction = readAuthTransaction();
      const state = params.get('state');
      if (!transaction || transaction.state !== state) {
        clearAuthTransaction();
        cleanAuthQuery();
        set({ authError: 'Invalid sign-in response. Please try again.', isAuthReady: true });
        return;
      }

      try {
        const tokens = await exchangeAuthorizationCode({
          config: getOidcConfig(),
          code,
          codeVerifier: transaction.codeVerifier,
          redirectUri: transaction.redirectUri,
        });
        const decodedUser = storeTokenSet(tokens);
        clearAuthTransaction();
        cleanAuthQuery();
        const profile = await fetchProfile(tokens.access_token);
        set({
          token: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          user: profile ?? decodedUser,
          authError: null,
          isAuthReady: true,
        });
        scheduleTokenRefresh(tokens.access_token);
        return;
      } catch (err) {
        clearStoredTokens();
        clearAuthTransaction();
        cleanAuthQuery();
        set({
          token: null,
          refreshToken: null,
          user: null,
          authError: err instanceof Error ? err.message : 'Sign-in failed',
          isAuthReady: true,
        });
        return;
      }
    }

    if (storedToken && storedRefreshToken && tokenExpiresSoon(storedToken)) {
      try {
        const tokens = await refreshToken({
          config: getOidcConfig(),
          refreshToken: storedRefreshToken,
        });
        const decodedUser = storeTokenSet(tokens);
        set({
          token: tokens.access_token,
          refreshToken: tokens.refresh_token ?? storedRefreshToken,
          user: decodedUser,
          authError: null,
          isAuthReady: true,
        });
        scheduleTokenRefresh(tokens.access_token);
        return;
      } catch {
        clearStoredTokens();
        set({ token: null, refreshToken: null, user: null });
      }
    }

    set({ isAuthReady: true });
  },
  login: () => redirectToKeycloak('login'),
  register: () => redirectToKeycloak('register'),
  logout: () => {
    clearTokenRefreshTimer();
    clearStoredTokens();
    set({ user: null, token: null, refreshToken: null, authError: null });
  },
}));

// Listen for 401 responses dispatched by api-client and trigger re-authentication
window.addEventListener('auth:expired', () => {
  void useAuth.getState().login();
});
