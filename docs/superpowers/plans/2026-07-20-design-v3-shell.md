# Design v3 — PR 3 Shell/Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer le shell/header de l'app web vers les tokens et primitives v3 (thèmes clair/sombre + toggle persisté, lueur d'aube, primitives Base UI), en gardant les écrans non migrés fonctionnels.

**Architecture:** `index.css` importe `design/tokens.css` (source v3) puis une couche legacy où `paper`/`ink`/`line` deviennent des **alias des tokens v3** — les écrans non migrés suivent automatiquement le thème clair/sombre et la machinerie « moments » (horaire) meurt. `Layout.tsx` est réécrit sur les primitives `src/design/ui/` ; un `ThemeToggle` naît dans le header ; le thème est appliqué avant le premier paint par un script inline dans `index.html`.

**Tech Stack:** React 19, Tailwind 4 (`@theme inline`, `@utility`), Base UI (`@base-ui/react`), Vitest 3 (jsdom via pragma), lucide-react, sonner.

## Global Constraints

- Tokens autorisés dans les composants : `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`, `dawn-glow` ; typo `text-display|title|lead|body|caption` ; radii `rounded-sm|md|full`. Zéro hex/hsl/oklch hors `src/design/tokens.css` ; zéro valeur arbitraire couleur/espacement/typo (`bg-[#fff]`, `p-[13px]`).
- Dark mode : attribut `data-theme="dark"`, variante `dark:` — jamais `.dark`, jamais `prefers-color-scheme` dans les composants.
- Tout élément interactif : hover, focus-visible, active, disabled ; cible ≥ 44 px (`size-11` / `h-11`).
- Motion décorative sous `prefers-reduced-motion: no-preference` uniquement, 150–250 ms, `ease-out-quart`.
- Zéro commentaire sauf WHY non évident. Named exports. Pas d'`eslint-disable`.
- Avant « done » : `pnpm typecheck && pnpm lint` (zéro warning), `pnpm test`, `node scripts/check-contrast.mjs`.
- Commits : Conventional Commits anglais, scope `frontend`, staging fichier par fichier (`git add <file>`), jamais `git add .`.
- Doc-first : toute syntaxe Tailwind v4 non triviale (`@utility` imbriqué, fusion de blocs `@theme`) se vérifie contre https://tailwindcss.com/docs (v4) avant écriture.

---

### Task 1: Theme bootstrap — application avant paint + meta theme-color

**Files:**

- Modify: `apps/frontend/index.html` (script inline dans `<head>`)
- Modify: `apps/frontend/src/lib/theme.ts`
- Modify: `apps/frontend/src/lib/theme.test.ts`
- Modify: `apps/frontend/src/main.tsx`

**Interfaces:**

- Consumes: `THEME_STORAGE_KEY = 'aubesonore-theme'`, `applyTheme`, `initTheme` existants dans `lib/theme.ts`.
- Produces: le shell peut supposer que `data-theme` est posé avant le premier paint ; `applyTheme` synchronise `<meta name="theme-color">` sur `--surface`. Signatures inchangées : `setTheme(theme: Theme): void`, `initTheme(): Theme`.

- [ ] **Step 1: Écrire le test qui échoue** — dans `src/lib/theme.test.ts`, ajouter :

```ts
it('synchronise la meta theme-color sur --surface au changement de thème', () => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#000000');
  document.head.appendChild(meta);
  const spy = vi
    .spyOn(window, 'getComputedStyle')
    .mockReturnValue({
      getPropertyValue: () => ' oklch(0.19 0.025 265) ',
    } as unknown as CSSStyleDeclaration);

  applyTheme('dark');

  expect(meta.getAttribute('content')).toBe('oklch(0.19 0.025 265)');
  spy.mockRestore();
  meta.remove();
});

it('laisse la meta theme-color intacte quand --surface est vide (jsdom sans CSS)', () => {
  const meta = document.createElement('meta');
  meta.setAttribute('name', 'theme-color');
  meta.setAttribute('content', '#000000');
  document.head.appendChild(meta);

  applyTheme('light');

  expect(meta.getAttribute('content')).toBe('#000000');
  meta.remove();
});
```

Adapter les imports au style du fichier existant (il utilise déjà un pragma jsdom et `applyTheme`).

