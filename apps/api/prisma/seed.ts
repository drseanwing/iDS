import {
  PrismaClient,
  OrgRole,
  GuidelineRole,
  GuidelineType,
  GuidelineStatus,
  StudyType,
  OutcomeType,
  RecommendationStrength,
  RecommendationType,
  CertaintyLevel,
  GradeRating,
} from '@prisma/client';

const prisma = new PrismaClient();

// Fixed UUIDs for deterministic seeding
const IDS = {
  org: '00000000-0000-0000-0000-000000000001',
  adminUser: '00000000-0000-0000-0000-000000000002',
  authorUser: '00000000-0000-0000-0000-000000000003',
  reviewerUser: '00000000-0000-0000-0000-000000000004',
  guideline: '00000000-0000-0000-0000-000000000010',
  section1: '00000000-0000-0000-0000-000000000020',
  section2: '00000000-0000-0000-0000-000000000021',
  section2a: '00000000-0000-0000-0000-000000000022',
  ref1: '00000000-0000-0000-0000-000000000030',
  ref2: '00000000-0000-0000-0000-000000000031',
  pico1: '00000000-0000-0000-0000-000000000040',
  outcome1: '00000000-0000-0000-0000-000000000050',
  outcome2: '00000000-0000-0000-0000-000000000051',
  rec1: '00000000-0000-0000-0000-000000000060',
};

