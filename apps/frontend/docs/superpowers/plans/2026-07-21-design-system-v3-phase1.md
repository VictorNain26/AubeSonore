# Design System v3 — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer l'appairage typographique (Instrument Sans display / Inter texte), réparer le rail « Vient de passer » via Embla, et amorcer la taxonomie atomique du design system, le tout documenté dans Storybook.

**Architecture:** On établit `src/design/{atoms,molecules,organisms,foundations}` et on y migre la couche design system existante. Le rail est décomposé en atomes présentationnels (`Thumbnail`, `IconButton`, `Rail`) → molecule (`TrackRailItem`) → organism (`RecentTracksRail`), consommés par un container mince `RecentTracks` qui garde le câblage des stores. Le drag/scroll vient d'`embla-carousel-react` (headless, maintenu) ; l'accessibilité clavier repose sur les rôles de liste + le `focus` natif d'Embla.

**Tech Stack:** React 19.2, Tailwind v4.3 (tokens `@theme inline`), Zustand 5, `embla-carousel-react` v8.6, Vitest 4 + Testing Library, Storybook 10 (react-vite).

## Global Constraints

- **Tailwind v4 uniquement** : pas de `tailwind.config.js`, pas de `@tailwind`, pas de `theme.extend`. Nouvelles utilities/variants dans `src/design/tokens.css` seulement.
- **Vocabulaire couleur autorisé, exclusivement** : `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`, utility `dawn-glow`. Aucune valeur hex/hsl/oklch hors `tokens.css`.
- **Pas de valeurs arbitraires** pour couleur, espacement, typo (`bg-[#fff]`, `p-[13px]`, `text-[17px]`).
- **Typo** : `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption` — rien d'autre. **Rayons** : `rounded-sm`, `rounded-md`, `rounded-full`.
- **Dark mode** = attribut `data-theme="dark"` (variant `dark:`), jamais `.dark` ni `prefers-color-scheme` en CSS composant.
- `node scripts/check-contrast.mjs` doit passer (aucun token couleur modifié en Phase 1).
- **Tout élément interactif** : états hover, focus-visible, active, disabled ; cible tactile ≥ 44px.
- **Motion décoratif** seulement sous `prefers-reduced-motion: no-preference` ; 150–250ms ; `ease-out-quart`.
- **Storybook** : story colocalisée par atom/molecule/organism, tous états, vérifiée dans les 2 thèmes via le toggle `Thème` de la toolbar, addon-a11y clean.
- **Exports nommés**, zéro commentaire par défaut, TypeScript strict.
- **Tests** : Vitest. L'environnement par défaut est `node` → tout test de composant commence par `// @vitest-environment jsdom`. `cn` s'importe depuis `@/lib/utils`.
- **Commits** : Conventional Commits en anglais, scope `frontend`. Ne jamais réintroduire les deps supprimées à l'audit.
- Avant de déclarer une tâche finie : `pnpm typecheck && pnpm lint` (zéro warning) puis `pnpm test`.

---

### Task 1: Appairage typographique Instrument Sans / Inter

**Files:**