- [ ] **Step 2: Vérifier l'échec** — Run: `pnpm --filter @aubesonore/frontend test -- src/lib/theme.test.ts`. Expected: FAIL (la meta reste `#000000` dans le premier test).

- [ ] **Step 3: Implémenter** — dans `src/lib/theme.ts`, ajouter en fin de `applyTheme` :

```ts
export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
  if (surface) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface);
  }
}
```

- [ ] **Step 4: Vérifier que tous les tests theme passent** — Run: `pnpm --filter @aubesonore/frontend test -- src/lib/theme.test.ts`. Expected: PASS (anciens tests inclus — si un ancien test casse parce que `getComputedStyle` retourne du vide, c'est couvert par le guard `if (surface)` ; ne pas modifier les anciens tests).

- [ ] **Step 5: Script inline anti-flash** — dans `apps/frontend/index.html`, juste après `<meta name="color-scheme" content="dark light" />` :

```html
<script>
  try {
    var storedTheme = localStorage.getItem('aubesonore-theme');
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      storedTheme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (storedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch (_) {}
</script>
```

(Le duplicata volontaire de `resolveTheme` est la seule façon d'agir avant le chargement des modules ; `initTheme` reste la source de vérité côté app.)

- [ ] **Step 6: Brancher initTheme + police Inter** — dans `src/main.tsx`, ajouter aux imports :

```ts
import '@fontsource-variable/inter';
import { initTheme } from './lib/theme';
```

et appeler `initTheme();` juste avant `createRoot(root).render(...)`. Ne pas retirer les imports Spectral/Young Serif (écrans non migrés).

- [ ] **Step 7: Valider et committer**

Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint`. Expected: exit 0, zéro warning.

```bash
git add apps/frontend/index.html apps/frontend/src/lib/theme.ts apps/frontend/src/lib/theme.test.ts apps/frontend/src/main.tsx
git commit -m "feat(frontend): apply v3 theme before first paint and sync theme-color"
```

---

### Task 2: Coexistence CSS — index.css sur les tokens v3, legacy aliasé

**Files:**

- Modify: `apps/frontend/src/index.css` (réécriture complète)
- Modify: `apps/frontend/src/design/tokens.css` (ajout `@utility skip-link`)

**Interfaces:**

- Consumes: `design/tokens.css` (tokens v3, `@custom-variant dark`, `dawn-glow`).
- Produces: utilities legacy (`bg-paper`, `text-ink*`, `border-line`, `panel`, `skeleton`, `eyebrow`, `rule`, `press-ink`, `artwork-size`, `toast-success`, `toast-danger`, `rounded-lg`, `max-w-page`, `font-text`, `font-display`) toujours générées, désormais **thème-driven** (alias v3). Nouvelle utility `skip-link`. Les classes `text-body|caption|…` prennent partout les valeurs v3.

- [ ] **Step 1: Doc-first** — vérifier sur https://tailwindcss.com/docs/theme et https://tailwindcss.com/docs/adding-custom-styles : (a) plusieurs blocs `@theme` se fusionnent dans l'ordre source (un `--color-*: initial` ne réinitialise que ce qui précède) ; (b) `@utility` accepte les sélecteurs imbriqués `&:focus-visible`. Citer les URLs dans le message de commit.

- [ ] **Step 2: Ajouter `skip-link` à `src/design/tokens.css`** (après `@utility dawn-glow`) :

```css
@utility skip-link {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;

  &:focus-visible {
    position: fixed;
    top: 1rem;
    left: 1rem;
    width: auto;
    height: auto;
    margin: 0;
    padding: 0.5rem 1rem;
    overflow: visible;
    clip-path: none;
    background: var(--color-surface-raised);
    color: var(--color-text);
    border-radius: var(--radius-md);
    z-index: 50;
  }
}
```

- [ ] **Step 3: Réécrire `src/index.css`** avec exactement ce contenu :

```css
@import 'tailwindcss';
@import './design/tokens.css';

/* =============================================================================
   Couche legacy — les écrans non migrés (Player, modals, StationLog, bannière
   PWA) consomment encore paper/ink/line. Ces vars sont des ALIAS des tokens v3
   pour que tout suive le thème clair/sombre. Supprimée par la PR démolition.
   ============================================================================= */

:root {
  --paper: var(--surface);
  --paper-raised: var(--surface-raised);
  --ink: var(--text);
  --ink-soft: var(--text-muted);
  --ink-faint: var(--text-faint);
  --line: var(--border);
}

@theme inline {
  --color-paper: var(--paper);
  --color-paper-raised: var(--paper-raised);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-line: var(--line);
  --color-danger: hsl(0 62% 44%);
  --color-success: hsl(150 55% 32%);

  --radius-lg: 0.5rem;

  --container-page: 75rem;

  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  --font-text: 'Spectral', Georgia, serif;
  --font-display: 'Young Serif', Georgia, serif;
}

@layer base {
  body {
    background-color: var(--color-surface);
    color: var(--color-text);
    font-family: var(--font-text);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-body);
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
    -webkit-font-smoothing: antialiased;
  }

  ::selection {
    background: var(--color-accent);
    color: var(--color-on-accent);
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--text) 30%, transparent);
    border-radius: 9999px;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@layer utilities {
  .rule {
    border-top: 1px solid var(--color-line);
  }

  .panel {
    background: var(--color-paper);
    border: 1px solid var(--color-line);
    border-radius: var(--radius-lg);
    box-shadow: 0 12px 32px -12px color-mix(in srgb, var(--ink) 25%, transparent);
  }

  .skeleton {
    background: color-mix(in srgb, var(--ink) 7%, var(--paper));
    animation: pulse-soft 2s ease-in-out infinite;
    border-radius: var(--radius-md);
  }

  .toast-success {
    border-left: 2px solid var(--color-success);
  }

  .toast-danger {
    border-left: 2px solid var(--color-danger);
  }

  .eyebrow {
    font-size: var(--text-caption);
    line-height: var(--text-caption--line-height);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-ink-faint);
  }

  .artwork-size {
    width: 100%;
    max-width: min(26dvh, 260px);
  }
  @media (min-width: 64rem) {
    .artwork-size {
      max-width: min(52dvh, 560px);
    }
  }

  .press-ink:active {
    background: color-mix(in srgb, var(--ink) 10%, var(--paper));
  }
}

