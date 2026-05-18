import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedClaims {
  sub?: string;
  email?: string;
  name?: string;
}

@Injectable()
export class AuthUserService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUser(claims: AuthenticatedClaims) {
    if (!claims.sub) return null;

    const email =
      claims.email?.trim() || `user-${claims.sub}@local.opengrade.invalid`;
    const displayName = claims.name?.trim() || claims.email?.trim() || claims.sub;

    return this.prisma.user.upsert({
      where: { keycloakId: claims.sub },
      update: {
        email,
        displayName,
      },
      create: {
        id: claims.sub,
        keycloakId: claims.sub,
        email,
        displayName,
      },
    });
  }
}
