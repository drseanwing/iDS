import { Injectable } from '@nestjs/common';

export interface UserPresence {
  userId: string;
  userName: string;
  sectionId?: string;
  lastSeen: Date;
  color: string;
}

const COLOR_PALETTE = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

const STALE_THRESHOLD_MS = 30_000;

@Injectable()
export class PresenceService {
  private readonly presenceMap = new Map<string, Map<string, UserPresence>>();

  private getGuidelineMap(guidelineId: string): Map<string, UserPresence> {
    let map = this.presenceMap.get(guidelineId);
    if (!map) {
      map = new Map<string, UserPresence>();
      this.presenceMap.set(guidelineId, map);
    }
    return map;
  }

  private assignColor(guidelineId: string): string {
    const map = this.getGuidelineMap(guidelineId);
    const usedColors = new Set([...map.values()].map((u) => u.color));
    const available = COLOR_PALETTE.find((c) => !usedColors.has(c));
    return available ?? COLOR_PALETTE[map.size % COLOR_PALETTE.length];
  }

  join(guidelineId: string, userId: string, userName: string): UserPresence {
    const map = this.getGuidelineMap(guidelineId);
    const existing = map.get(userId);
    if (existing) {
      existing.lastSeen = new Date();
      return existing;
    }
    const presence: UserPresence = {
      userId,
      userName,
      lastSeen: new Date(),
      color: this.assignColor(guidelineId),
    };
    map.set(userId, presence);
    return presence;
  }

  leave(guidelineId: string, userId: string): void {
    const map = this.presenceMap.get(guidelineId);
    if (map) {
      map.delete(userId);
      if (map.size === 0) {
        this.presenceMap.delete(guidelineId);
      }
    }
  }

  heartbeat(guidelineId: string, userId: string, sectionId?: string): UserPresence | null {
    const map = this.presenceMap.get(guidelineId);
    const presence = map?.get(userId);
    if (!presence) return null;
    presence.lastSeen = new Date();
    if (sectionId !== undefined) {
      presence.sectionId = sectionId;
    }
    return presence;
  }

  getPresence(guidelineId: string): UserPresence[] {
    const map = this.presenceMap.get(guidelineId);
    if (!map) return [];
    const now = Date.now();
    const active: UserPresence[] = [];
    for (const [userId, presence] of map.entries()) {
      if (now - presence.lastSeen.getTime() <= STALE_THRESHOLD_MS) {
        active.push(presence);
      } else {
        map.delete(userId);
      }
    }
    return active;
  }
}
