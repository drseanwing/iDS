# IDS Keycloak Auth Origin Split

Status: applied on 2026-05-18

## Problem

`ids.vps.resuseducation.com` served both the OpenGRADE web app and Keycloak under `/auth`. The web app registers a PWA service worker with root scope `/`, so browsers that first visited the app could have that service worker controlling Keycloak admin pages under the same origin.

Observed failure pattern:

- Keycloak password reset requests returned `204`.
- A later Keycloak admin request for user credentials returned `401`.
- The browser showed a generic fetch failure.
- A clean browser that opened `/auth` directly was not controlled by the app service worker.

## Applied Fix

Keycloak now has a separate browser origin:

```text
https://authids.vps.resuseducation.com/auth
```

The app remains:

```text
https://ids.vps.resuseducation.com
```

Live deployment changes:

- DNS: `authids.vps.resuseducation.com` A record points to `168.231.103.86`.
- TLS: certbot certificate exists at `/etc/letsencrypt/live/authids.vps.resuseducation.com/`.
- Nginx: `/etc/nginx/sites-available/authids.vps.resuseducation.com` proxies `^~ /auth/` to `127.0.0.1:8083`.
- Nginx: `/etc/nginx/sites-available/ids.vps.resuseducation.com` redirects `/auth` and `/auth/` to the auth origin.
- Keycloak container env: `KC_HOSTNAME=authids.vps.resuseducation.com`.
- Web build arg: `VITE_KEYCLOAK_URL=https://authids.vps.resuseducation.com/auth`.
- API env: `AUTH_ISSUER=https://authids.vps.resuseducation.com/auth/realms/opengrade`.
- Kuma: monitor `ids-keycloak-authids-oidc` checks the opengrade OIDC discovery document for the new issuer.

The local production files `docker-compose.prod.yml` and `apps/api/.env.prod` contain deployment-specific values and are intentionally not committed.

## Recreate Commands

Create DNS, TLS, and the initial nginx vhost:

```bash
set +x
HOSTINGER_API_TOKEN="$(sops -d /home/sean/.secrets/main.env.sops.yaml | awk -F': ' '$1=="HOSTINGER_API_TOKEN" {print $2; exit}')"
export HOSTINGER_API_TOKEN
sudo -E /home/sean/subdomain/nginx-proxy-add.sh -s authids -i 8083
```

Patch the generated auth vhost so Keycloak discovery paths under `/auth/.../.well-known` are not blocked by the generic dotfile deny rule:

```nginx
location = /auth {
    return 308 /auth/;
}

location ^~ /auth/ {
    proxy_pass http://127.0.0.1:8083;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header X-Forwarded-Prefix /auth;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 3600s;
    proxy_buffering off;
}

location / {
    return 308 /auth/;
}
```

Patch the app vhost:

```nginx
location = /auth {
    return 308 https://authids.vps.resuseducation.com/auth/;
}

location ^~ /auth/ {
    return 308 https://authids.vps.resuseducation.com$request_uri;
}
```

Reload nginx:

```bash
sudo nginx -t
sudo nginx -s reload
```

Update local production config:

```text
docker-compose.prod.yml:
  KC_HOSTNAME: authids.vps.resuseducation.com
  VITE_KEYCLOAK_URL=https://authids.vps.resuseducation.com/auth

apps/api/.env.prod:
  AUTH_ISSUER=https://authids.vps.resuseducation.com/auth/realms/opengrade
```

Rebuild and restart:

```bash
docker compose -f docker-compose.prod.yml up -d --build --force-recreate keycloak api web
```

## Verification

OIDC discovery must advertise the new issuer:

```bash
curl -ksS https://authids.vps.resuseducation.com/auth/realms/opengrade/.well-known/openid-configuration | jq -r '.issuer'
```

Expected:

```text
https://authids.vps.resuseducation.com/auth/realms/opengrade
```

The old app-origin auth path must redirect:

```bash
curl -ksSI https://ids.vps.resuseducation.com/auth/admin/master/console/ | sed -n '1,8p'
```

Expected: `308` with `Location: https://authids.vps.resuseducation.com/auth/admin/master/console/`.

The built web bundle must contain the new auth origin:

```bash
ASSET="$(curl -ksS https://ids.vps.resuseducation.com/ | rg -o 'index-[A-Za-z0-9_-]+\.js' | head -1)"
curl -ksS "https://ids.vps.resuseducation.com/assets/${ASSET}" | rg 'authids\.vps\.resuseducation\.com'
```

Playwright service-worker smoke:

- Visit `https://ids.vps.resuseducation.com/`.
- Confirm the app has a service-worker registration.
- Navigate to `https://ids.vps.resuseducation.com/auth/admin/master/console/`.
- Confirm the final URL is on `https://authids.vps.resuseducation.com/...`.
- Confirm `navigator.serviceWorker.controller` is false on the Keycloak page.
