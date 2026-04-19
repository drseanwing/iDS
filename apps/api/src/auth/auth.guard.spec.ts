import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(),
}));

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthGuard } from './auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

const mockedJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockedCreateRemoteJWKSet = createRemoteJWKSet as jest.MockedFunction<
  typeof createRemoteJWKSet
>;

function makeContext(req: any, isPublic = false): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return Object.assign(ctx, { __reflector: reflector }) as ExecutionContext;
}

function makeConfig(entries: Record<string, string | undefined>): ConfigService {
  return {
    get: jest.fn((key: string) => entries[key]),
  } as unknown as ConfigService;
}

describe('AuthGuard', () => {
  let reflector: Reflector;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
  });

  function buildGuard(config: ConfigService): AuthGuard {
    const guard = new AuthGuard(reflector, config);
    guard.onModuleInit();
    return guard;
  }

  const prodConfig = () =>
    makeConfig({
      KEYCLOAK_URL: 'http://kc.example.com',
      KEYCLOAK_REALM: 'opengrade',
      KEYCLOAK_CLIENT_ID: 'opengrade-api',
      AUTH_EXPECTED_AUDIENCE: 'opengrade-api',
      NODE_ENV: 'production',
    });

  it('skips auth for public routes', async () => {
    const guard = buildGuard(prodConfig());
    (reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(true);
    const req: any = { headers: {} };
    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => undefined,
        getClass: () => undefined,
      } as unknown as ExecutionContext),
    ).resolves.toBe(true);
    expect(mockedJwtVerify).not.toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('throws 401 when Authorization header is missing', async () => {
    const guard = buildGuard(prodConfig());
    const req: any = { headers: {} };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 when Authorization header is malformed', async () => {
    const guard = buildGuard(prodConfig());
    const req: any = { headers: { authorization: 'NotBearer xyz' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    const req2: any = { headers: { authorization: 'Bearer' } };
    const ctx2 = {
      switchToHttp: () => ({ getRequest: () => req2 }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx2)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches user with expected shape on valid token', async () => {
    const guard = buildGuard(prodConfig());
    mockedJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'user-123',
        email: 'a@b.com',
        name: 'Alice',
        preferred_username: 'alice',
        realm_access: { roles: ['admin', 'editor'] },
      },
      protectedHeader: { alg: 'RS256' },
    } as any);
    const req: any = { headers: { authorization: 'Bearer valid.token.here' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      sub: 'user-123',
      email: 'a@b.com',
      name: 'Alice',
      roles: ['admin', 'editor'],
    });
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      'valid.token.here',
      expect.any(Function),
      expect.objectContaining({
        issuer: 'http://kc.example.com/realms/opengrade',
        audience: 'opengrade-api',
      }),
    );
  });

  it('falls back to preferred_username when name is missing and handles missing roles', async () => {
    const guard = buildGuard(prodConfig());
    mockedJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: 'u2',
        email: 'c@d.com',
        preferred_username: 'bob',
      },
      protectedHeader: { alg: 'RS256' },
    } as any);
    const req: any = { headers: { authorization: 'Bearer t' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect(req.user).toEqual({
      sub: 'u2',
      email: 'c@d.com',
      name: 'bob',
      roles: [],
    });
  });

  it('throws 401 on invalid signature', async () => {
    const guard = buildGuard(prodConfig());
    const err: any = new Error('bad sig');
    err.code = 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED';
    mockedJwtVerify.mockRejectedValueOnce(err);
    const req: any = { headers: { authorization: 'Bearer forged' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('throws 401 on expired token', async () => {
    const guard = buildGuard(prodConfig());
    const err: any = new Error('expired');
    err.code = 'ERR_JWT_EXPIRED';
    mockedJwtVerify.mockRejectedValueOnce(err);
    const req: any = { headers: { authorization: 'Bearer expired' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('skips audience check when AUTH_EXPECTED_AUDIENCE is unset', async () => {
    const guard = buildGuard(
      makeConfig({
        KEYCLOAK_URL: 'http://kc.example.com',
        KEYCLOAK_REALM: 'opengrade',
        KEYCLOAK_CLIENT_ID: 'opengrade-api',
        NODE_ENV: 'production',
      }),
    );
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'u', realm_access: { roles: [] } },
      protectedHeader: { alg: 'RS256' },
    } as any);
    const req: any = { headers: { authorization: 'Bearer t' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      't',
      expect.any(Function),
      expect.not.objectContaining({ audience: expect.anything() }),
    );
  });

  it('honours AUTH_ISSUER and AUTH_JWKS_URL overrides for non-Keycloak OIDC', async () => {
    const guard = buildGuard(
      makeConfig({
        KEYCLOAK_URL: 'http://kc.example.com',
        KEYCLOAK_REALM: 'opengrade',
        AUTH_ISSUER: 'http://oidc-mock:8080',
        AUTH_JWKS_URL: 'http://oidc-mock:8080/.well-known/openid-configuration/jwks',
        NODE_ENV: 'production',
      }),
    );
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'u', realm_access: { roles: [] } },
      protectedHeader: { alg: 'RS256' },
    } as any);
    const req: any = { headers: { authorization: 'Bearer t' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect(mockedCreateRemoteJWKSet).toHaveBeenCalledWith(
      new URL('http://oidc-mock:8080/.well-known/openid-configuration/jwks'),
    );
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      't',
      expect.any(Function),
      expect.objectContaining({ issuer: 'http://oidc-mock:8080' }),
    );
  });

  it('throws at startup in production when Keycloak config missing', () => {
    const config = makeConfig({ NODE_ENV: 'production' });
    const guard = new AuthGuard(reflector, config);
    expect(() => guard.onModuleInit()).toThrow(
      /KEYCLOAK_URL and KEYCLOAK_REALM/,
    );
  });

  it('falls back to unsafe decode in development when config is missing', async () => {
    const config = makeConfig({ NODE_ENV: 'development' });
    const guard = new AuthGuard(reflector, config);
    guard.onModuleInit();
    const payload = {
      sub: 'u9',
      email: 'x@y.com',
      name: 'Dev',
      realm_access: { roles: ['r'] },
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const token = `h.${b64}.s`;
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      sub: 'u9',
      email: 'x@y.com',
      name: 'Dev',
      roles: ['r'],
    });
    expect(mockedJwtVerify).not.toHaveBeenCalled();
    expect(mockedCreateRemoteJWKSet).not.toHaveBeenCalled();
  });
});