@keyframes pulse-soft {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}
input[type='range']::-webkit-slider-track {
  background: var(--color-line);
  height: 3px;
  border-radius: 9999px;
}
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 14px;
  width: 14px;
  border-radius: 9999px;
  background: var(--color-ink);
  border: none;
  margin-top: -5.5px;
  transition: transform 150ms ease;
}
input[type='range']::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}
input[type='range']::-moz-range-track {
  background: var(--color-line);
  height: 3px;
  border-radius: 9999px;
  border: 0;
}
input[type='range']::-moz-range-thumb {
  height: 14px;
  width: 14px;
  border-radius: 9999px;
  background: var(--color-ink);
  border: none;
}
```

Disparaissent volontairement : les 4 palettes `[data-moment]`, `--sky` + gradient body, `--accent`/`--on-accent` legacy (le v3 possède ces noms — collision), `--color-accent-dawn` (seul consommateur : `OnAirDot`, supprimé Task 5), `--animate-breathe` + `@keyframes breathe` (idem), la transition `data-moment-ready`, `.sr-only-focusable` (remplacé par `skip-link`, seul consommateur : `Layout`, migré Task 5), les tailles `--text-*` legacy (échelle v3 partout).

- [ ] **Step 4: Vérifier que rien d'autre ne consomme ce qui disparaît** — Run:

```bash
grep -rn "accent-dawn\|animate-breathe\|sr-only-focusable\|data-moment\|bg-sky\|--sky" apps/frontend/src --include="*.tsx" --include="*.ts"
```

Expected: uniquement `src/layout/Layout.tsx` (migré Task 5), `src/hooks/useMoment.ts` + son test et `src/App.tsx`/`src/pages/DevSystemPage.tsx` (supprimés Task 6). Toute autre occurrence = STOP, signaler au lieu de continuer.

- [ ] **Step 5: Build + tests + smoke visuel** — Run: `pnpm --filter @aubesonore/frontend build && pnpm --filter @aubesonore/frontend test`. Expected: exit 0. (Le header affichera temporairement des styles hybrides jusqu'à Task 5 — attendu.)

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/index.css apps/frontend/src/design/tokens.css
git commit -m "feat(frontend): alias legacy tokens onto v3 themes, drop moment palettes"
```

(citer les URLs Tailwind vérifiées au Step 1 dans le corps du commit)

---

### Task 3: Primitive Menu — slot header (identité utilisateur)

