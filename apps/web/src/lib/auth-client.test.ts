import { describe, expect, it } from 'vitest';
import { buildAuthRedirectUrl } from './auth-client';

describe('buildAuthRedirectUrl', () => {
  const config = {
    keycloakUrl: 'https://ids.vps.resuseducation.com/auth',
    realm: 'opengrade',
    clientId: 'opengrade-web',
  };

  it('builds a PKCE login URL for the Keycloak authorization endpoint', async () => {
    const url = await buildAuthRedirectUrl({
      config,
      mode: 'login',
      redirectUri: 'https://ids.vps.resuseducation.com/',
      state: 'state-123',
      codeVerifier: 'verifier-123',
      createCodeChallenge: async () => 'challenge-123',
    });

    expect(url.pathname).toBe(
      '/auth/realms/opengrade/protocol/openid-connect/auth',
    );
    expect(url.searchParams.get('client_id')).toBe('opengrade-web');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://ids.vps.resuseducation.com/',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('builds a PKCE registration URL for the Keycloak registration endpoint', async () => {
    const url = await buildAuthRedirectUrl({
      config,
      mode: 'register',
      redirectUri: 'https://ids.vps.resuseducation.com/',
      state: 'state-123',
      codeVerifier: 'verifier-123',
      createCodeChallenge: async () => 'challenge-123',
    });

    expect(url.pathname).toBe(
      '/auth/realms/opengrade/protocol/openid-connect/registrations',
    );
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });
});
