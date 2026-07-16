# Plein écran éditorial & uniformisation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le frontend AubeSonore en « objet radio » plein écran (100dvh, zéro scroll), uniformiser tous les composants sur des primitives communes, retirer Chromecast et les exports non-CSV.

**Architecture:** La page devient une grille `100dvh` (en-tête / player 1fr / rail ancré). Deux nouvelles primitives UI (`ui/Button.tsx`, `ui/ModalShell.tsx`) absorbent tous les styles ad hoc des modales et boutons. La bio artiste quitte le flux (cause du scroll) pour un panneau superposé. Spec : `docs/superpowers/specs/2026-07-16-fullscreen-editorial-refinement-design.md`.

**Tech Stack:** React 19, Vite, Tailwind 4 (tokens CSS dans `index.css`), Zustand 5, motion/react, Radix Dialog, Vitest + Testing Library.

## Global Constraints

- Chemins relatifs à `apps/frontend` sauf mention contraire. Branche de travail : `feat/fullscreen-editorial` (existe déjà).
- Aucun commentaire dans le code sauf contrainte non exprimable autrement (règle CLAUDE.md). Named exports (sauf fichiers déjà en default export : `Layout`, `HomePage`, `Player`, `App`).
- Aucune nouvelle dépendance. Interdits : axios, cheerio, react-query, react-router-dom, class-variance-authority, dayjs.
- Tout élément d'UI se construit avec les tokens existants (`--color-paper/ink/accent/...`, `text-caption/body/lead/title/display`, `radius-sm/md/lg`, eases `fluid/snappy`) — zéro couleur ou taille en dur.
- Avant chaque commit : `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint` passent. Tests : `pnpm --filter @aubesonore/frontend test -- --run`.
- Commits Conventional Commits en anglais, `git add <fichiers explicites>` (jamais `-A`), jamais `--no-verify`.
- `prefers-reduced-motion` déjà géré globalement (`MotionConfig reducedMotion="user"` + media query CSS) — ne rien ajouter par composant.

---

### Task 1: Retrait Chromecast, AirPlay seul

**Files:**

- Create: `src/stores/airplayStore.ts`
- Create: `src/stores/airplayStore.test.ts`
- Create: `src/components/Player/AirPlayButton.tsx`
- Delete: `src/lib/cast/chromecast.ts`, `src/lib/cast/loader.ts`, `src/stores/castStore.ts`, `src/stores/castStore.test.ts`, `src/components/Player/CastButton.tsx`, `src/types/google-cast.d.ts`
- Modify: `src/lib/cast/index.ts`, `src/types/cast.ts`, `src/components/Player/SecondaryControls.tsx`

**Interfaces:**

- Consumes: `src/lib/cast/airplay.ts` (inchangé) : `isAirPlaySupported(): boolean`, `showAirPlayPicker(audio: HTMLAudioElement): void`, `onAirPlayAvailabilityChanged(audio, cb: (available: boolean) => void): () => void`, `onAirPlayConnectionChanged(audio, cb: (isWireless: boolean) => void): () => void`. `getAudioElement()` depuis `src/lib/player.ts`.
- Produces: `useAirPlayStore` (Zustand) : `{ available: boolean; isActive: boolean; initialize: () => void; openPicker: () => void }`. Composant `AirPlayButton` sans props, rendu `null` si `!available`.

- [ ] **Step 1: Écrire le test du store (échec attendu)**

`src/stores/airplayStore.test.ts` :

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listeners: {
  availability?: (available: boolean) => void;
  connection?: (isWireless: boolean) => void;
} = {};

vi.mock('../lib/cast/airplay', () => ({
  isAirPlaySupported: () => true,
  showAirPlayPicker: vi.fn(),
  onAirPlayAvailabilityChanged: (_audio: unknown, cb: (a: boolean) => void) => {
    listeners.availability = cb;
    return () => {};
  },
  onAirPlayConnectionChanged: (_audio: unknown, cb: (w: boolean) => void) => {
    listeners.connection = cb;
    return () => {};
  },
}));

vi.mock('../lib/player', () => ({
  getAudioElement: () => document.createElement('audio'),
}));

