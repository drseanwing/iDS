import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { IS_PUBLIC_KEY } from './public.decorator';

type JWKS = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(AuthGuard.name);
  private jwks?: JWKS;
  private issuer?: string;
  private audience?: string;
  private devFallback = false;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const keycloakUrl = this.config.get<string>('KEYCLOAK_URL');
    const realm = this.config.get<string>('KEYCLOAK_REALM');
    const nodeEnv = this.config.get<string>('NODE_ENV');

    if (!keycloakUrl || !realm) {
      if (nodeEnv === 'production') {
        throw new Error(
          'AuthGuard: KEYCLOAK_URL and KEYCLOAK_REALM must be set in production',
        );
      }
      this.devFallback = true;
      this.logger.warn(
        'KEYCLOAK_URL/KEYCLOAK_REALM unset; falling back to unsafe decode-only auth (development only)',
      );
      return;
    }

    this.issuer = `${keycloakUrl.replace(/\/$/, '')}/realms/${realm}`;
    this.audience =
      this.config.get<string>('AUTH_EXPECTED_AUDIENCE') || undefined;
    const jwksUrl = new URL(`${this.issuer}/protocol/openid-connect/certs`);
    this.jwks = createRemoteJWKSet(jwksUrl);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const payload = await this.verifyToken(token);
    request.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || payload.preferred_username,
      roles: payload.realm_access?.roles ?? [],
    };

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const header: string | undefined = request.headers?.authorization;
    if (!header) return undefined;
    const parts = header.split(' ');
    if (parts.length !== 2) return undefined;
    const [type, token] = parts;
    return type === 'Bearer' && token ? token : undefined;
  }

  private async verifyToken(token: string): Promise<any> {
    if (this.devFallback) {
      return this.unsafeDecode(token);
    }

    if (!this.jwks || !this.issuer) {
      throw new UnauthorizedException('Auth not initialized');
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        ...(this.audience ? { audience: this.audience } : {}),
      });
      return payload;
    } catch (err: any) {
      const code = err?.code;
      if (code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException('Token expired');
      }
      if (
        code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
        code === 'ERR_JWKS_NO_MATCHING_KEY'
      ) {
        throw new UnauthorizedException('Invalid token signature');
      }
      if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
        throw new UnauthorizedException('Invalid token claims');
      }
      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private unsafeDecode(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('malformed');
      }
      return JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch {
      throw new UnauthorizedException('Malformed token');
    }
  }
}
