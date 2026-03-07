import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import GatewayFooter from '@/platform/components/GatewayFooter';

interface GatewayPageLayoutProps {
  children: ReactNode;
  contentClassName?: string;
  mainClassName?: string;
  showFooter?: boolean;
}

function getVisibleViewportHeight() {
  const visualViewportHeight = window.visualViewport?.height;

  if (typeof visualViewportHeight === 'number' && visualViewportHeight > 0) {
    return Math.round(visualViewportHeight);
  }

  return window.innerHeight;
}

export default function GatewayPageLayout({
  children,
  contentClassName,
  mainClassName,
  showFooter = true,
}: GatewayPageLayoutProps) {
  const [minHeight, setMinHeight] = useState(() => `${getVisibleViewportHeight()}px`);

  useEffect(() => {
    const updateViewportHeight = () => {
      setMinHeight(`${getVisibleViewportHeight()}px`);
    };

    const visualViewport = window.visualViewport;
    updateViewportHeight();

    visualViewport?.addEventListener('resize', updateViewportHeight);
    visualViewport?.addEventListener('scroll', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);

    return () => {
      visualViewport?.removeEventListener('resize', updateViewportHeight);
      visualViewport?.removeEventListener('scroll', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  return (
    <div className="flex flex-col bg-background" style={{ minHeight }}>
      <main className={cn('flex flex-1 items-center justify-center p-4', mainClassName)}>
        <div className={cn('w-full', contentClassName)}>
          {children}
        </div>
      </main>
      {showFooter ? <GatewayFooter /> : null}
    </div>
  );
}
