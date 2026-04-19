import { useOfflineStore } from '../lib/offline-store';

/**
 * Returns the current offline status from the global offline store.
 *
 * @example
 * const { isOnline, pendingMutationCount, syncStatus } = useOfflineStatus();
 */
export function useOfflineStatus() {
  const isOnline = useOfflineStore((s) => s.isOnline);
  const pendingMutationCount = useOfflineStore((s) => s.pendingMutationCount);
  const syncStatus = useOfflineStore((s) => s.syncStatus);

  return { isOnline, pendingMutationCount, syncStatus };
}
