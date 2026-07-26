import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogIn, Info } from 'lucide-react';
import { Button } from '../atoms/Button';
import { LibraryButton } from '../../components/Player/LibraryButton';
import { TrendsButton } from '../../components/Player/TrendsButton';
import { SettingsMenu } from '../../components/SettingsMenu';
import * as m from '@/paraglide/messages.js';

export interface LayoutUser {
  name: string | null;
  email: string;
}

export interface LayoutViewProps {
  /** Contenu de la page, rendu dans le landmark `<main>`. */
  children: ReactNode;
  /** Utilisateur connecté, ou `null` si personne n'est authentifié. */
  user: LayoutUser | null;
  isAuthenticated: boolean;
  /** Session en cours de résolution (affiche un squelette à la place du menu/CTA). */
  isLoading: boolean;
  /** Sign the current user out and clear the session. */
  onSignOut: () => void;
  /** Open the authentication modal (sign in / sign up). */
  onOpenAuthModal: () => void;
  /** Open the "À propos" modal. */
  onOpenAbout: () => void;
  /** Modale « À propos », montée par le conteneur (import différé). */
  aboutModal: ReactNode;
}

/**
 * Charpente de l'application : bandeau (wordmark, à propos, bibliothèque,
 * tendances, réglages et compte), lien d'évitement, landmark `<main>` et notifications toast. Le
 * conteneur `Layout` lit les stores auth/modale et gère l'ouverture de la
 * modale « À propos » et le flux de réinitialisation de mot de passe.
 */
export function LayoutView({
  children,
  user,
  isAuthenticated,
  isLoading,
  onSignOut,
  onOpenAuthModal,
  onOpenAbout,
  aboutModal,
}: LayoutViewProps) {
  return (
    <div className="h-dvh min-h-[600px] grid grid-rows-[auto_1fr] overflow-hidden dawn-glow text-text">
      <a href="#main" className="skip-link">
        {m.skip_link()}
      </a>

      <header className="mx-auto flex w-full max-w-page items-center justify-between px-6 pt-6 pb-3 font-sans">
        <p className="font-display text-title tracking-tight">AubeSonore</p>

        <div className="flex items-center gap-1">
          <Button variant="icon" aria-label={m.header_about()} onClick={onOpenAbout}>
            <Info className="size-5" />
          </Button>
          <LibraryButton />
          <TrendsButton />

          {isLoading ? (
            <div className="size-11 animate-pulse rounded-full bg-surface-raised" />
          ) : isAuthenticated && user ? (
            <SettingsMenu user={user} onSignOut={onSignOut} />
          ) : (
            <>
              <SettingsMenu user={null} />
              <Button variant="ghost" aria-label={m.header_sign_in()} onClick={onOpenAuthModal}>
                <LogIn className="size-4" />
                <span className="hidden sm:inline">{m.header_sign_in()}</span>
              </Button>
            </>
          )}
        </div>
      </header>

      <main id="main" className="min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col">
        {children}
      </main>

      {aboutModal}

      <Toaster
        position="bottom-center"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'font-sans !bg-surface-raised !border-border !text-text !text-body',
            description: '!text-text-muted',
            success: 'border-l-2 border-border',
            error: 'border-l-2 border-accent',
          },
        }}
      />
    </div>
  );
}
