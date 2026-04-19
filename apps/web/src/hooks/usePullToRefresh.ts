import { useEffect, useRef, useCallback } from 'react';

const PULL_THRESHOLD = 60; // px of pull required to trigger refresh

interface UsePullToRefreshOptions {
  /** Callback invoked when the user pulls down far enough */
  onRefresh: () => void | Promise<void>;
  /** Element to attach listeners to (defaults to document.body) */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Minimum pull distance in px to trigger refresh (default: 60) */
  threshold?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Adds pull-to-refresh capability to a scrollable container or the page body.
 * The `onRefresh` callback is called when the user pulls down more than
 * `threshold` pixels from the top of the target element.
 *
 * Only triggers when the target is already scrolled to the top (scrollTop === 0).
 */
export function usePullToRefresh({
  onRefresh,
  targetRef,
  threshold = PULL_THRESHOLD,
  enabled = true,
}: UsePullToRefreshOptions): void {
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = targetRef?.current ?? document.scrollingElement ?? document.documentElement;
    // Only start tracking if we're at the top of the scroll container
    if (el.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    }
  }, [targetRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      isPullingRef.current = true;
      // Prevent default scroll bounce only while actively pulling
      // so we don't interfere with normal scrolling
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null || !isPullingRef.current) {
        startYRef.current = null;
        isPullingRef.current = false;
        return;
      }

      const endY = e.changedTouches[0].clientY;
      const delta = endY - startYRef.current;

      startYRef.current = null;
      isPullingRef.current = false;

      if (delta >= threshold) {
        onRefresh();
      }
    },
    [onRefresh, threshold],
  );

  useEffect(() => {
    if (!enabled) return;

    const el = targetRef?.current ?? window;

    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
    el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener);
      el.removeEventListener('touchmove', handleTouchMove as EventListener);
      el.removeEventListener('touchend', handleTouchEnd as EventListener);
    };
  }, [enabled, targetRef, handleTouchStart, handleTouchMove, handleTouchEnd]);
}
