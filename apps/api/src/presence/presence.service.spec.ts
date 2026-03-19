import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let service: PresenceService;
  const guidelineId = '00000000-0000-0000-0000-000000000001';
  const userId1 = 'user-1';
  const userId2 = 'user-2';

  beforeEach(() => {
    service = new PresenceService();
  });

  describe('join', () => {
    it('adds a user with a color assigned', () => {
      const presence = service.join(guidelineId, userId1, 'Alice');
      expect(presence.userId).toBe(userId1);
      expect(presence.userName).toBe('Alice');
      expect(presence.color).toBeDefined();
      expect(presence.lastSeen).toBeInstanceOf(Date);
    });

    it('returns existing presence without reassigning color on double-join', () => {
      const first = service.join(guidelineId, userId1, 'Alice');
      const second = service.join(guidelineId, userId1, 'Alice');
      expect(second.color).toBe(first.color);
    });

    it('assigns distinct colors to different users', () => {
      const p1 = service.join(guidelineId, userId1, 'Alice');
      const p2 = service.join(guidelineId, userId2, 'Bob');
      expect(p1.color).not.toBe(p2.color);
    });
  });

  describe('leave', () => {
    it('removes a user from presence', () => {
      service.join(guidelineId, userId1, 'Alice');
      service.leave(guidelineId, userId1);
      expect(service.getPresence(guidelineId)).toHaveLength(0);
    });

    it('is a no-op for unknown user', () => {
      expect(() => service.leave(guidelineId, 'ghost')).not.toThrow();
    });
  });

  describe('heartbeat', () => {
    it('updates lastSeen and sectionId', () => {
      service.join(guidelineId, userId1, 'Alice');
      const updated = service.heartbeat(guidelineId, userId1, 'section-42');
      expect(updated).not.toBeNull();
      expect(updated!.sectionId).toBe('section-42');
    });

    it('returns null for unknown user', () => {
      const result = service.heartbeat(guidelineId, 'ghost', 'section-1');
      expect(result).toBeNull();
    });

    it('does not reset sectionId when called without one', () => {
      service.join(guidelineId, userId1, 'Alice');
      service.heartbeat(guidelineId, userId1, 'section-42');
      const updated = service.heartbeat(guidelineId, userId1, undefined);
      expect(updated!.sectionId).toBe('section-42');
    });
  });

  describe('getPresence', () => {
    it('returns empty array for unknown guideline', () => {
      expect(service.getPresence('unknown-id')).toEqual([]);
    });

    it('returns active users', () => {
      service.join(guidelineId, userId1, 'Alice');
      service.join(guidelineId, userId2, 'Bob');
      expect(service.getPresence(guidelineId)).toHaveLength(2);
    });

    it('filters out stale users (lastSeen > 30s ago)', () => {
      service.join(guidelineId, userId1, 'Alice');
      const stalePresence = service.join(guidelineId, userId2, 'Bob');
      // Backdate lastSeen to 31 seconds ago
      stalePresence.lastSeen = new Date(Date.now() - 31_000);

      const active = service.getPresence(guidelineId);
      expect(active).toHaveLength(1);
      expect(active[0].userId).toBe(userId1);
    });
  });
});
