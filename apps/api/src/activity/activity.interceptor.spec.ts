import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ActivityLoggingInterceptor } from './activity.interceptor';
import { ActivityService } from './activity.service';

const GUIDELINE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ENTITY_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const USER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

function buildContext(overrides: {
  method: string;
  path?: string;
  url?: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  user?: { sub: string };
}): ExecutionContext {
  const request = {
    method: overrides.method,
    route: { path: overrides.path ?? '/guidelines/:id' },
    url: overrides.url ?? overrides.path ?? '/guidelines/:id',
    params: overrides.params ?? { id: ENTITY_ID },
    body: overrides.body ?? { guidelineId: GUIDELINE_ID },
    user: overrides.user ?? undefined,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function buildHandler(returnValue: unknown): CallHandler {
  return { handle: () => of(returnValue) };
}

describe('ActivityLoggingInterceptor', () => {
  let interceptor: ActivityLoggingInterceptor;
  let mockActivityService: jest.Mocked<Pick<ActivityService, 'log'>>;

  beforeEach(() => {
    mockActivityService = {
      log: jest.fn().mockResolvedValue(undefined),
    };
    interceptor = new ActivityLoggingInterceptor(
      mockActivityService as unknown as ActivityService,
    );
  });

  // ── GET requests must NOT be logged ──────────────────────────────────────

  it('does not log GET requests', async () => {
    const ctx = buildContext({ method: 'GET' });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).not.toHaveBeenCalled();
  });

  // ── POST requests must be logged ─────────────────────────────────────────

  it('logs POST requests with CREATE action', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/sections',
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'CREATE',
        entityType: 'Section',
        guidelineId: GUIDELINE_ID,
        entityId: ENTITY_ID,
      }),
    );
  });

  // ── PUT requests must be logged ───────────────────────────────────────────

  it('logs PUT requests with UPDATE action', async () => {
    const ctx = buildContext({
      method: 'PUT',
      path: '/sections/:id',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'UPDATE' }),
    );
  });

  // ── PATCH requests must be logged ─────────────────────────────────────────

  it('logs PATCH requests with UPDATE action', async () => {
    const ctx = buildContext({
      method: 'PATCH',
      path: '/recommendations/:id',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'UPDATE' }),
    );
  });

  // ── DELETE requests must be logged ───────────────────────────────────────

  it('logs DELETE requests with DELETE action', async () => {
    const ctx = buildContext({
      method: 'DELETE',
      path: '/sections/:id',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'DELETE' }),
    );
  });

  // ── User context ──────────────────────────────────────────────────────────

  it('captures userId from request.user.sub when available', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/sections',
      body: { guidelineId: GUIDELINE_ID },
      user: { sub: USER_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID }),
    );
  });

  it('falls back to placeholder userId when no auth context', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/sections',
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: '00000000-0000-0000-0000-000000000001' }),
    );
  });

  // ── Special action types ──────────────────────────────────────────────────

  it('logs restore as RESTORE action', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/sections/:id/restore',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: 'RESTORE' }),
    );
  });

  it('logs status change as STATUS_CHANGE action with newStatus in changeDetails', async () => {
    const ctx = buildContext({
      method: 'PUT',
      path: '/guidelines/:id/status',
      params: { id: ENTITY_ID },
      body: { status: 'PUBLISHED' },
    });
    // guideline route: :id IS the guidelineId
    const handler = buildHandler({ id: ENTITY_ID, status: 'PUBLISHED' });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'STATUS_CHANGE',
        guidelineId: ENTITY_ID,
        changeDetails: expect.objectContaining({ newStatus: 'PUBLISHED' }),
      }),
    );
  });

  it('logs permission add as PERMISSION_CHANGE with role in changeDetails', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/guidelines/:id/permissions',
      params: { id: ENTITY_ID },
      body: { userId: USER_ID, role: 'AUTHOR' },
    });
    const handler = buildHandler({ id: USER_ID, guidelineId: ENTITY_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'PERMISSION_CHANGE',
        entityType: 'GuidelinePermission',
        changeDetails: expect.objectContaining({ role: 'AUTHOR', targetUserId: USER_ID }),
      }),
    );
  });

  it('logs version publish as PUBLISH with versionNumber in changeDetails', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/versions',
      body: { guidelineId: GUIDELINE_ID, versionType: 'MAJOR' },
    });
    const handler = buildHandler({
      id: ENTITY_ID,
      guidelineId: GUIDELINE_ID,
      versionNumber: 2,
      versionType: 'MAJOR',
    });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'PUBLISH',
        entityType: 'GuidelineVersion',
        changeDetails: expect.objectContaining({ versionNumber: 2, versionType: 'MAJOR' }),
      }),
    );
  });

  it('logs file upload as UPLOAD with fileName in changeDetails', async () => {
    const request = {
      method: 'POST',
      route: { path: '/references/:id/attachments' },
      url: '/references/:id/attachments',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID },
      file: { originalname: 'paper.pdf', size: 12345, mimetype: 'application/pdf' },
      user: undefined,
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const handler = buildHandler({ id: 'att-id', guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'UPLOAD',
        entityType: 'ReferenceAttachment',
        changeDetails: expect.objectContaining({
          fileName: 'paper.pdf',
          fileSize: 12345,
          mimeType: 'application/pdf',
        }),
      }),
    );
  });

  it('logs poll vote as VOTE with voteValue in changeDetails', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/polls/:id/vote',
      params: { id: ENTITY_ID },
      body: { guidelineId: GUIDELINE_ID, value: 7, comment: 'Agree' },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'VOTE',
        entityType: 'PollVote',
        changeDetails: expect.objectContaining({ voteValue: 7, voteComment: 'Agree' }),
      }),
    );
  });

  // ── Guard: no guidelineId means no log ───────────────────────────────────

  it('does not log when guidelineId cannot be resolved', async () => {
    const ctx = buildContext({
      method: 'POST',
      path: '/some-unknown-route',
      params: { id: ENTITY_ID },
      body: {},
    });
    const handler = buildHandler({ id: ENTITY_ID });
    await lastValueFrom(interceptor.intercept(ctx, handler));
    expect(mockActivityService.log).not.toHaveBeenCalled();
  });

  // ── Resilience: logging failure must not propagate ────────────────────────

  it('does not throw when ActivityService.log rejects', async () => {
    mockActivityService.log.mockRejectedValueOnce(new Error('DB error'));
    const ctx = buildContext({
      method: 'POST',
      path: '/sections',
      body: { guidelineId: GUIDELINE_ID },
    });
    const handler = buildHandler({ id: ENTITY_ID, guidelineId: GUIDELINE_ID });
    await expect(lastValueFrom(interceptor.intercept(ctx, handler))).resolves.not.toThrow();
  });
});