**Files:**

- Modify: `apps/frontend/src/design/ui/Menu.tsx`
- Modify: `apps/frontend/src/design/ui/Menu.test.tsx`
- Modify: `apps/frontend/src/design/ui/Menu.stories.tsx`

**Interfaces:**

- Consumes: API Menu existante `{ trigger: ReactElement; items: MenuAction[] }`.
- Produces: `MenuProps` gagne `header?: ReactNode` — bloc non interactif rendu au-dessus des items, séparé par un filet. Task 5 l'utilise : `<Menu header={<div>…nom/email…</div>} trigger={…} items={…} />`.

- [ ] **Step 1: Test qui échoue** — dans `Menu.test.tsx`, ajouter (adapter au pattern d'ouverture existant du fichier) :

```tsx
it('affiche le header non interactif au-dessus des items', async () => {
  render(
    <Menu
      trigger={<button>Ouvrir</button>}
      header={<p>victor@example.com</p>}
      items={[{ label: 'Déconnexion', onSelect: () => {} }]}
    />
  );
  await userEvent.click(screen.getByRole('button', { name: 'Ouvrir' }));
  expect(await screen.findByText('victor@example.com')).toBeInTheDocument();
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Menu.test.tsx`. Expected: FAIL (prop `header` inconnue / texte absent).

- [ ] **Step 3: Implémenter** — dans `Menu.tsx` :

```tsx
import type { ReactElement, ReactNode } from 'react';

export interface MenuProps {
  trigger: ReactElement;
  header?: ReactNode;
  items: MenuAction[];
}

export function Menu({ trigger, header, items }: MenuProps) {
```

et dans le `Popup`, avant le `items.map` :

```tsx
{
  header ? <div className="border-b border-border px-4 py-2">{header}</div> : null;
}
```

- [ ] **Step 4: Vérifier** — Run: `pnpm --filter @aubesonore/frontend test -- src/design/ui/Menu.test.tsx`. Expected: PASS.

- [ ] **Step 5: Story** — dans `Menu.stories.tsx`, ajouter une story `WithHeader` sur le modèle des stories existantes, avec `header={<div><p className="font-medium">Victor</p><p className="text-caption text-text-muted">victor@example.com</p></div>}` et un item `Déconnexion`.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/design/ui/Menu.tsx apps/frontend/src/design/ui/Menu.test.tsx apps/frontend/src/design/ui/Menu.stories.tsx
git commit -m "feat(frontend): menu primitive accepts non-interactive header slot"
```

---

### Task 4: ThemeToggle

**Files:**

- Create: `apps/frontend/src/layout/ThemeToggle.tsx`
- Create: `apps/frontend/src/layout/ThemeToggle.test.tsx`

**Interfaces:**

- Consumes: `Button` (`variant="icon"`) de `../design/ui/Button` ; `setTheme`, `type Theme` de `../lib/theme` ; icônes `Sun`, `Moon` de `lucide-react`.
- Produces: `export function ThemeToggle(): ReactElement` — sans props. Task 5 le place dans le header.

- [ ] **Step 1: Test qui échoue** — créer `ThemeToggle.test.tsx` (reprendre le pragma jsdom et le setup localStorage de `src/lib/theme.test.ts`) :

```tsx
// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY } from '../lib/theme';

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('bascule vers le sombre, pose data-theme et persiste', async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Passer au thème sombre' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('depuis le sombre, bascule vers le clair', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button', { name: 'Passer au thème clair' }));
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `pnpm --filter @aubesonore/frontend test -- src/layout/ThemeToggle.test.tsx`. Expected: FAIL (module inexistant).

- [ ] **Step 3: Implémenter** — `ThemeToggle.tsx` :

```tsx
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../design/ui/Button';
import { setTheme, type Theme } from '../lib/theme';

function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setLocalTheme] = useState<Theme>(currentTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="icon"
      aria-label={next === 'dark' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      onClick={() => {
        setTheme(next);
        setLocalTheme(next);
      }}
    >
      {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
```