- Modify: `src/design/tokens.css` (bloc `:root` + `@theme inline`)
- Modify: `src/main.tsx:4` (ajout import fontsource)
- Modify: `src/design/ui/Modal.tsx:20`, `src/components/ErrorFallback.tsx:9`, `src/components/Player/TrackMeta.tsx:35`, `src/layout/Layout.tsx:66` (ajout classe `font-display`)
- Modify: `src/design/Typographie.stories.tsx` (montrer l'appairage)
- Modify: `.storybook/preview.tsx` (retirer le toggle candidat `fonte`, désormais résolu)
- Modify: `apps/frontend/CLAUDE.md` (ajouter `font-display` au vocabulaire)

**Interfaces:**

- Produces : utility Tailwind `font-display` (via token `--font-display`), appliquée sur `text-display`/`text-title`.

- [ ] **Step 1: Ajouter le token display dans `tokens.css`**

Dans le bloc `:root`, sous `--p-font-stack` (ligne 11) :

```css
--p-font-display: 'Instrument Sans Variable', 'Inter Variable', system-ui, sans-serif;
```

Dans `@theme inline`, sous `--font-sans: var(--p-font-stack);` (ligne 52) :

```css
--font-display: var(--p-font-display);
```

- [ ] **Step 2: Charger Instrument Sans dans l'app**

`src/main.tsx`, sous `import '@fontsource-variable/inter';` (ligne 4) :

```ts
import '@fontsource-variable/instrument-sans';
```

- [ ] **Step 3: Appliquer `font-display` aux titres**

Ajouter la classe `font-display` (en tête de la liste de classes) à ces 4 usages :

- `src/design/ui/Modal.tsx:20` → `<Dialog.Title className="font-display text-title">`
- `src/components/ErrorFallback.tsx:9` → `className="font-display text-title text-text"`
- `src/components/Player/TrackMeta.tsx:35` → `className="font-display text-title lg:text-display font-medium text-text [text-wrap:balance]"`
- `src/layout/Layout.tsx:66` → `className="font-display text-title tracking-tight"`

- [ ] **Step 4: Mettre à jour la story Typographie**

Remplacer le contenu de `src/design/Typographie.stories.tsx` par :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Typographie' };
export default meta;

export const Echelle: StoryObj = {
  render: () => (
    <div className="flex max-w-[66ch] flex-col gap-6">
      <p className="font-display text-display">Aube Sonore, la radio qui se lève tôt</p>
      <p className="font-display text-title">Titre de section — artiste et morceau</p>
      <p className="text-lead">
        Lead : une phrase d’accroche qui respire, pour les descriptions d’émissions.
      </p>
      <p className="text-body">
        Body : le texte courant en Inter. La longueur de ligne reste sous soixante-six caractères
        pour un confort de lecture optimal, et l’interlignage est sans unité.
      </p>
      <p className="text-caption text-text-muted">CAPTION — HORAIRES 06:12 · MÉTADONNÉES</p>
      <p className="text-body tabular-nums">Tabulaires : 06:12 — 11:00 — 23:58</p>
    </div>
  ),
};
```

- [ ] **Step 5: Retirer le toggle candidat `fonte` de Storybook (décision verrouillée)**

Remplacer `.storybook/preview.tsx` par :

```tsx
import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/instrument-sans';
import '../src/design/storybook.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Thème',
      toolbar: {
        title: 'Thème',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }, [theme]);
      return (
        <div className="min-h-screen bg-surface p-8 font-sans text-text">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
```

- [ ] **Step 6: Ajouter `font-display` au vocabulaire dans `apps/frontend/CLAUDE.md`**

Dans la section « Token vocabulary », après la ligne des couleurs, ajouter :

```markdown
- Typography families: default body = Inter (`font-sans`, implicite via `<body>`); headings & section kickers = `font-display` (Instrument Sans), appliqué sur `text-display`, `text-title`, et le libellé de section (kicker uppercase, ex. « Vient de passer »).
```

- [ ] **Step 7: Vérifier**

Run: `pnpm typecheck && pnpm lint && node scripts/check-contrast.mjs && pnpm build`
Expected: tout passe, aucun warning lint. (La police se vérifie visuellement en Storybook `Fondations/Typographie`, 2 thèmes.)

- [ ] **Step 8: Commit**

```bash
git add src/design/tokens.css src/main.tsx src/design/ui/Modal.tsx src/components/ErrorFallback.tsx src/components/Player/TrackMeta.tsx src/layout/Layout.tsx src/design/Typographie.stories.tsx .storybook/preview.tsx apps/frontend/CLAUDE.md
git commit -m "feat(frontend): pair Instrument Sans display with Inter body"
```

---

### Task 2: Taxonomie atomique — migrer la couche design system

**Files:**

- Create dirs: `src/design/atoms/`, `src/design/molecules/`, `src/design/organisms/`, `src/design/foundations/`
- Move: `Button*`, `TextField*`, `Slider*` → `atoms/` ; `Menu*` → `molecules/` ; `Modal*` → `organisms/` ; `Couleurs.stories.tsx`, `Espacement.stories.tsx`, `Onde.stories.tsx`, `Typographie.stories.tsx` → `foundations/`
- Delete: `src/design/ui/cn.ts`, puis le dossier `src/design/ui/` vidé
- Modify: imports `./cn` dans Button/TextField/Menu ; les 12 fichiers importeurs ; les 5 `title:` de stories ; `apps/frontend/CLAUDE.md`

**Interfaces:**

- Consumes : rien.
- Produces : chemins `@/design/atoms/{Button,TextField,Slider}`, `@/design/molecules/Menu`, `@/design/organisms/Modal` (importés en relatif par les consommateurs existants).

- [ ] **Step 1: Créer les dossiers**

```bash
mkdir -p src/design/atoms src/design/molecules src/design/organisms src/design/foundations
```

- [ ] **Step 2: Déplacer les fichiers (git mv, garde l'historique)**

```bash
git mv src/design/ui/Button.tsx src/design/ui/Button.stories.tsx src/design/ui/Button.test.tsx src/design/atoms/
git mv src/design/ui/TextField.tsx src/design/ui/TextField.stories.tsx src/design/ui/TextField.test.tsx src/design/atoms/
git mv src/design/ui/Slider.tsx src/design/ui/Slider.stories.tsx src/design/ui/Slider.test.tsx src/design/atoms/
git mv src/design/ui/Menu.tsx src/design/ui/Menu.stories.tsx src/design/ui/Menu.test.tsx src/design/molecules/
git mv src/design/ui/Modal.tsx src/design/ui/Modal.stories.tsx src/design/ui/Modal.test.tsx src/design/organisms/
git mv src/design/Couleurs.stories.tsx src/design/Espacement.stories.tsx src/design/Onde.stories.tsx src/design/Typographie.stories.tsx src/design/foundations/
```

- [ ] **Step 3: Consolider `cn` sur `@/lib/utils`**

```bash
git rm src/design/ui/cn.ts
```

Dans `src/design/atoms/Button.tsx`, `src/design/atoms/TextField.tsx`, `src/design/molecules/Menu.tsx`, remplacer :

```ts
import { cn } from './cn';
```

par :

```ts
import { cn } from '@/lib/utils';
```

- [ ] **Step 4: Repointer les 12 fichiers importeurs**

```bash
grep -rl "design/ui/" src --include=*.tsx --include=*.ts | while read -r f; do
  sed -i \
    -e "s#design/ui/Button#design/atoms/Button#g" \
    -e "s#design/ui/TextField#design/atoms/TextField#g" \
    -e "s#design/ui/Slider#design/atoms/Slider#g" \
    -e "s#design/ui/Menu#design/molecules/Menu#g" \
    -e "s#design/ui/Modal#design/organisms/Modal#g" \
    "$f"
done
```

- [ ] **Step 5: Renommer les sections de stories**

- `src/design/atoms/Button.stories.tsx` : `title: 'Primitives/Button'` → `title: 'Atoms/Button'`
- `src/design/atoms/TextField.stories.tsx` : `'Primitives/TextField'` → `'Atoms/TextField'`
- `src/design/atoms/Slider.stories.tsx` : `'Primitives/Slider'` → `'Atoms/Slider'`
- `src/design/molecules/Menu.stories.tsx` : `'Primitives/Menu'` → `'Molecules/Menu'`
- `src/design/organisms/Modal.stories.tsx` : `'Primitives/Modal'` → `'Organisms/Modal'`

- [ ] **Step 6: Supprimer le dossier vidé et mettre à jour CLAUDE.md**

```bash
rmdir src/design/ui
```

Dans `apps/frontend/CLAUDE.md`, remplacer la référence « every `ui/` primitive » par « every `atoms/`, `molecules/`, `organisms/` component », et mentionner la structure `src/design/{atoms,molecules,organisms,foundations}`.

- [ ] **Step 7: Vérifier (typecheck + lint + tests + storybook)**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS. Tous les tests déplacés (Button/TextField/Slider/Menu/Modal) passent depuis leur nouveau chemin ; aucun import cassé.

Run: `pnpm build-storybook`
Expected: build OK (sections Atoms/Molecules/Organisms/Fondations présentes).

- [ ] **Step 8: Commit**

```bash
git add -A src/design src/components src/layout apps/frontend/CLAUDE.md
git commit -m "refactor(frontend): migrate design system to atomic folders"
```

---

### Task 3: Atom `Thumbnail`

**Files:**

- Create: `src/design/atoms/Thumbnail.tsx`
- Test: `src/design/atoms/Thumbnail.test.tsx`
- Story: `src/design/atoms/Thumbnail.stories.tsx`

**Interfaces:**

- Produces : `Thumbnail({ src?: string; alt?: string; size?: 'sm' | 'md'; className?: string })`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/design/atoms/Thumbnail.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { Thumbnail } from './Thumbnail';

describe('Thumbnail', () => {
  it('renders the artwork image when a src is given', () => {
    const { container } = render(<Thumbnail src="https://example.test/a.jpg" alt="Pochette" />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://example.test/a.jpg');
  });

  it('renders the fallback icon when no src is given', () => {
    const { container } = render(<Thumbnail />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the icon after an image load error', () => {
    const { container } = render(<Thumbnail src="https://example.test/broken.jpg" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `pnpm test -- src/design/atoms/Thumbnail.test.tsx`
Expected: FAIL (module `./Thumbnail` introuvable).

- [ ] **Step 3: Implémenter `Thumbnail`**

`src/design/atoms/Thumbnail.tsx` :

```tsx
import { useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'size-10',
  md: 'size-12',
};

export interface ThumbnailProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Thumbnail({ src, alt = '', size = 'sm', className }: ThumbnailProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = Boolean(src) && !imgError;

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-sm bg-surface-raised',
        SIZE[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <Music className="absolute inset-0 m-auto size-4 text-text-faint" />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `pnpm test -- src/design/atoms/Thumbnail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Écrire la story**

`src/design/atoms/Thumbnail.stories.tsx` :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Thumbnail } from './Thumbnail';

const meta: Meta<typeof Thumbnail> = { title: 'Atoms/Thumbnail', component: Thumbnail };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex items-end gap-6">
      <Thumbnail size="md" src="https://picsum.photos/seed/aube/96" alt="Pochette exemple" />
      <Thumbnail size="md" alt="" />
      <Thumbnail size="sm" alt="" />
      <p className="text-caption text-text-muted">Image · fallback (md) · fallback (sm)</p>
    </div>
  ),
};
```

- [ ] **Step 6: Vérifier et committer**

Run: `pnpm typecheck && pnpm lint && pnpm test -- src/design/atoms/Thumbnail.test.tsx`
Expected: PASS.

```bash
git add src/design/atoms/Thumbnail.tsx src/design/atoms/Thumbnail.test.tsx src/design/atoms/Thumbnail.stories.tsx
git commit -m "feat(frontend): add Thumbnail atom with artwork fallback"
```

---

### Task 4: Atom `IconButton`

**Files:**

- Create: `src/design/atoms/IconButton.tsx`
- Test: `src/design/atoms/IconButton.test.tsx`
- Story: `src/design/atoms/IconButton.stories.tsx`

**Interfaces:**

- Consumes : rien.
- Produces : `IconButton` — props = `ButtonHTMLAttributes<HTMLButtonElement>` + `{ label: string; active?: boolean; reveal?: boolean; children: ReactNode; ref?: Ref<HTMLButtonElement> }`. `label` devient `aria-label`.

- [ ] **Step 1: Écrire le test qui échoue**

`src/design/atoms/IconButton.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('exposes its label as the accessible name and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Partager" onClick={onClick}>
        <Heart />
      </IconButton>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Aimer" disabled onClick={onClick}>
        <Heart />
      </IconButton>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Aimer' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `pnpm test -- src/design/atoms/IconButton.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `IconButton`**

`src/design/atoms/IconButton.tsx` :

```tsx
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/lib/utils';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  reveal?: boolean;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

const BASE =
  'size-11 shrink-0 flex items-center justify-center rounded-md transition-opacity duration-150 ease-out-quart hover:bg-surface-raised focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80 disabled:pointer-events-none disabled:opacity-50';

const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100';

export function IconButton({
  label,
  active = false,
  reveal = false,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        BASE,
        active ? 'text-accent' : 'text-text-faint hover:text-text',
        reveal && !active ? REVEAL : null,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `pnpm test -- src/design/atoms/IconButton.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Écrire la story**

`src/design/atoms/IconButton.stories.tsx` :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Share2 } from 'lucide-react';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = { title: 'Atoms/IconButton', component: IconButton };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-2">
        <IconButton label="Partager">
          <Share2 className="size-5" />
        </IconButton>
        <IconButton label="Retirer de mes morceaux" active>
          <Heart className="size-5" fill="currentColor" />
        </IconButton>
        <IconButton label="Aimer" disabled>
          <Heart className="size-5" />
        </IconButton>
      </div>
      <div className="group flex items-center gap-2 rounded-md border border-border p-3">
        <span className="text-caption text-text-muted">Survolez ce bloc — actions `reveal` :</span>
        <IconButton label="Aimer" reveal>
          <Heart className="size-5" />
        </IconButton>
        <IconButton label="Partager" reveal>
          <Share2 className="size-5" />
        </IconButton>
      </div>
    </div>
  ),
};
```

- [ ] **Step 6: Vérifier et committer**

Run: `pnpm typecheck && pnpm lint && pnpm test -- src/design/atoms/IconButton.test.tsx`
Expected: PASS.

```bash
git add src/design/atoms/IconButton.tsx src/design/atoms/IconButton.test.tsx src/design/atoms/IconButton.stories.tsx
git commit -m "feat(frontend): add IconButton atom for reveal-on-hover actions"
```

---

### Task 5: Atom `Rail` (Embla) + polyfill jsdom

**Files:**

- Modify: `package.json` (dép `embla-carousel-react`)
- Modify: `src/mocks/setup.ts` (stub `ResizeObserver` pour jsdom)
- Create: `src/design/atoms/Rail.tsx`
- Test: `src/design/atoms/Rail.test.tsx`
- Story: `src/design/atoms/Rail.stories.tsx`

**Interfaces:**

- Consumes : rien.
- Produces : `Rail({ ariaLabel: string; children: ReactNode })` — rend un viewport Embla + un conteneur `role="list"` (aria-label) en `flex`, chaque enfant devient une slide. Curseur `grab`/`grabbing`.

- [ ] **Step 1: Installer Embla**

```bash
pnpm --filter @aubesonore/frontend add embla-carousel-react
```

Expected: `embla-carousel-react` (^8.6) ajouté aux `dependencies`, lockfile racine mis à jour.

- [ ] **Step 2: Ajouter le stub `ResizeObserver` au setup jsdom**

Embla utilise `ResizeObserver`, absent de jsdom. Dans `src/mocks/setup.ts`, après la ligne 1 (`import '@testing-library/jest-dom/vitest';`) :

```ts
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
```

- [ ] **Step 3: Écrire le test qui échoue**

`src/design/atoms/Rail.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rail } from './Rail';

