import { X, Download } from 'lucide-react';
import { Button } from '../atoms/Button';
import * as m from '@/paraglide/messages.js';

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
    <div className="border-border bg-surface-raised flex w-full max-w-sm items-center gap-3 rounded-md border px-4 py-3">
      <Download className="text-text-faint size-5 shrink-0" />
      <p className="text-body text-text flex-1">{m.pwa_install_title()}</p>
      <Button variant="primary" onClick={onInstall}>
        {m.pwa_install_action()}
      </Button>
      <Button variant="icon" aria-label={m.close()} onClick={onDismiss}>
        <X />
      </Button>
    </div>
  );
}
