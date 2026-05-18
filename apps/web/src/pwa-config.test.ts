import { describe, expect, it } from 'vitest';
import { pwaWorkboxOptions, serviceWorkerNavigationDenylist } from './lib/pwa-workbox';

function isDenied(path: string) {
  return serviceWorkerNavigationDenylist.some((pattern) => pattern.test(path));
}

describe('PWA service worker navigation fallback', () => {
  it('does not serve the SPA shell for backend and Keycloak routes', () => {
    expect(isDenied('/auth/realms/opengrade/protocol/openid-connect/registrations')).toBe(true);
    expect(isDenied('/api/guidelines')).toBe(true);
    expect(isDenied('/health')).toBe(true);
  });

  it('still allows client-side application routes to use the SPA shell', () => {
    expect(isDenied('/')).toBe(false);
    expect(isDenied('/guidelines')).toBe(false);
    expect(isDenied('/references')).toBe(false);
  });

  it('wires the denylist into Workbox', () => {
    expect(pwaWorkboxOptions.navigateFallbackDenylist).toBe(serviceWorkerNavigationDenylist);
  });
});