describe('Rail', () => {
  it('renders children inside a labelled list', () => {
    render(
      <Rail ariaLabel="Vient de passer">
        <div role="listitem">Un</div>
        <div role="listitem">Deux</div>
      </Rail>
    );
    expect(screen.getByRole('list', { name: 'Vient de passer' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
```

- [ ] **Step 4: Lancer le test → échec**

Run: `pnpm test -- src/design/atoms/Rail.test.tsx`
Expected: FAIL (module `./Rail` introuvable).

- [ ] **Step 5: Implémenter `Rail`**

`src/design/atoms/Rail.tsx` :

```tsx
import type { ReactNode } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

export interface RailProps {
  ariaLabel: string;
  children: ReactNode;
}

export function Rail({ ariaLabel, children }: RailProps) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    align: 'start',
    containScroll: 'trimSnaps',
  });

  return (
    <div ref={emblaRef} className="overflow-hidden">
      <div
        role="list"
        aria-label={ariaLabel}
        className="flex cursor-grab gap-4 active:cursor-grabbing"
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Lancer le test → succès**

Run: `pnpm test -- src/design/atoms/Rail.test.tsx`
Expected: PASS (1 test). Si `ResizeObserver is not defined` apparaît, le Step 2 n'a pas pris.

- [ ] **Step 7: Écrire la story**

`src/design/atoms/Rail.stories.tsx` :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Rail } from './Rail';

const meta: Meta<typeof Rail> = { title: 'Atoms/Rail', component: Rail };
export default meta;

const Card = ({ n }: { n: number }) => (
  <div
    role="listitem"
    className="flex h-20 w-64 shrink-0 items-center justify-center rounded-md bg-surface-raised text-body text-text-muted"
  >
    Carte {n}
  </div>
);

export const PeuDItems: StoryObj = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {[1, 2].map((n) => (
        <Card key={n} n={n} />
      ))}
    </Rail>
  ),
};

export const Draggable: StoryObj = {
  render: () => (
    <Rail ariaLabel="Démonstration">
      {Array.from({ length: 12 }, (_, i) => (
        <Card key={i} n={i + 1} />
      ))}
    </Rail>
  ),
};
```

- [ ] **Step 8: Vérifier et committer**

Run: `pnpm typecheck && pnpm lint && pnpm test -- src/design/atoms/Rail.test.tsx`
Expected: PASS.

```bash
git add package.json ../../pnpm-lock.yaml src/mocks/setup.ts src/design/atoms/Rail.tsx src/design/atoms/Rail.test.tsx src/design/atoms/Rail.stories.tsx
git commit -m "feat(frontend): add draggable Rail atom on embla-carousel"
```

---

### Task 6: Molecule `TrackRailItem`

**Files:**

- Create: `src/design/molecules/TrackRailItem.tsx`
- Test: `src/design/molecules/TrackRailItem.test.tsx`
- Story: `src/design/molecules/TrackRailItem.stories.tsx`

**Interfaces:**

- Consumes : `Thumbnail` (`../atoms/Thumbnail`), `IconButton` (`../atoms/IconButton`).
- Produces : `TrackRailItem({ title: string; artist: string; art?: string; time: string; isLiked: boolean; isLiking: boolean; onToggle: () => void; onShare: () => void })` — rend un `<div role="listitem">` largeur fixe.

- [ ] **Step 1: Écrire le test qui échoue**

`src/design/molecules/TrackRailItem.test.tsx` :

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrackRailItem } from './TrackRailItem';

const base = {
  title: 'Titre',
  artist: 'Artiste',
  time: '06:12',
  isLiked: false,
  isLiking: false,
  onToggle: () => {},
  onShare: () => {},
};

describe('TrackRailItem', () => {
  it('renders title, artist and time', () => {
    render(<TrackRailItem {...base} />);
    expect(screen.getByText('Titre')).toBeInTheDocument();
    expect(screen.getByText('Artiste')).toBeInTheDocument();
    expect(screen.getByText('06:12')).toBeInTheDocument();
  });

  it('calls onToggle and onShare on the action buttons', () => {
    const onToggle = vi.fn();
    const onShare = vi.fn();
    render(<TrackRailItem {...base} onToggle={onToggle} onShare={onShare} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes morceaux' }));
    fireEvent.click(screen.getByRole('button', { name: 'Partager' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('shows the remove label when liked', () => {
    render(<TrackRailItem {...base} isLiked />);
    expect(screen.getByRole('button', { name: 'Retirer de mes morceaux' })).toBeInTheDocument();
  });

  it('disables the like button while liking', () => {
    render(<TrackRailItem {...base} isLiking />);
    expect(screen.getByRole('button', { name: 'Ajouter à mes morceaux' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `pnpm test -- src/design/molecules/TrackRailItem.test.tsx`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter `TrackRailItem`**

`src/design/molecules/TrackRailItem.tsx` :

```tsx
import { Heart, Share2 } from 'lucide-react';
import { Thumbnail } from '../atoms/Thumbnail';
import { IconButton } from '../atoms/IconButton';

export interface TrackRailItemProps {
  title: string;
  artist: string;
  art?: string;
  time: string;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export function TrackRailItem({
  title,
  artist,
  art,
  time,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: TrackRailItemProps) {
  return (
    <div role="listitem" className="group flex w-64 shrink-0 items-center gap-3 py-3">
      <Thumbnail src={art} size="md" />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body text-text-muted">{title}</p>
        <p className="truncate text-caption text-text-faint">{artist}</p>
      </div>

      <time className="shrink-0 text-caption text-text-faint tabular-nums">{time}</time>

      <IconButton
        label={isLiked ? 'Retirer de mes morceaux' : 'Ajouter à mes morceaux'}
        active={isLiked}
        reveal
        disabled={isLiking}
        onClick={onToggle}
      >
        <Heart className="size-5" fill={isLiked ? 'currentColor' : 'none'} />
      </IconButton>

      <IconButton label="Partager" reveal onClick={onShare}>
        <Share2 className="size-5" />
      </IconButton>
    </div>
  );
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `pnpm test -- src/design/molecules/TrackRailItem.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Écrire la story**

`src/design/molecules/TrackRailItem.stories.tsx` :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrackRailItem } from './TrackRailItem';

const meta: Meta<typeof TrackRailItem> = {
  title: 'Molecules/TrackRailItem',
  component: TrackRailItem,
};
export default meta;

const noop = () => {};

export const Etats: StoryObj = {
  render: () => (
    <div role="list" className="flex flex-col divide-y divide-border">
      <TrackRailItem
        title="Titre du morceau"
        artist="Artiste"
        art="https://picsum.photos/seed/aube1/96"
        time="06:12"
        isLiked={false}
        isLiking={false}
        onToggle={noop}
        onShare={noop}
      />
      <TrackRailItem
        title="Morceau aimé"
        artist="Autre artiste"
        time="05:58"
        isLiked
        isLiking={false}
        onToggle={noop}
        onShare={noop}
      />
      <TrackRailItem
        title="Un titre particulièrement long qui doit être tronqué proprement"
        artist="Artiste au nom également très long"
        time="05:41"
        isLiked={false}
        isLiking
        onToggle={noop}
        onShare={noop}
      />
      <p className="py-2 text-caption text-text-muted">
        Survolez une ligne pour révéler like / partage.
      </p>
    </div>
  ),
};
```

- [ ] **Step 6: Vérifier et committer**

Run: `pnpm typecheck && pnpm lint && pnpm test -- src/design/molecules/TrackRailItem.test.tsx`
Expected: PASS.

```bash
git add src/design/molecules/TrackRailItem.tsx src/design/molecules/TrackRailItem.test.tsx src/design/molecules/TrackRailItem.stories.tsx
git commit -m "feat(frontend): add TrackRailItem molecule"
```

---

### Task 7: Organism `RecentTracksRail`

**Files:**

- Create: `src/design/organisms/RecentTracksRail.tsx`
- Story: `src/design/organisms/RecentTracksRail.stories.tsx`

(Pas de test unitaire dédié : l'organism rend `Rail` (Embla) ; sa couverture jsdom se fait via `RecentTracks.test.tsx` en Task 8, et ses états via Storybook.)

**Interfaces:**

- Consumes : `Rail` (`../atoms/Rail`), `TrackRailItem` (`../molecules/TrackRailItem`).
- Produces : type `RailEntry = { id: number; title: string; artist: string; art?: string; time: string; isLiked: boolean; isLiking: boolean }` et `RecentTracksRail({ entries: RailEntry[]; isLoading: boolean; partial: boolean; onToggle: (id: number) => void; onShare: (id: number) => void })`. Rend `<section aria-label="Vient de passer">` avec header, skeleton (testid `recent-tracks-skeleton`), état vide, ou le rail.

- [ ] **Step 1: Implémenter `RecentTracksRail`**

`src/design/organisms/RecentTracksRail.tsx` :

```tsx
import { Rail } from '../atoms/Rail';
import { TrackRailItem } from '../molecules/TrackRailItem';

export interface RailEntry {
  id: number;
  title: string;
  artist: string;
  art?: string;
  time: string;
  isLiked: boolean;
  isLiking: boolean;
}

export interface RecentTracksRailProps {
  entries: RailEntry[];
  isLoading: boolean;
  partial: boolean;
  onToggle: (id: number) => void;
  onShare: (id: number) => void;
}

export function RecentTracksRail({
  entries,
  isLoading,
  partial,
  onToggle,
  onShare,
}: RecentTracksRailProps) {
  return (
    <section aria-label="Vient de passer" className="min-w-0 border-t border-border">
      <div className="mx-auto w-full min-w-0 px-6 py-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-caption tracking-widest uppercase text-text-faint">
            Vient de passer
          </h2>
          {partial ? <p className="text-caption text-text-faint">Historique partiel.</p> : null}
        </div>

        {isLoading && entries.length === 0 ? (
          <div className="flex gap-4 overflow-hidden pt-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                data-testid="recent-tracks-skeleton"
                className="flex w-64 shrink-0 items-center gap-3 py-3"
              >
                <div className="size-12 rounded-sm animate-pulse bg-surface-raised" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-3.5 w-28 rounded-sm animate-pulse bg-surface-raised" />
                  <div className="h-3 w-16 rounded-sm animate-pulse bg-surface-raised" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-caption text-text-faint pt-1.5">Aucun morceau pour l&apos;instant.</p>
        ) : (
          <div className="pt-1.5 pb-1">
            <Rail ariaLabel="Vient de passer">
              {entries.map((entry) => (
                <TrackRailItem
                  key={entry.id}
                  title={entry.title}
                  artist={entry.artist}
                  art={entry.art}
                  time={entry.time}
                  isLiked={entry.isLiked}
                  isLiking={entry.isLiking}
                  onToggle={() => onToggle(entry.id)}
                  onShare={() => onShare(entry.id)}
                />
              ))}
            </Rail>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Écrire la story (états vide / chargement / peuplé)**

`src/design/organisms/RecentTracksRail.stories.tsx` :

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RecentTracksRail, type RailEntry } from './RecentTracksRail';

const meta: Meta<typeof RecentTracksRail> = {
  title: 'Organisms/RecentTracksRail',
  component: RecentTracksRail,
};
export default meta;

const noop = () => {};

const entries: RailEntry[] = [
  {
    id: 9,
    title: 'Song Nine',
    artist: 'Artist Nine',
    time: '06:12',
    isLiked: true,
    isLiking: false,
  },
  {
    id: 8,
    title: 'Song Eight',
    artist: 'Artist Eight',
    time: '05:58',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 7,
    title: 'Song Seven',
    artist: 'Artist Seven',
    time: '05:41',
    isLiked: false,
    isLiking: true,
  },
  {
    id: 6,
    title: 'Song Six',
    artist: 'Artist Six',
    time: '05:20',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 5,
    title: 'Song Five',
    artist: 'Artist Five',
    time: '05:02',
    isLiked: false,
    isLiking: false,
  },
  {
    id: 4,
    title: 'Song Four',
    artist: 'Artist Four',
    time: '04:48',
    isLiked: false,
    isLiking: false,
  },
];

export const Peuple: StoryObj = {
  render: () => (
    <RecentTracksRail
      entries={entries}
      isLoading={false}
      partial={false}
      onToggle={noop}
      onShare={noop}
    />
  ),
};

export const HistoriquePartiel: StoryObj = {
  render: () => (
    <RecentTracksRail entries={entries} isLoading={false} partial onToggle={noop} onShare={noop} />
  ),
};

export const Chargement: StoryObj = {
  render: () => (
    <RecentTracksRail entries={[]} isLoading partial={false} onToggle={noop} onShare={noop} />
  ),
};

export const Vide: StoryObj = {
  render: () => (
    <RecentTracksRail
      entries={[]}
      isLoading={false}
      partial={false}
      onToggle={noop}
      onShare={noop}
    />
  ),
};
```

- [ ] **Step 4: Vérifier et committer**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/design/organisms/RecentTracksRail.tsx src/design/organisms/RecentTracksRail.stories.tsx
git commit -m "feat(frontend): add RecentTracksRail organism with all states"
```

---

### Task 8: Container `RecentTracks` + suppression de `RecentTrackCard`

**Files:**

- Modify: `src/components/Player/RecentTracks.tsx` (devient un container mince)
- Delete: `src/components/Player/RecentTrackCard.tsx`
- Verify: `src/components/Player/RecentTracks.test.tsx` (doit passer sans modification)

**Interfaces:**

- Consumes : `RecentTracksRail`, `RailEntry` (`../../design/organisms/RecentTracksRail`) ; stores et hooks existants inchangés.
- Produces : composant `RecentTracks` (même export nommé, même comportement observable).

- [ ] **Step 1: Réécrire `RecentTracks` en container**

Remplacer tout le contenu de `src/components/Player/RecentTracks.tsx` par :

```tsx
import { toast } from 'sonner';
import { useNowPlayingStore } from '../../lib/azuracast/store';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { RecentTracksRail, type RailEntry } from '../../design/organisms/RecentTracksRail';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function RecentTracks() {
  const history = useNowPlayingStore((s) => s.data?.song_history);
  const nowPlayingId = useNowPlayingStore((s) => s.data?.now_playing?.sh_id);
  const error = useNowPlayingStore((s) => s.error);
  const isLoading = !useNowPlayingStore((s) => s.data);

  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();

  const entries = (history ?? []).filter((e) => e.sh_id !== nowPlayingId).slice(0, 6);
  const byId = new Map<number, SongEntry>(entries.map((e) => [e.sh_id, e]));

  const railEntries: RailEntry[] = entries.map((e) => ({
    id: e.sh_id,
    title: e.song.title,
    artist: e.song.artist,
    art: e.song.art || undefined,
    time: timeFormatter.format(new Date(e.played_at * 1000)),
    isLiked: isTrackLiked(tracks, e.song.title, e.song.artist),
    isLiking: likingTrackId === `${e.song.title}-${e.song.artist}`,
  }));

  const handleShare = (entry: SongEntry) => {
    const likedTrack = tracks.find(
      (t) =>
        t.title.toLowerCase() === entry.song.title.toLowerCase() &&
        t.artist.toLowerCase() === entry.song.artist.toLowerCase()
    );
    const url = getTrackShareUrl(
      likedTrack ?? { title: entry.song.title, artist: entry.song.artist },
      preferences?.preferredPlatform
    );
    void shareTrack({ title: entry.song.title, artist: entry.song.artist, url })
      .then((result) => {
        if (result === 'copied') toast('Lien copié');
      })
      .catch(() => {
        toast('Partage impossible');
      });
  };

  return (
    <RecentTracksRail
      entries={railEntries}
      isLoading={isLoading}
      partial={Boolean(error) && entries.length > 0}
      onToggle={(id) => {
        const entry = byId.get(id);
        if (entry) void toggleLike(entry.song.title, entry.song.artist, entry.song.art);
      }}
      onShare={(id) => {
        const entry = byId.get(id);
        if (entry) handleShare(entry);
      }}
    />
  );
}
```

- [ ] **Step 2: Supprimer l'ancienne carte**

```bash
git rm src/components/Player/RecentTrackCard.tsx
```

- [ ] **Step 3: Lancer les tests du container → succès**

Run: `pnpm test -- src/components/Player/RecentTracks.test.tsx`
Expected: PASS (les 5 tests existants : now-playing exclu, max 6 items, historique partiel, skeleton, message vide). Si un test échoue sur `ResizeObserver`, vérifier le stub de la Task 5, Step 2.

- [ ] **Step 4: Suite complète + lint + typecheck**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: PASS, zéro warning.

- [ ] **Step 5: Vérification visuelle (boucle screenshots)**

Lancer `pnpm dev` (port 5173) et vérifier `Storybook` (`pnpm storybook`, port 6006) : rail « Vient de passer » aéré, scrollbar absente, drag souris fonctionnel, actions révélées au survol/focus, dans les 2 thèmes. Confirmer l'appairage de police sur le hero et les titres de section.

- [ ] **Step 6: Commit**

```bash
git add src/components/Player/RecentTracks.tsx
git commit -m "feat(frontend): rebuild Vient de passer rail on atomic components"
```

---

## Self-Review

**Spec coverage :**

- Partie A (police) → Task 1. ✓
- Partie B (rail Embla, dragFree, scrollbar masquée, aération) → Tasks 5 (Rail) + 6 (item) + 7 (organism) + 8 (container). ✓
  Écart assumé vs spec : pas de plugin `embla-carousel-a11y`. Raison (doc-first) : ce plugin cible les carrousels paginés (annonces « slide X of Y », nav flèches). Notre rail est sémantiquement une **liste** (`role="list"`/`listitem`) dont les enfants (like/partage) sont déjà focusables ; le `focus: true` natif d'Embla ramène l'élément focus dans le viewport. On garde donc des sémantiques de liste correctes plutôt que d'imposer un modèle carrousel. À valider par l'addon-a11y de Storybook et un test clavier manuel.
- Partie C (taxonomie, migration DS, container/présentational split, suppression RecentTrackCard) → Task 2 + Tasks 3–8. ✓
- Partie D (Storybook par atom/molecule/organism, états) → stories dans Tasks 3–7 ; toggle thème conservé. ✓

**Placeholder scan :** aucun TBD/TODO ; tout le code est fourni intégralement.

**Type consistency :** `RailEntry` défini en Task 7 et réimporté en Task 8 (mêmes champs). `IconButton` (Task 4) et `Thumbnail` (Task 3) consommés en Task 6 avec les signatures produites. `Rail` (Task 5) consommé en Task 7. `cn` importé de `@/lib/utils` partout (Task 2 consolide).

**Risques :** Embla en jsdom → mitigé par le stub `ResizeObserver` (Task 5, Step 2), vérifié en Task 8, Step 3.
