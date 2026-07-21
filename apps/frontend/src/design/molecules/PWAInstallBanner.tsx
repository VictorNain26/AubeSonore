import { X, Download } from 'lucide-react';
import { Button } from '../atoms/Button';

interface PWAInstallBannerViewProps {
  /** Triggers the native install prompt. */
  onInstall: () => void;
  /** Dismisses the banner and persists the dismissal. */
  onDismiss: () => void;
}

/**
 * Presentational card for the PWA install prompt. Pure props-in, no store
 * or side effects — the `PWAInstallBanner` container owns those.
 */
export function PWAInstallBannerView({ onInstall, onDismiss }: PWAInstallBannerViewProps) {
  return (
    <div className="rounded-md border border-border bg-surface-raised flex items-center gap-3 px-4 py-3 max-w-sm w-full">
      <Download className="size-5 text-text-faint shrink-0" />
      <p className="text-body text-text flex-1">Installer AubeSonore</p>
      <Button variant="primary" onClick={onInstall}>
        Installer
      </Button>
      <Button variant="icon" aria-label="Fermer" onClick={onDismiss}>
        <X />
      </Button>
    </div>
  );
}