import { useAirPlayStore } from './airplayStore';

describe('airplayStore', () => {
  beforeEach(() => {
    useAirPlayStore.setState({ available: false, isActive: false });
    useAirPlayStore.getState().initialize();
  });

  it('reflects availability events', () => {
    listeners.availability?.(true);
    expect(useAirPlayStore.getState().available).toBe(true);
    listeners.availability?.(false);
    expect(useAirPlayStore.getState().available).toBe(false);
  });

  it('reflects connection events', () => {
    listeners.connection?.(true);
    expect(useAirPlayStore.getState().isActive).toBe(true);
    listeners.connection?.(false);
    expect(useAirPlayStore.getState().isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — `pnpm --filter @aubesonore/frontend test -- --run src/stores/airplayStore.test.ts` → FAIL (module `./airplayStore` inexistant).

- [ ] **Step 3: Implémenter le store**

`src/stores/airplayStore.ts` :

```ts
import { create } from 'zustand';
import {
  isAirPlaySupported,
  showAirPlayPicker,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
} from '../lib/cast/airplay';
import { getAudioElement } from '../lib/player';

interface AirPlayStore {
  available: boolean;
  isActive: boolean;
  initialize: () => void;
  openPicker: () => void;
}

let initialized = false;

export const useAirPlayStore = create<AirPlayStore>((set) => ({
  available: false,
  isActive: false,
  initialize: () => {
    if (initialized || !isAirPlaySupported()) return;
    initialized = true;
    const audio = getAudioElement();
    onAirPlayAvailabilityChanged(audio, (available) => set({ available }));
    onAirPlayConnectionChanged(audio, (isWireless) => set({ isActive: isWireless }));
  },
  openPicker: () => {
    showAirPlayPicker(getAudioElement());
  },
}));
```

Note pour le test : le flag module-level `initialized` empêche la ré-initialisation entre tests du même fichier — c'est acceptable car les deux tests partagent les mêmes listeners capturés. Ne pas exporter de reset.

- [ ] **Step 4: Vérifier que le test passe.**

- [ ] **Step 5: Créer `AirPlayButton`**

`src/components/Player/AirPlayButton.tsx` :

```tsx
import { useEffect } from 'react';
import { Airplay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAirPlayStore } from '../../stores/airplayStore';

export function AirPlayButton() {
  const available = useAirPlayStore((s) => s.available);
  const isActive = useAirPlayStore((s) => s.isActive);
  const initialize = useAirPlayStore((s) => s.initialize);
  const openPicker = useAirPlayStore((s) => s.openPicker);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!available) return null;

  return (
    <button
      onClick={openPicker}
      className={cn(
        'p-2 rounded-md transition-colors cursor-pointer hover:bg-paper-raised',
        isActive ? 'text-accent' : 'text-ink-faint hover:text-ink'
      )}
      title={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
      aria-label={isActive ? 'Diffusion AirPlay active' : 'Diffuser via AirPlay'}
    >
      <Airplay className="w-5 h-5" />
    </button>
  );
}
```

(Le style bouton sera aligné sur `ui/Button` en Task 3 — garder ces classes pour l'instant.)

- [ ] **Step 6: Supprimer Chromecast et rebrancher**

1. `git rm src/lib/cast/chromecast.ts src/lib/cast/loader.ts src/stores/castStore.ts src/stores/castStore.test.ts src/components/Player/CastButton.tsx src/types/google-cast.d.ts`
2. `src/lib/cast/index.ts` devient :

```ts
export {
  isAirPlaySupported,
  enableAirPlay,
  isAirPlayActive,
  showAirPlayPicker,
  onAirPlayAvailabilityChanged,
  onAirPlayConnectionChanged,
} from './airplay';
```

3. Dans `src/types/cast.ts` : supprimer tout type devenu inutilisé (`CastType`, `CastMediaMetadata`, `CastConnectionState` — vérifier avec `grep -rn "types/cast" src` ; si plus aucun import, `git rm` le fichier).
4. `src/components/Player/SecondaryControls.tsx` : remplacer `import { CastButton } from './CastButton';` par `import { AirPlayButton } from './AirPlayButton';` et `<CastButton />` par `<AirPlayButton />`.
5. Vérifier qu'il ne reste aucune référence : `grep -rn "chromecast\|Chromecast\|castStore\|CastButton\|google-cast\|cast_sender" src index.html vite.config.ts` → aucun résultat (si `index.html` charge le SDK cast, retirer la balise).

- [ ] **Step 7: Valider** — typecheck, lint, tests complets frontend : PASS.

- [ ] **Step 8: Commit** — `git commit -m "feat(frontend): replace Chromecast+AirPlay stack with native AirPlay only"`

---

### Task 2: Export bibliothèque réduit au CSV

**Files:**

- Modify: `packages/core/src/export.ts` (racine repo), `src/lib/exportLibrary.ts`, `src/components/LikedTracksModal.tsx`
- Test: mettre à jour tout test existant qui référence `formatAsTuneMyMusic` / `formatAsSonglinkList` (`grep -rn "TuneMyMusic\|SonglinkList" packages/core apps/frontend/src`)

**Interfaces:**

- Produces: `packages/core/src/export.ts` n'exporte plus que `escapeCsv` et `formatAsCSV(tracks: ClientLikedTrack[]): string` (inchangés). `src/lib/exportLibrary.ts` n'exporte plus que `exportAsCSV(tracks: ClientLikedTrack[]): void`.

- [ ] **Step 1: Supprimer les formats** — dans `packages/core/src/export.ts`, supprimer `formatAsTuneMyMusic` et `formatAsSonglinkList`. Dans `src/lib/exportLibrary.ts`, supprimer `exportAsTuneMyMusic` et `exportAsSonglinkList` et l'import correspondant.
- [ ] **Step 2: Simplifier l'UI** — dans `src/components/LikedTracksModal.tsx`, localiser le menu/les boutons d'export (`grep -n "export" src/components/LikedTracksModal.tsx`). Remplacer le choix multi-format par un unique bouton « Exporter (CSV) » appelant `exportAsCSV(tracks)`. Si l'export passait par un `DropdownMenu`, le retirer au profit du bouton simple.
- [ ] **Step 3: Mettre à jour les tests** qui référencent les formats supprimés (suppression des cas, pas d'assouplissement des cas CSV).
- [ ] **Step 4: Valider** — typecheck + lint + tests frontend ET `pnpm --filter @aubesonore/core test -- --run` si le package a des tests : PASS. `grep -rn "TuneMyMusic\|SonglinkList" apps/frontend/src packages/core/src` → aucun résultat.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): reduce library export to CSV only"`

---

### Task 3: Primitive `ui/Button`

**Files:**

- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Button.test.tsx`

**Interfaces:**

- Produces:

```ts
type ButtonVariant = 'accent' | 'ink' | 'ghost';
// Button : bouton texte (avec icône optionnelle inline 16px fournie en children)
// IconButton : bouton icône seule 20px, rond ou md selon `shape`
```

Signatures exactes :

```tsx
export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant; // défaut 'ghost'
}
export function Button({ variant, className, ...props }: ButtonProps): ReactElement;

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant; // défaut 'ghost'
  shape?: 'round' | 'square'; // défaut 'square' (radius-md)
  label: string; // alimente aria-label ET title
}
export function IconButton({
  variant,
  shape,
  label,
  className,
  ...props
}: IconButtonProps): ReactElement;
```

- [ ] **Step 1: Test (échec attendu)**

`src/components/ui/Button.test.tsx` :

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { Button, IconButton } from './Button';

describe('Button', () => {
  it('renders accent variant with token classes', () => {
    render(<Button variant="accent">Écouter</Button>);
    const btn = screen.getByRole('button', { name: 'Écouter' });
    expect(btn.className).toContain('bg-accent');
    expect(btn.className).toContain('text-on-accent');
  });

  it('defaults to ghost variant', () => {
    render(<Button>Fermer</Button>);
    expect(screen.getByRole('button', { name: 'Fermer' }).className).toContain('text-ink-faint');
  });
});

describe('IconButton', () => {
  it('exposes label as aria-label and title', () => {
    render(
      <IconButton label="Ajouter aux favoris">
        <Heart />
      </IconButton>
    );
    const btn = screen.getByRole('button', { name: 'Ajouter aux favoris' });
    expect(btn.title).toBe('Ajouter aux favoris');
  });
});
```

- [ ] **Step 2: Vérifier l'échec** (module inexistant).
- [ ] **Step 3: Implémenter**

`src/components/ui/Button.tsx` :

```tsx
import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'accent' | 'ink' | 'ghost';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  accent: 'bg-accent text-on-accent hover:opacity-90',
  ink: 'border border-line text-ink-soft hover:text-ink hover:bg-paper-raised',
  ghost: 'text-ink-faint hover:text-ink hover:bg-paper-raised',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 cursor-pointer transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'ghost', className, ...props }: ButtonProps): ReactElement {
  return (
    <button
      className={cn(
        BASE_CLASSES,
        'rounded-md px-3 py-1.5 text-body',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    />
  );
}

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  shape?: 'round' | 'square';
  label: string;
}

export function IconButton({
  variant = 'ghost',
  shape = 'square',
  label,
  className,
  ...props
}: IconButtonProps): ReactElement {
  return (
    <button
      className={cn(
        BASE_CLASSES,
        'p-2 [&_svg]:w-5 [&_svg]:h-5',
        shape === 'round' ? 'rounded-full' : 'rounded-md',
        VARIANT_CLASSES[variant],
        className
      )}
      title={label}
      aria-label={label}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Test PASS.**
- [ ] **Step 5: Adopter dans les composants simples déjà touchés/petits** — remplacer les `<button>` ad hoc par `Button`/`IconButton` dans : `src/components/Player/AirPlayButton.tsx` (IconButton ghost, classe conditionnelle `text-accent` quand actif via `className`), `src/layout/Layout.tsx` (bouton À propos → IconButton ghost `label="À propos"` ; bouton Connexion → Button ink), `src/components/Player/LibraryButton.tsx`, `src/components/Player/SleepTimer.tsx`, `src/components/Player/VolumeControl.tsx`, `src/components/Player/ListenersBadge.tsx` (uniquement là où c'est un vrai bouton ; un badge non interactif reste un `span`). Le bouton play (`PlaybackControls`) reste hors système (exception monumentale). Les boutons superposés sur la pochette (`TrackArtwork`, `RailCard`) gardent leur fond `bg-paper/90` spécifique : utiliser `IconButton shape="round"` + `className="bg-paper/90 border border-line"`.
- [ ] **Step 6: Valider** — typecheck + lint + tests : PASS. Vérification visuelle rapide non requise ici (couverte par la vérif E2E finale).
- [ ] **Step 7: Commit** — `git commit -m "feat(frontend): add Button/IconButton primitives and adopt in controls"`

---

### Task 4: Primitive `ui/ModalShell`

**Files:**

- Create: `src/components/ui/ModalShell.tsx`
- Create: `src/components/ui/ModalShell.test.tsx`

**Interfaces:**

- Consumes: Radix `@radix-ui/react-dialog`, `motion/react`, preset `modal` depuis `src/components/Player/motion-presets.ts`, `IconButton` (Task 3).
- Produces:

```tsx
export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidthClassName?: string; // ex 'max-w-md' (défaut) ou 'max-w-lg'
  children: ReactNode;
}
export function ModalShell(props: ModalShellProps): ReactElement;
```

Comportement : overlay `bg-ink/20`, panneau `.panel` centré, en-tête = titre `font-display text-title` + description `text-caption text-ink-faint` + bouton fermer (IconButton round ghost, icône `X`), filet `border-b border-line` sous l'en-tête, contenu = `children` dans `pt-5`. Focus-trap, Échap et clic-overlay fournis par Radix. Le corps scrolle en interne si trop haut : `max-h-[85dvh] overflow-y-auto` sur le contenu.

- [ ] **Step 1: Test (échec attendu)**

`src/components/ui/ModalShell.test.tsx` :

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalShell } from './ModalShell';

describe('ModalShell', () => {
  it('renders title, description and children when open', () => {
    render(
      <ModalShell isOpen onClose={() => {}} title="Ma bibliothèque" description="12 morceaux">
        <p>Contenu</p>
      </ModalShell>
    );
    expect(screen.getByText('Ma bibliothèque')).toBeInTheDocument();
    expect(screen.getByText('12 morceaux')).toBeInTheDocument();
    expect(screen.getByText('Contenu')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <ModalShell isOpen={false} onClose={() => {}} title="Caché">
        <p>Contenu</p>
      </ModalShell>
    );
    expect(screen.queryByText('Caché')).not.toBeInTheDocument();
  });

  it('calls onClose from the close button', async () => {
    const onClose = vi.fn();
    render(
      <ModalShell isOpen onClose={onClose} title="Titre">
        <p>Contenu</p>
      </ModalShell>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Vérifier l'échec.**
- [ ] **Step 3: Implémenter**

`src/components/ui/ModalShell.tsx` :

```tsx
import type { ReactElement, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { modal } from '../Player/motion-presets';
import { IconButton } from './Button';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidthClassName?: string;
  children: ReactNode;
}

export function ModalShell({
  isOpen,
  onClose,
  title,
  description,
  maxWidthClassName = 'max-w-md',
  children,
}: ModalShellProps): ReactElement {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-ink/20 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={modal}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'panel fixed inset-x-4 top-1/2 z-50 mx-auto w-auto p-6',
                  maxWidthClassName
                )}
                initial={{ opacity: 0, y: '-46%', scale: 0.97 }}
                animate={{ opacity: 1, y: '-50%', scale: 1 }}
                exit={{ opacity: 0, y: '-46%', scale: 0.97 }}
                transition={modal}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
                  <div className="min-w-0">
                    <Dialog.Title className="font-display text-title text-ink">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="text-caption text-ink-faint">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close asChild>
                    <IconButton shape="round" label="Fermer">
                      <X />
                    </IconButton>
                  </Dialog.Close>
                </div>
                <div className="max-h-[70dvh] overflow-y-auto pt-5">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
```

- [ ] **Step 4: Tests PASS** (fichier + suite complète).
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): add ModalShell primitive"`

---

### Task 5: Migration des trois modales vers ModalShell + états vides éditoriaux

**Files:**

- Modify: `src/components/AboutModal.tsx`, `src/components/AuthModal.tsx`, `src/components/LikedTracksModal.tsx`
- Test: `src/components/AuthModal.test.tsx` (adapter si les sélecteurs changent)

**Interfaces:**

- Consumes: `ModalShell` (Task 4), `Button`/`IconButton` (Task 3). Les props publiques des trois modales ne changent pas (`isOpen`, `onClose`, etc. — vérifier chaque signature existante et la conserver).

- [ ] **Step 1: Migrer `AboutModal`** — réécriture complète (structure Radix → ModalShell) :

```tsx
import { Globe, Music, MessageSquare, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModalShell } from './ui/ModalShell';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SOCIAL_LINKS = [
  { icon: Globe, label: 'Instagram', href: '#' },
  { icon: Music, label: 'Spotify', href: '#' },
  { icon: MessageSquare, label: 'Discord', href: '#' },
] as const;

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="AubeSonore"
      description="Découverte musicale émergente"
    >
      <div className="space-y-5">
        <p className="text-body text-ink-soft leading-relaxed">
          AubeSonore fait se lever le jour sur la musique restée dans l'ombre : sons rares, artistes
          émergents, classiques oubliés. L'ambiance du site suit la lumière, de l'aube à la nuit.
        </p>
        <div>
          <p className="text-caption text-ink-faint uppercase tracking-widest mb-3">
            Nous retrouver
          </p>
          <div className="flex gap-3">
            {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md',
                  'border border-line text-ink-soft hover:text-ink hover:bg-paper-raised',
                  'transition-colors text-caption'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-caption text-ink-faint">
          <Mail className="w-4 h-4 shrink-0" />
          <a href="mailto:contact@aubesonore.fr" className="text-accent hover:underline">
            contact@aubesonore.fr
          </a>
        </div>
      </div>
    </ModalShell>
  );
}
```

(Le manifeste « Découverte musicale émergente » vit désormais ici — le footer disparaît en Task 7.)

- [ ] **Step 2: Migrer `AuthModal`** — lire le fichier entier d'abord. Transformation mécanique : remplacer `Dialog.Root/Portal/Overlay/Content` + le bloc d'en-tête maison par `<ModalShell isOpen onClose title description>` ; `title` = le titre du mode courant (Connexion / Inscription / Mot de passe oublié / Nouveau mot de passe — reprendre les libellés existants) ; conserver TOUTE la logique interne (modes, formulaires, erreurs, OAuth). Les boutons de soumission passent en `<Button variant="accent" type="submit">`, les boutons secondaires (liens de bascule de mode) restent des liens texte. Ne pas toucher aux stores ni à l'API.
- [ ] **Step 3: Adapter `AuthModal.test.tsx`** si des sélecteurs visaient la structure supprimée. Les tests doivent continuer à vérifier les mêmes comportements.
- [ ] **Step 4: Migrer `LikedTracksModal`** — même transformation mécanique vers ModalShell (`maxWidthClassName="max-w-lg"`, `title="Ma bibliothèque"`, `description` = compte de morceaux, ex. `${tracks.length} morceaux`). Boutons d'action (export CSV, refresh liens) → `Button variant="ink"` ; suppressions par ligne → `IconButton` ghost. **État vide éditorial** : quand `tracks.length === 0`, afficher :

```tsx
<div className="py-10 text-center space-y-1">
  <p className="font-display text-lead text-ink">Rien ici pour l'instant.</p>
  <p className="text-body text-ink-soft">Aimez un morceau au passage — il vous attendra ici.</p>
</div>
```

- [ ] **Step 5: Valider** — typecheck + lint + suite de tests complète : PASS. Lancer l'app (`pnpm --filter @aubesonore/frontend dev`) et ouvrir les trois modales pour vérifier l'uniformité (entrée/sortie, en-tête, fermeture Échap/overlay/bouton).
- [ ] **Step 6: Commit** — `git commit -m "refactor(frontend): unify modals on ModalShell with editorial empty states"`

---

### Task 6: Bio artiste en panneau superposé

**Files:**

- Modify: `src/components/Player/ArtistContext.tsx`, `src/components/Player/index.tsx`, `src/components/Player/TrackMeta.tsx`

**Interfaces:**

- Consumes: `ModalShell`, `useArtistInfo(artistName)` (retourne `{ data: { bio: string; tags: string[]; similarArtists: string[] } | null, isLoading }`), `useNowPlayingStore`.
- Produces: `ArtistContext` ne rend plus d'accordéon dans le flux. Il exporte désormais : `export function ArtistContext({ isOpen, onClose }: { isOpen: boolean; onClose: () => void })` — le contenu bio dans un ModalShell. `TrackMeta` accepte une prop optionnelle `onArtistInfo?: () => void` : quand définie ET que la bio existe, le nom d'artiste devient un bouton discret qui l'appelle.

- [ ] **Step 1: Réécrire `ArtistContext`**

```tsx
import { useNowPlayingStore } from '../../lib/azuracast';
import { useArtistInfo } from '../../hooks/useArtistInfo';
import { ModalShell } from '../ui/ModalShell';

interface ArtistContextProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArtistContext({ isOpen, onClose }: ArtistContextProps) {
  const artistName = useNowPlayingStore((s) => s.data?.now_playing?.song.artist);
  const { data } = useArtistInfo(artistName);

  if (!artistName || !data?.bio) return null;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={artistName} description="Contexte">
      <div className="space-y-4">
        <p className="text-body text-ink-soft leading-relaxed">{data.bio}</p>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-ink-faint border border-line"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        {data.similarArtists.length > 0 && (
          <div>
            <p className="text-caption text-ink-faint mb-1.5">Artistes similaires</p>
            <div className="flex flex-wrap gap-1.5">
              {data.similarArtists.map((name) => (
                <span
                  key={name}
                  className="px-2 py-0.5 rounded-full bg-paper-raised text-caption text-accent/70 border border-line"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
```

(La bio complète s'affiche directement — le tronquage « Voir plus » disparaît, le panneau scrolle en interne via ModalShell.)

- [ ] **Step 2: Affordance dans `TrackMeta`** — ajouter la prop `onArtistInfo` ; le paragraphe artiste devient :

```tsx
<p className="mt-2 text-lead text-ink-soft">
  {onArtistInfo && artist ? (
    <button
      onClick={onArtistInfo}
      className="cursor-pointer underline decoration-line underline-offset-4 hover:decoration-ink transition-colors"
    >
      {artist}
    </button>
  ) : (
    (artist ?? '—')
  )}
</p>
```

- [ ] **Step 3: Recâbler `Player/index.tsx`** — état local `const [artistPanelOpen, setArtistPanelOpen] = useState(false)`. Passer `onArtistInfo` à `TrackMeta` **seulement si la bio existe** : appeler `useArtistInfo(artistName)` dans `Player` et passer `onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined}`. Rendre `<ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />` à la place de l'ancien emplacement dans le flux.
- [ ] **Step 4: Valider** — typecheck + lint + tests : PASS. En dev : cliquer le nom d'artiste ouvre le panneau ; aucun contenu ne pousse plus le layout.
- [ ] **Step 5: Commit** — `git commit -m "refactor(frontend): move artist bio to overlay panel"`

---

### Task 7: Layout « objet radio » 100dvh

**Files:**

- Modify: `src/layout/Layout.tsx`, `src/pages/HomePage.tsx`, `src/components/Player/index.tsx`, `src/components/Player/TrackArtwork.tsx`, `src/components/Player/TrackMeta.tsx`, `src/components/Player/RecentRail.tsx` (conteneur seulement), `src/index.css`

**Interfaces:**

- Consumes: composition Player existante (Tasks 5-6 faites).
- Produces: page sans scroll à hauteur ≥ 600px ; wordmark signature aube via la variable CSS `--accent-dawn`.

- [ ] **Step 1: Tokens signature aube** — dans `src/index.css`, bloc `@theme`, ajouter :

```css
--color-accent-dawn: hsl(12 62% 42%);
```

(La valeur est l'accent du moment aube, figée : c'est la signature, elle ne suit pas le moment courant.)

- [ ] **Step 2: `Layout.tsx`** — remplacer la structure racine par une grille pleine hauteur, supprimer le footer, marquer la signature :

```tsx
<div className="h-dvh min-h-[600px] grid grid-rows-[auto_1fr] bg-paper text-ink overflow-hidden">
  {/* skip-link et Toaster inchangés */}
  <header className="mx-auto w-full max-w-[1200px] px-6 pt-6 pb-3 flex items-start justify-between">
    <div>
      <p className="font-display text-lead tracking-tight">
        <span
          aria-hidden="true"
          className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--color-accent-dawn)] mr-2 align-baseline"
        />
        AubeSonore
      </p>
      <MomentLine />
    </div>
    {/* bloc À propos + compte inchangé (boutons déjà migrés en Task 3) */}
  </header>
  <main id="main" className="min-h-0 overflow-hidden">
    {children}
  </main>
  {/* footer supprimé — le manifeste vit dans AboutModal (Task 5) */}
</div>
```

Sous `min-h-[600px]`, la racine devient plus haute que la fenêtre : c'est le garde-fou de la spec (scroll toléré uniquement là).

- [ ] **Step 3: `HomePage.tsx`** — la page occupe toute la zone :

```tsx
export default function HomePage() {
  return (
    <div className="mx-auto h-full w-full max-w-[1200px] px-6 pb-6 min-h-0">
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Player />
      </ErrorBoundary>
      <PlayerSideEffects />
    </div>
  );
}
```

- [ ] **Step 4: `Player/index.tsx`** — grille deux rangées (scène 1fr / rail auto), scène responsive :

```tsx
return (
  <div className="h-full min-h-0 grid grid-rows-[1fr_auto]">
    <div className="min-h-0 flex flex-col justify-center gap-5 lg:grid lg:grid-cols-[minmax(0,42%)_1fr] lg:items-center lg:gap-12">
      <TrackArtwork />
      <div className="min-w-0 flex flex-col gap-5">
        <TrackMeta onArtistInfo={data?.bio ? () => setArtistPanelOpen(true) : undefined} />
        <Timeline />
        <div className="flex items-center">
          <SecondaryControls />
          <PlaybackControls />
          <div className="flex-1 flex justify-end items-center gap-2">
            <LibraryButton />
            <ListenersBadge />
          </div>
        </div>
      </div>
    </div>
    <RecentRail />
    <ArtistContext isOpen={artistPanelOpen} onClose={() => setArtistPanelOpen(false)} />
  </div>
);
```

Adapter le skeleton (`!hasData`) à la même grille (mêmes rangées, blocs skeleton aux mêmes places). Supprimer les `mb-6`/`mt-4` internes devenus redondants avec les `gap`.

- [ ] **Step 5: `TrackArtwork`** — la pochette se dimensionne sur l'espace disponible au lieu de `max-w-[280px]` :

```
Conteneur racine : 'relative w-full max-w-[min(38dvh,320px)] lg:max-w-[min(52dvh,560px)] mx-auto lg:mx-0'
```

Le reste du composant est inchangé.

- [ ] **Step 6: `RecentRail`** — s'assurer que le bloc racine du rail a une hauteur intrinsèque stable (pas de `mt-*` qui déborde) : conteneur `pt-4` + hauteur des cartes fixe existante. Ne pas toucher à la mécanique de drag. État vide éditorial : si `entries.length === 0` (et pas en chargement/erreur), afficher à la place des cartes `<p className="text-caption text-ink-faint">Le premier morceau de la journée s'écrit en ce moment.</p>` dans le même conteneur (hauteur stable).
- [ ] **Step 7: `Timeline`** — retirer le `mb-6` (le `gap` du parent gère l'espacement).
- [ ] **Step 8: Vérification manuelle dev** — `pnpm --filter @aubesonore/frontend dev`, puis dans la console navigateur aux 3 largeurs (390/768/1440, hauteur ≥ 600) : `document.documentElement.scrollHeight <= window.innerHeight` → `true` aux 4 moments (`?moment=dawn|day|dusk|night`).
- [ ] **Step 9: Valider** — typecheck + lint + tests : PASS (adapter les tests cassés par les changements de structure, notamment `RecentRail.test.tsx` si les classes du conteneur y sont vérifiées).
- [ ] **Step 10: Commit** — `git commit -m "feat(frontend): fullscreen radio-object layout, dawn signature, footer removal"`

---

### Task 8: Vérification E2E complète (orchestrateur)

**Files:** aucun changement de code attendu (corrections éventuelles = retours vers les tasks concernées).

Dérouler le process de la spec §5, via Chrome DevTools sur `pnpm --filter @aubesonore/frontend dev` :

- [ ] **Step 1:** `pnpm typecheck && pnpm lint && pnpm test` à la racine : PASS.
- [ ] **Step 2:** 12 captures : `{390×844, 768×1024, 1440×900} × {?moment=dawn, day, dusk, night}` — inspection visuelle de chaque capture (hiérarchie, contrastes, cohérence des 4 palettes).
- [ ] **Step 3:** Zéro scroll programmatique sur les 12 combinaisons : `document.documentElement.scrollHeight <= window.innerHeight` → `true`.
- [ ] **Step 4:** Parcours fonctionnels sans erreur console : play/stop, volume/mute, like non connecté (→ modale auth), bibliothèque (recherche, export CSV, suppression), partage (fallback copie), sleep timer, panneau artiste, bannière PWA (si déclenchable).
- [ ] **Step 5:** Lighthouse (mode snapshot) : accessibilité ≥ 95.
- [ ] **Step 6:** `pnpm --filter @aubesonore/frontend build` puis `grep -ri "chromecast\|tunemymusic" dist/assets` → aucun résultat.
- [ ] **Step 7:** Commit final éventuel des ajustements + rapport de vérification.
