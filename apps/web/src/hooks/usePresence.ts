import { useEffect, useRef, useState, useCallback } from 'react';

export interface UserPresence {
  userId: string;
  userName: string;
  sectionId?: string;
  lastSeen: string;
  color: string;
}

interface UsePresenceOptions {
  guidelineId: string;
  userName: string;
  sectionId?: string;
}

interface UsePresenceResult {
  activeUsers: UserPresence[];
  isConnected: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const HEARTBEAT_INTERVAL_MS = 10_000;

export function usePresence({ guidelineId, userName, sectionId }: UsePresenceOptions): UsePresenceResult {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const sectionIdRef = useRef(sectionId);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep sectionId ref in sync without resetting effects
  useEffect(() => {
    sectionIdRef.current = sectionId;
  }, [sectionId]);

  const sendPost = useCallback(
    (path: string, body?: Record<string, unknown>) => {
      fetch(`${API_BASE}/presence/${guidelineId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      }).catch(() => {
        // silently ignore network errors for presence
      });
    },
    [guidelineId],
  );

  useEffect(() => {
    if (!guidelineId || !userName) return;

    // Join on mount
    sendPost('join', { userName });

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      sendPost('heartbeat', { sectionId: sectionIdRef.current });
    }, HEARTBEAT_INTERVAL_MS);

    // Open SSE stream
    const eventSource = new EventSource(
      `${API_BASE}/presence/${guidelineId}/stream`,
      { withCredentials: true },
    );

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      try {
        const users: UserPresence[] = JSON.parse(event.data as string);
        setActiveUsers(users);
      } catch {
        // ignore malformed frames
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      sendPost('leave');
      setIsConnected(false);
    };
  }, [guidelineId, userName, sendPost]);

  return { activeUsers, isConnected };
}
