import { PrismaClient, OrgRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed a default organization
  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'OpenGRADE Demo Organization',
      description: 'Default organization for development and testing',
    },
  });

  // Seed a demo user
  const user = await prisma.user.upsert({
    where: { keycloakId: 'demo-keycloak-id' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      keycloakId: 'demo-keycloak-id',
      email: 'demo@opengrade.org',
      displayName: 'Demo User',
    },
  });

  // Make user an admin of the organization
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: OrgRole.ADMIN,
    },
  });

  console.log('Seed data created:', { org: org.name, user: user.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