- [ ] **Step 4: Vérifier** — Run: `pnpm --filter @aubesonore/frontend test -- src/layout/ThemeToggle.test.tsx`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/layout/ThemeToggle.tsx apps/frontend/src/layout/ThemeToggle.test.tsx
git commit -m "feat(frontend): persistent theme toggle in shell"
```

---

### Task 5: Layout v3 — header manchette, primitives, toasts

**Files:**

- Modify: `apps/frontend/src/layout/Layout.tsx` (réécriture)
- Modify: `apps/frontend/src/components/Player/LibraryButton.tsx` (trigger seulement)

**Interfaces:**

- Consumes: `Button` v3 (`variant: 'primary' | 'ghost' | 'icon'`, prop `ref` ok, spread des props natifs), `Menu` v3 avec `header` (Task 3), `ThemeToggle` (Task 4), utilities `dawn-glow` + `skip-link` (Task 2). Stores/`usePlayer`/`toastError` inchangés.
- Produces: shell entièrement v3. `MomentLine`, `OnAirDot` et l'import `DropdownMenu` disparaissent de `Layout` (le fichier `components/ui/DropdownMenu.tsx` reste — encore utilisé par `LikedTracksModal`, migré dans la PR modals).

- [ ] **Step 1: Réécrire `Layout.tsx`** :

```tsx
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { LogIn, Info } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../design/ui/Button';
import { Menu } from '../design/ui/Menu';
import { LibraryButton } from '../components/Player/LibraryButton';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../stores/authStore';
import { useAuthModalStore } from '../stores/authModalStore';
import { toastError } from '../lib/appToast';

const AboutModal = lazy(() =>
  import('../components/AboutModal').then((m) => ({ default: m.AboutModal }))
);

interface LayoutProps {
  children: ReactNode;
}

function readResetTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname !== '/reset-password') return null;
  return new URLSearchParams(window.location.search).get('token');
}

export default function Layout({ children }: LayoutProps) {
  const { user, isAuthenticated, isLoading, signOut } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      isAuthenticated: s.isAuthenticated,
      isLoading: s.isLoading,
      signOut: s.signOut,
    }))
  );
  const openAuthModal = useAuthModalStore((s) => s.open);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Better Auth's forget-password emails redirect to /reset-password?token=XXX
  // (or ?error=INVALID_TOKEN). Open the modal in reset mode on first paint
  // via the global store, then clean the URL so a refresh doesn't replay it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.pathname !== '/reset-password') return;

    const error = new URLSearchParams(window.location.search).get('error');
    if (error === 'INVALID_TOKEN') {
      toastError('Ce lien est invalide ou a expiré. Demandez un nouveau lien.');
    }

    const token = readResetTokenFromUrl();
    if (token) {
      openAuthModal({ resetToken: token });
    }

    window.history.replaceState({}, '', '/');
  }, [openAuthModal]);

  return (
    <div className="h-dvh min-h-[600px] grid grid-rows-[auto_1fr] overflow-hidden dawn-glow text-text">
      <a href="#main" className="skip-link">
        Aller au contenu principal
      </a>

      <header className="mx-auto flex w-full max-w-page items-center justify-between px-6 pt-6 pb-3 font-sans">
        <p className="text-title tracking-tight">AubeSonore</p>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="icon" aria-label="À propos" onClick={() => setIsAboutOpen(true)}>
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
              items={[{ label: 'Déconnexion', onSelect: () => void signOut() }]}
            />
          ) : (
            <Button variant="ghost" aria-label="Connexion" onClick={() => openAuthModal()}>
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Connexion</span>
            </Button>
          )}
        </div>
      </header>

      <main id="main" className="min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col">
        {children}
      </main>

      {isAboutOpen && (
        <Suspense fallback={null}>
          <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        </Suspense>
      )}

      <Toaster
        position="bottom-center"
        duration={3000}
        toastOptions={{
          classNames: {
            toast: 'font-sans !bg-surface-raised !border-border !text-text !text-body',
            description: '!text-text-muted',
            success: 'toast-success',
            error: 'toast-danger',
          },
        }}
      />
    </div>
  );
}
```

(`toast-success`/`toast-danger` restent legacy : le v3 n'a pas encore de tokens de statut — décision différée à la PR démolition. `max-w-page` reste le container legacy jusqu'à la démolition.)

- [ ] **Step 2: Migrer le trigger de `LibraryButton`** — remplacer l'import `IconButton` et son usage :

```tsx
import { Button } from '../../design/ui/Button';
```

```tsx
<Button
  variant="icon"
  aria-label="Ouvrir ma bibliothèque"
  onClick={handleOpen}
  className={cn(isAuthenticated && tracks.length > 0 && 'text-accent hover:text-accent')}
