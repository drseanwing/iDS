export interface OidcConfig {
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
}

interface BuildAuthRedirectUrlOptions {
  config: OidcConfig;
  mode: 'login' | 'register';
  redirectUri: string;
  state: string;
  codeVerifier: string;
  createCodeChallenge?: (codeVerifier: string) => Promise<string>;
}

interface ExchangeCodeOptions {
  config: OidcConfig;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
}

interface RefreshTokenOptions {
  config: OidcConfig;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}

const AUTH_TRANSACTION_KEY = 'opengrade_oidc_transaction';

interface AuthTransaction {
  codeVerifier: string;
  state: string;
  redirectUri: string;
}

function envValue(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function getOidcConfig(): OidcConfig {
  return {
    keycloakUrl: normalizeUrl(envValue('VITE_KEYCLOAK_URL') || `${window.location.origin}/auth`),
    realm: envValue('VITE_KEYCLOAK_REALM') || 'opengrade',
    clientId: envValue('VITE_KEYCLOAK_CLIENT_ID') || 'opengrade-web',
  };
}

export function getApiBaseUrl(): string {
  return normalizeUrl(envValue('VITE_API_URL') || '/api');
}

export function createRandomString(length = 64): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(codeVerifier),
  );
  return base64UrlEncode(digest);
}

export async function buildAuthRedirectUrl({
  config,
  mode,
  redirectUri,
  state,
  codeVerifier,
  createCodeChallenge: makeChallenge = createCodeChallenge,
}: BuildAuthRedirectUrlOptions): Promise<URL> {
  const endpoint = mode === 'register' ? 'registrations' : 'auth';
  const url = new URL(
    `${normalizeUrl(config.keycloakUrl)}/realms/${config.realm}/protocol/openid-connect/${endpoint}`,
  );
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', await makeChallenge(codeVerifier));
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

export function storeAuthTransaction(transaction: AuthTransaction): void {
  sessionStorage.setItem(AUTH_TRANSACTION_KEY, JSON.stringify(transaction));
}

export function readAuthTransaction(): AuthTransaction | null {
  const raw = sessionStorage.getItem(AUTH_TRANSACTION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTransaction;
  } catch {
    return null;
  }
}

export function clearAuthTransaction(): void {
  sessionStorage.removeItem(AUTH_TRANSACTION_KEY);
}

export async function redirectToKeycloak(mode: 'login' | 'register'): Promise<void> {
  const config = getOidcConfig();
  const codeVerifier = createRandomString();
  const state = createRandomString(32);
  const redirectUri = `${window.location.origin}${window.location.pathname}`;
  storeAuthTransaction({ codeVerifier, state, redirectUri });
  const url = await buildAuthRedirectUrl({
    config,
    mode,
    redirectUri,
    state,
    codeVerifier,
  });
  window.location.assign(url.toString());
}

export async function exchangeAuthorizationCode({
  config,
  code,
  codeVerifier,
  redirectUri,
  fetchImpl = fetch,
}: ExchangeCodeOptions): Promise<TokenSet> {
  const url = `${normalizeUrl(config.keycloakUrl)}/realms/${config.realm}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Token exchange failed (${response.status})`);
  return response.json() as Promise<TokenSet>;
}

export async function refreshToken({
  config,
  refreshToken,
  fetchImpl = fetch,
}: RefreshTokenOptions): Promise<TokenSet> {
  const url = `${normalizeUrl(config.keycloakUrl)}/realms/${config.realm}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    refresh_token: refreshToken,
  });
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) throw new Error(`Token refresh failed (${response.status})`);
  return response.json() as Promise<TokenSet>;
}
