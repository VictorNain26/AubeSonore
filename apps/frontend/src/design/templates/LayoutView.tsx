import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogIn, Info } from 'lucide-react';
import { Button } from '../atoms/Button';
import { Menu } from '../molecules/Menu';
import { LibraryButton } from '../../components/Player/LibraryButton';
import { ThemeToggle } from '../../layout/ThemeToggle';

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
 * Charpente de l'application : bandeau (wordmark, thème, à propos, bibliothèque,
 * compte), lien d'évitement, landmark `<main>` et notifications toast. Le
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
        Aller au contenu principal
      </a>

      <header className="mx-auto flex w-full max-w-page items-center justify-between px-6 pt-6 pb-3 font-sans">
        <p className="font-display text-title tracking-tight">AubeSonore</p>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="icon" aria-label="À propos" onClick={onOpenAbout}>
            <Info className="size-5" />
          </Button>
          <LibraryButton />

          {isLoading ? (
            <div className="size-11 animate-pulse rounded-full bg-surface-raised" />
          ) : isAuthenticated && user ? (
            <Menu
              header={
                <div className="font-sans">
                  <p className="truncate text-body font-medium">{user.name || 'Utilisateur'}</p>
                  <p className="truncate text-caption text-text-muted">{user.email}</p>
                </div>
              }
              trigger={
                <Button variant="icon" aria-label="Menu utilisateur">
                  <span className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-caption font-medium">
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </Button>
              }
              items={[{ label: 'Déconnexion', onSelect: onSignOut }]}
            />
          ) : (
            <Button variant="ghost" aria-label="Connexion" onClick={onOpenAuthModal}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Button>
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