async function main() {
  // ── Organization ─────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: IDS.org },
    update: {},
    create: {
      id: IDS.org,
      name: 'OpenGRADE Demo Organization',
      description: 'Default organization for development and testing',
    },
  });

  // ── Users ────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { keycloakId: 'demo-keycloak-id' },
    update: {},
    create: {
      id: IDS.adminUser,
      keycloakId: 'demo-keycloak-id',
      email: 'demo@opengrade.org',
      displayName: 'Demo Admin',
    },
  });

  const authorUser = await prisma.user.upsert({
    where: { keycloakId: 'author-keycloak-id' },
    update: {},
    create: {
      id: IDS.authorUser,
      keycloakId: 'author-keycloak-id',
      email: 'author@opengrade.org',
      displayName: 'Demo Author',
    },
  });

  const reviewerUser = await prisma.user.upsert({
    where: { keycloakId: 'reviewer-keycloak-id' },
    update: {},
    create: {
      id: IDS.reviewerUser,
      keycloakId: 'reviewer-keycloak-id',
      email: 'reviewer@opengrade.org',
      displayName: 'Demo Reviewer',
    },
  });

  // ── Organization memberships (all roles) ─────────────────
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: adminUser.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: adminUser.id,
      role: OrgRole.ADMIN,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: authorUser.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: authorUser.id,
      role: OrgRole.MEMBER,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: reviewerUser.id },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: reviewerUser.id,
      role: OrgRole.MEMBER,
    },
  });

  // ── Sample Guideline ────────────────────────────────────
  const guideline = await prisma.guideline.upsert({
    where: { id: IDS.guideline },
    update: {},
    create: {
      id: IDS.guideline,
      organizationId: org.id,
      title: 'Sample Clinical Practice Guideline',
      shortName: 'sample-cpg',
      description:
        'A demonstration guideline illustrating the OpenGRADE authoring workflow.',
      language: 'en',
      guidelineType: GuidelineType.ORGANIZATIONAL,
      status: GuidelineStatus.DRAFT,
      createdBy: adminUser.id,
    },
  });

  // ── Guideline permissions ────────────────────────────────
  for (const { userId, role } of [
    { userId: adminUser.id, role: GuidelineRole.ADMIN },
    { userId: authorUser.id, role: GuidelineRole.AUTHOR },
    { userId: reviewerUser.id, role: GuidelineRole.REVIEWER },
  ]) {
    await prisma.guidelinePermission.upsert({
      where: { guidelineId_userId: { guidelineId: guideline.id, userId } },
      update: {},
      create: { guidelineId: guideline.id, userId, role },
    });
  }

  // ── Sections (hierarchical) ──────────────────────────────
  await prisma.section.upsert({
    where: { id: IDS.section1 },
    update: {},
    create: {
      id: IDS.section1,
      guidelineId: guideline.id,
      title: 'Introduction',
      ordering: 0,
      nestingLevel: 0,
    },
  });

  await prisma.section.upsert({
    where: { id: IDS.section2 },
    update: {},
    create: {
      id: IDS.section2,
      guidelineId: guideline.id,
      title: 'Recommendations',
      ordering: 1,
      nestingLevel: 0,
    },
  });

  await prisma.section.upsert({
    where: { id: IDS.section2a },
    update: {},
    create: {
      id: IDS.section2a,
      guidelineId: guideline.id,
      parentId: IDS.section2,
      title: 'Pharmacological Interventions',
      ordering: 0,
      nestingLevel: 1,
    },
  });

  // ── References ───────────────────────────────────────────
  await prisma.reference.upsert({
    where: { id: IDS.ref1 },
    update: {},
    create: {
      id: IDS.ref1,
      guidelineId: guideline.id,
      title:
        'Efficacy and safety of drug X: a systematic review and meta-analysis',
      authors: 'Smith J, Doe A, Johnson B',
      year: 2023,
      studyType: StudyType.SYSTEMATIC_REVIEW,
      doi: '10.1000/example-doi-001',
    },
  });

  await prisma.reference.upsert({
    where: { id: IDS.ref2 },
    update: {},
    create: {
      id: IDS.ref2,
      guidelineId: guideline.id,
      title: 'Randomized controlled trial of drug X vs placebo',
      authors: 'Brown C, Wilson D',
      year: 2022,
      studyType: StudyType.PRIMARY_STUDY,
      pubmedId: '12345678',
    },
  });

  // ── PICO ─────────────────────────────────────────────────
  await prisma.pico.upsert({
    where: { id: IDS.pico1 },
    update: {},
    create: {
      id: IDS.pico1,
      guidelineId: guideline.id,
      population: 'Adults aged 18+ with condition Y',
      intervention: 'Drug X 100mg daily',
      comparator: 'Placebo',
      narrativeSummary:
        'Should drug X be used for adults with condition Y compared to placebo?',
    },
  });

  // ── Outcomes ─────────────────────────────────────────────
  await prisma.outcome.upsert({
    where: { id: IDS.outcome1 },
    update: {},
    create: {
      id: IDS.outcome1,
      picoId: IDS.pico1,
      title: 'All-cause mortality',
      outcomeType: OutcomeType.DICHOTOMOUS,
      importance: 9,
      ordering: 0,
      numberOfStudies: 3,
      certaintyOverall: CertaintyLevel.MODERATE,
      riskOfBias: GradeRating.NOT_SERIOUS,
      inconsistency: GradeRating.NOT_SERIOUS,
      indirectness: GradeRating.NOT_SERIOUS,
      imprecision: GradeRating.SERIOUS,
      publicationBias: GradeRating.NOT_SERIOUS,
    },
  });

  await prisma.outcome.upsert({
    where: { id: IDS.outcome2 },
    update: {},
    create: {
      id: IDS.outcome2,
      picoId: IDS.pico1,
      title: 'Quality of life (SF-36)',
      outcomeType: OutcomeType.CONTINUOUS,
      importance: 7,
      ordering: 1,
      numberOfStudies: 2,
      certaintyOverall: CertaintyLevel.LOW,
      riskOfBias: GradeRating.SERIOUS,
      inconsistency: GradeRating.NOT_SERIOUS,
      indirectness: GradeRating.NOT_SERIOUS,
      imprecision: GradeRating.SERIOUS,
      publicationBias: GradeRating.NOT_SERIOUS,
    },
  });

  // ── Recommendation ───────────────────────────────────────
  await prisma.recommendation.upsert({
    where: { id: IDS.rec1 },
    update: {},
    create: {
      id: IDS.rec1,
      guidelineId: guideline.id,
      title: 'Use of Drug X for condition Y',
      description:
        'We suggest using drug X for adults with condition Y (conditional recommendation, moderate certainty evidence).',
      strength: RecommendationStrength.CONDITIONAL_FOR,
      recommendationType: RecommendationType.GRADE,
      ordering: 0,
      createdBy: adminUser.id,
      updatedBy: adminUser.id,
    },
  });

  // ── Link tables ──────────────────────────────────────────
  // Section ↔ Reference
  await prisma.sectionReference.upsert({
    where: {
      sectionId_referenceId: {
        sectionId: IDS.section2a,
        referenceId: IDS.ref1,
      },
    },
    update: {},
    create: { sectionId: IDS.section2a, referenceId: IDS.ref1, ordering: 0 },
  });

  // Section ↔ PICO
  await prisma.sectionPico.upsert({
    where: {
      sectionId_picoId: { sectionId: IDS.section2a, picoId: IDS.pico1 },
    },
    update: {},
    create: { sectionId: IDS.section2a, picoId: IDS.pico1, ordering: 0 },
  });

  // Section ↔ Recommendation
  await prisma.sectionRecommendation.upsert({
    where: {
      sectionId_recommendationId: {
        sectionId: IDS.section2a,
        recommendationId: IDS.rec1,
      },
    },
    update: {},
    create: {
      sectionId: IDS.section2a,
      recommendationId: IDS.rec1,
      ordering: 0,
    },
  });

  // PICO ↔ Recommendation
  await prisma.picoRecommendation.upsert({
    where: {
      picoId_recommendationId: {
        picoId: IDS.pico1,
        recommendationId: IDS.rec1,
      },
    },
    update: {},
    create: { picoId: IDS.pico1, recommendationId: IDS.rec1 },
  });

  // Outcome ↔ Reference
  await prisma.outcomeReference.upsert({
    where: {
      outcomeId_referenceId: {
        outcomeId: IDS.outcome1,
        referenceId: IDS.ref1,
      },
    },
    update: {},
    create: { outcomeId: IDS.outcome1, referenceId: IDS.ref1 },
  });

  await prisma.outcomeReference.upsert({
    where: {
      outcomeId_referenceId: {
        outcomeId: IDS.outcome1,
        referenceId: IDS.ref2,
      },
    },
    update: {},
    create: { outcomeId: IDS.outcome1, referenceId: IDS.ref2 },
  });

  console.log('Seed data created:', {
    org: org.name,
    users: [adminUser.email, authorUser.email, reviewerUser.email],
    guideline: guideline.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
