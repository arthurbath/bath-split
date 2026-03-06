import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

export const PULL_TO_REFRESH_TRIGGER_DISTANCE = 120;
const PULL_RESISTANCE = 0.4;
const MAX_PULL = 200;
const RING_SIZE = 16;
const RING_STROKE_WIDTH = 2;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type StandaloneNavigator = Navigator & {
  standalone?: boolean;
};

/**
 * Pull-to-refresh wrapper that only activates in standalone (PWA) mode.
 * Triggers a full page reload when the user pulls down from the top.
 */
export function PullToRefresh({
  children,
  disabled,
  onRefresh,
}: {
  children: ReactNode;
  disabled?: boolean;
  onRefresh?: () => void;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const standalone =
      (window.navigator as StandaloneNavigator).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(standalone);
  }, []);

  const isOverlayOpen = useCallback(() => {
    if (disabled) return true;
    return !!document.querySelector(
      '[role="dialog"], [data-radix-portal], [data-vaul-drawer]',
    );
  }, [disabled]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing || isOverlayOpen()) return;
      if (window.scrollY <= 0) {
        touchStartY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    },
    [refreshing, isOverlayOpen],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * PULL_RESISTANCE, MAX_PULL));
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [refreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_TO_REFRESH_TRIGGER_DISTANCE && !refreshing) {
      setRefreshing(true);
      onRefresh?.();
      if (!onRefresh) {
        window.location.reload();
      }
    } else {
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, refreshing]);

  if (!isStandalone) {
    return <>{children}</>;
  }

  const progress = Math.min(pullDistance / PULL_TO_REFRESH_TRIGGER_DISTANCE, 1);
  const progressPercent = Math.round(progress * 100);
  const showIndicator = pullDistance > 5 || refreshing;
  const ringOffset = RING_CIRCUMFERENCE * (1 - (refreshing ? 1 : progress));

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          paddingTop: showIndicator || refreshing ? 'env(safe-area-inset-top, 0px)' : '0px',
          height: refreshing
            ? 'calc(40px + env(safe-area-inset-top, 0px))'
            : showIndicator
              ? `calc(${pullDistance}px + env(safe-area-inset-top, 0px))`
              : '0px',
          transition: isPulling.current || refreshing ? 'none' : 'height 0.15s ease-out',
        }}
      >
        <svg
          aria-label="Pull to refresh"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={refreshing ? 100 : progressPercent}
          className="h-4 w-4 text-muted-foreground"
          role="progressbar"
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeWidth={RING_STROKE_WIDTH}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={ringOffset}
            strokeLinecap="round"
            strokeWidth={RING_STROKE_WIDTH}
            style={{
              opacity: refreshing ? 1 : Math.max(progress, 0.16),
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: isPulling.current || refreshing ? 'none' : 'stroke-dashoffset 0.15s ease-out',
            }}
          />
        </svg>
      </div>
      {children}
    </div>
  );
}