>
  <Library className="size-5" />
</Button>
```

Ne rien changer d'autre dans ce fichier (le modal reste legacy jusqu'à la PR modals).

- [ ] **Step 3: Vérifier tout le frontend** — Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test`. Expected: exit 0, zéro warning. Si un test existant référence `MomentLine`/`OnAirDot`, le supprimer avec justification dans le commit.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/layout/Layout.tsx apps/frontend/src/components/Player/LibraryButton.tsx
git commit -m "feat(frontend): v3 shell header on design primitives"
```

---

### Task 6: Débrancher la machinerie moments du shell

**Files:**

- Modify: `apps/frontend/src/App.tsx`
- Delete: `apps/frontend/src/pages/DevSystemPage.tsx`
- Delete: `apps/frontend/src/hooks/useMoment.ts`
- Delete: `apps/frontend/src/hooks/useMoment.test.ts`

**Interfaces:**

- Consumes: rien de nouveau.
- Produces: plus aucun `data-moment` posé sur `<html>` ; `lib/moments.ts` devient orphelin (suppression réservée à la PR démolition, conformément à la spec §4.4).

- [ ] **Step 1: Vérifier les consommateurs** — Run: `grep -rn "useMoment\|DevSystemPage" apps/frontend/src --include="*.tsx" --include="*.ts"`. Expected: uniquement `App.tsx`, `pages/DevSystemPage.tsx`, `hooks/useMoment.ts`, `hooks/useMoment.test.ts`. Autre résultat = STOP.

- [ ] **Step 2: Nettoyer `App.tsx`** :

```tsx
import { MotionConfig } from 'motion/react';
import { AuthInit } from './components/AuthInit';
import { AuthModalHost } from './components/AuthModalHost';
import { NowPlayingPoller } from './components/NowPlayingPoller';
import Layout from './layout/Layout';
import HomePage from './pages/HomePage';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AuthInit />
      <NowPlayingPoller />
      <Layout>
        <HomePage />
      </Layout>
      <AuthModalHost />
      <PWAInstallBanner />
    </MotionConfig>
  );
}
```

- [ ] **Step 3: Supprimer les fichiers**

```bash
git rm apps/frontend/src/pages/DevSystemPage.tsx apps/frontend/src/hooks/useMoment.ts apps/frontend/src/hooks/useMoment.test.ts
```

- [ ] **Step 4: Vérifier** — Run: `pnpm --filter @aubesonore/frontend typecheck && pnpm --filter @aubesonore/frontend lint && pnpm --filter @aubesonore/frontend test && pnpm --filter @aubesonore/frontend build`. Expected: exit 0, zéro warning.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/App.tsx
git commit -m "refactor(frontend): drop moment clock from shell, storybook replaces dev system page"
```

---

### Task 7: Validation finale — gates, screenshots, PR

**Files:** aucun nouveau (corrections éventuelles seulement).

- [ ] **Step 1: Gates complets** — Run à la racine du repo :

```bash
pnpm typecheck && pnpm lint && pnpm test && node apps/frontend/scripts/check-contrast.mjs
```

Expected: exit 0 partout, zéro warning lint.

- [ ] **Step 2: Screenshots** — lancer le dev server (`pnpm --filter @aubesonore/frontend dev`, port 5199) et capturer 4 vues headless : clair × sombre (via `localStorage.setItem('aubesonore-theme', …)` ou l'attribut `data-theme`) × desktop (1280×800) et mobile (390×844). Réutiliser le script de captures existant du repo s'il y en a un (`ls apps/frontend/scripts/`), sinon Playwright/Puppeteer déjà présent dans les devDeps — ne rien installer de nouveau sans le signaler. Les screenshots sont **présentés avant merge** (spec §5).

- [ ] **Step 3: Vérifier dans les captures** — header v3 (wordmark seul, toggle, icônes 44px), lueur d'aube visible en tête dans les 2 thèmes, écrans non migrés (Player) lisibles dans les 2 thèmes (alias legacy fonctionnels), pas de flash blanc au chargement en sombre.

- [ ] **Step 4: Push + PR** vers `master` (base `master`, titre `feat(frontend): design system v3 shell`), corps citant la spec et les URLs de doc consultées. Auto-merge une fois les 4 checks verts.
