import { create } from 'zustand';

export interface OfflineState {
  isOnline: boolean;
  pendingMutationCount: number;
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
  cachedGuidelineIds: string[];
  setOnline: (online: boolean) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  setSyncStatus: (status: OfflineState['syncStatus']) => void;
}

export const useOfflineStore = create<OfflineState>((set) => {
  // Wire up browser online/offline events immediately on store creation
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => set({ isOnline: true }));
    window.addEventListener('offline', () => set({ isOnline: false }));
  }

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingMutationCount: 0,
    syncStatus: 'idle',
    cachedGuidelineIds: [],

    setOnline(online) {
      set({ isOnline: online });
    },

    incrementPending() {
      set((state) => ({ pendingMutationCount: state.pendingMutationCount + 1 }));
    },

    decrementPending() {
      set((state) => ({
        pendingMutationCount: Math.max(0, state.pendingMutationCount - 1),
      }));
    },

    setSyncStatus(status) {
      set({ syncStatus: status });
    },
  };
});
