import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useHostModule } from '@/platform/hooks/useHostModule';
import { getModuleById, type PlatformModuleId } from '@/platform/modules';

const DEFAULT_TITLE = 'BathOS';
const DEFAULT_ICON = '/favicon.png';
const DEFAULT_APPLE_ICON = '/apple-touch-icon.png';

/** iOS/macOS Safari ignores dynamic (Blob) manifests for "Add to Home Screen".
 *  By removing the manifest link entirely on these platforms, Safari falls back
 *  to plain-bookmark behaviour — capturing the current URL and document.title. */
const IS_APPLE_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

const MODULE_MANIFEST_MAP: Partial<Record<PlatformModuleId, string>> = {
  budget: '/manifest-budget.json',
  drawers: '/manifest-drawers.json',
  garage: '/manifest-garage.json',
  admin: '/manifest-admin.json',
};

function setLinkHref(rel: string, href: string) {
  const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (link) {
    link.href = href;
  }
}

function setManifestLink(href: string | null) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return;

  if (href) {
    link.href = href;
    link.removeAttribute('data-removed');
  } else {
    // Remove manifest so Safari uses bookmark semantics
    link.removeAttribute('href');
    link.setAttribute('data-removed', 'true');
  }
}

export function useDocumentHead() {
  const moduleId = useHostModule();
  const location = useLocation();

  useEffect(() => {
    const firstSegment = location.pathname.split('/')[1];
    const effectiveId = firstSegment === 'admin' ? 'admin' : moduleId;
    const mod = effectiveId ? getModuleById(effectiveId as PlatformModuleId) : undefined;

    if (mod) {
      document.title = mod.name;
      const icon = mod.iconPath ?? DEFAULT_ICON;
      setLinkHref('icon', icon);
      setLinkHref('apple-touch-icon', icon);

      if (IS_APPLE_SAFARI) {
        // Remove manifest so iOS/macOS A2HS captures current URL + title
        setManifestLink(null);
      } else {
        // Chrome/Edge/etc. respect the manifest for A2HS
        const manifestPath = MODULE_MANIFEST_MAP[mod.id] ?? '/manifest.json';
        setManifestLink(manifestPath);
      }
    } else {
      document.title = DEFAULT_TITLE;
      setLinkHref('icon', DEFAULT_ICON);
      setLinkHref('apple-touch-icon', DEFAULT_APPLE_ICON);
      setManifestLink('/manifest.json');
    }
  }, [moduleId, location.pathname]);
}
