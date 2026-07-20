# Design System v3 — Plan 1: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v3 foundations (OKLCH two-theme tokens on Tailwind 4 `@theme`, theme logic, contrast proof in CI, foundations stories in Storybook) without touching the running app.

**Architecture:** `src/design/tokens.css` is the single token source (primitive + semantic layers, light/dark via `data-theme`). Storybook consumes it through a dedicated Tailwind entry `src/design/storybook.css`; the app's `index.css` is NOT modified in this plan (old design keeps running until screen-migration PRs). `src/lib/theme.ts` holds theme resolution/persistence, unit-tested, not yet mounted in the app. `scripts/check-contrast.mjs` parses `tokens.css` and proves WCAG AA in CI.

**Tech Stack:** Tailwind CSS 4.3 (`@theme inline`, `@custom-variant`, `@utility` — validated against tailwindcss.com/docs/colors and /docs/dark-mode), Storybook 10 (react-vite, addon-a11y already installed), Vitest 3, fonts via @fontsource-variable.

**Spec:** `docs/superpowers/specs/2026-07-20-design-system-v3-design.md`. This plan covers spec §4 "PR 1 — Fondations" only. Plans 2..n (primitives, screens, demolition) are written after Victor's Storybook checkpoint.

## Global Constraints

- Branch: `feat/design-v3-foundations` off fresh `master`. Conventional Commits in English, scope `frontend`. Stage file by file (`git add <path>`), never `git add .`.
- Working dir for pnpm commands: `apps/frontend` unless stated. Run `pnpm typecheck && pnpm lint` (zero warnings) before claiming any task done.
- TypeScript strict; named exports only; **no code comments** unless a non-obvious WHY.
- Components/stories consume ONLY semantic utilities (`bg-surface`, `text-text-muted`…). No hex/hsl/oklch literals outside `src/design/tokens.css`. No arbitrary values (`bg-[#…]`).
- Contrast floors: 4.5:1 text, 3:1 large text / UI components. Touch targets ≥ 44px. Decorative motion only under `prefers-reduced-motion: no-preference`; durations 150–250ms ease-out.
- Tailwind v4 syntax only: no `tailwind.config.js`, no `@tailwind` directives, no `tailwindcss` npm-script plugins.
- UI copy in French; code identifiers in English.
- Do NOT modify: `src/index.css`, anything under `src/components/` except deleting the two old story files, `src/lib/moments.ts` (app still uses it).

## File Structure

- Create: `apps/frontend/scripts/` — `check-contrast.mjs` rewritten (parses tokens.css, 2 themes).
- Rewrite: `apps/frontend/src/design/tokens.css` — the only token source (primitive + semantic + `@theme inline` + `@custom-variant dark` + `@utility dawn-glow`).
- Create: `apps/frontend/src/design/storybook.css` — Tailwind entry for Storybook only.
- Create: `apps/frontend/src/lib/theme.ts` + `apps/frontend/src/lib/theme.test.ts`.
- Rewrite: `apps/frontend/.storybook/preview.tsx` — light/dark toolbar, font-candidate toolbar.
- Create: `apps/frontend/src/design/Couleurs.stories.tsx`, `Typographie.stories.tsx`, `Espacement.stories.tsx`, `Onde.stories.tsx`.
- Delete: `apps/frontend/src/components/ui/Moments.stories.tsx`, `apps/frontend/src/components/ui/Typographie.stories.tsx`.
- Create: `apps/frontend/CLAUDE.md` — agent conventions.
- Modify: `apps/frontend/package.json` (script `check:contrast`, dep instrument-sans), `.github/workflows/ci.yml` (contrast step in Quality job).

---

### Task 1: Contrast proof script (test-first for the palette)

**Files:**

- Rewrite: `apps/frontend/scripts/check-contrast.mjs`

**Interfaces:**

- Consumes: `src/design/tokens.css` (written in Task 2).
- Produces: exit 0 when all pairs pass; prints `PASS|FAIL <theme> <pair> <ratio>`. Pairs checked per theme: `text/surface` ≥4.5, `text-muted/surface` ≥4.5, `text-faint/surface` ≥4.5, `text/surface-raised` ≥4.5, `accent/surface` ≥3.0, `on-accent/accent` ≥4.5, `text/dawn-glow-composite` ≥4.5 (dawn tint mixed 30% over surface).

- [ ] **Step 1: Write the new script**

```js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/design/tokens.css'),
  'utf8'
);

const block = (selector) => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
};

const parseVars = (text) => {
  const vars = {};
  for (const m of text.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return vars;
};

const oklchToLinearSrgb = ([L, C, H]) => {
  const h = (H * Math.PI) / 180;
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)));
};

const luminance = (rgb) => rgb.reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));

const themes = {
  light: parseVars(block(':root')),
  dark: parseVars(block("[data-theme='dark']")),
};

let fail = false;
for (const [name, vars] of Object.entries(themes)) {
  const c = (key) => {
    if (!vars[key]) throw new Error(`missing --${key} in ${name}`);
    return oklchToLinearSrgb(vars[key]);
  };
  const glow = mix(c('dawn-tint'), c('surface'), 0.3);
  const pairs = [
    ['text/surface', c('text'), c('surface'), 4.5],
    ['text-muted/surface', c('text-muted'), c('surface'), 4.5],
    ['text-faint/surface', c('text-faint'), c('surface'), 4.5],
    ['text/surface-raised', c('text'), c('surface-raised'), 4.5],
    ['accent/surface', c('accent'), c('surface'), 3.0],
    ['on-accent/accent', c('on-accent'), c('accent'), 4.5],
    ['text/dawn-glow', c('text'), glow, 4.5],
  ];
  for (const [label, fg, bg, floor] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= floor;
    if (!ok) fail = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${label} ${r.toFixed(2)} (min ${floor})`);
  }
}
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run to verify it fails against the old tokens.css**

Run: `cd apps/frontend && node scripts/check-contrast.mjs`
Expected: throws `selector not found: [data-theme='dark']` (old file has `data-moment` blocks) → non-zero exit. This is the failing test for Task 2.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/scripts/check-contrast.mjs
git commit -m "test(frontend): contrast proof reads v3 two-theme tokens"
```

---

### Task 2: tokens.css v3 — the single token source

**Files:**

- Rewrite: `apps/frontend/src/design/tokens.css` (delete all old content including `.ds-*` classes)

**Interfaces:**

- Produces: semantic utilities `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`; typography utilities `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption`; `font-sans`; `rounded-sm|md|full`; `duration-quick|base`; `ease-out-quart`; utility `dawn-glow`; variant `dark:`. Theme switch = `data-theme="dark"` on any ancestor; light is default.
- Consumed by: Task 1 script, Task 4 storybook.css, all later plans.

- [ ] **Step 1: Write the file**

```css
/*
  AubeSonore — design system v3. Source unique des tokens.
  Couche primitive (--p-*) : jamais consommée par les composants.
  Couche sémantique : la seule API, exposée à Tailwind via @theme inline.
  AA prouvé par scripts/check-contrast.mjs sur les 2 thèmes.
*/

:root {
  color-scheme: light;

  --p-font-stack: 'Inter Variable', system-ui, sans-serif;

  --surface: oklch(0.975 0.008 80);
  --surface-raised: oklch(0.94 0.012 80);
  --text: oklch(0.24 0.02 60);
  --text-muted: oklch(0.4 0.02 60);
  --text-faint: oklch(0.47 0.015 60);
  --border: oklch(0.86 0.012 80);
  --accent: oklch(0.47 0.12 25);
  --on-accent: oklch(0.98 0.008 80);
  --dawn-tint: oklch(0.88 0.05 25);
}

[data-theme='dark'] {
  color-scheme: dark;

  --surface: oklch(0.19 0.025 265);
  --surface-raised: oklch(0.235 0.025 265);
  --text: oklch(0.93 0.012 80);
  --text-muted: oklch(0.72 0.015 80);
  --text-faint: oklch(0.63 0.012 80);
  --border: oklch(0.32 0.02 265);
  --accent: oklch(0.76 0.1 25);
  --on-accent: oklch(0.18 0.03 265);
  --dawn-tint: oklch(0.35 0.06 25);
}

@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

@theme inline {
  --color-*: initial;
  --color-surface: var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
  --color-text-faint: var(--text-faint);
  --color-border: var(--border);
  --color-accent: var(--accent);
  --color-on-accent: var(--on-accent);

  --font-*: initial;
  --font-sans: var(--p-font-stack);

  --text-*: initial;
  --text-display: clamp(2.25rem, 1.2rem + 4.5vw, 4rem);
  --text-display--line-height: 1.05;
  --text-display--font-weight: 640;
  --text-display--letter-spacing: -0.015em;
  --text-title: clamp(1.35rem, 1.1rem + 1vw, 1.75rem);
  --text-title--line-height: 1.15;
  --text-title--font-weight: 600;
  --text-lead: 1.125rem;
  --text-lead--line-height: 1.5;
  --text-lead--font-weight: 450;
  --text-body: 1rem;
  --text-body--line-height: 1.55;
  --text-body--font-weight: 400;
  --text-caption: 0.8125rem;
  --text-caption--line-height: 1.4;
  --text-caption--font-weight: 500;
  --text-caption--letter-spacing: 0.01em;

  --radius-*: initial;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-full: 9999px;

  --ease-out-quart: cubic-bezier(0.2, 0, 0, 1);
}

@utility dawn-glow {
  background-image: linear-gradient(
    to bottom,
    color-mix(in oklab, var(--dawn-tint) 30%, var(--surface)),
    var(--surface) 14rem
  );
}
```

- [ ] **Step 2: Run the contrast proof**

Run: `cd apps/frontend && node scripts/check-contrast.mjs`
Expected: 14 lines, all PASS, exit 0.
If a pair FAILs: adjust only the L (first) component of the failing foreground token — move it away from its background's L in steps of 0.02 — re-run until PASS. Never touch C/H to fix contrast.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/design/tokens.css
git commit -m "feat(frontend): v3 two-theme OKLCH tokens on tailwind @theme"
```

---

### Task 3: Theme logic (`lib/theme.ts`) — TDD

**Files:**

- Create: `apps/frontend/src/lib/theme.ts`
- Create: `apps/frontend/src/lib/theme.test.ts`

**Interfaces:**

- Produces:
  - `type Theme = 'light' | 'dark'`
  - `THEME_STORAGE_KEY = 'aubesonore-theme'`
  - `resolveTheme(stored: string | null, prefersDark: boolean): Theme` — stored value wins when valid, else system preference.
  - `applyTheme(theme: Theme): void` — sets/removes `data-theme` on `document.documentElement` (`light` = attribute removed).
  - `initTheme(): Theme` — reads localStorage + matchMedia, applies, returns the theme; follows live system changes only while no stored choice exists.
  - `setTheme(theme: Theme): void` — persists to localStorage and applies.
- Consumed by: screen-migration plan (mount in `main.tsx`), theme toggle component (Plan 2).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme, initTheme, resolveTheme, setTheme } from './theme';

const mockMatchMedia = (matches: boolean) => {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  });
  return { fire: (m: boolean) => listeners.forEach((cb) => cb({ matches: m })) };
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('resolveTheme', () => {
  it('uses the stored choice when valid', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('falls back to system preference', () => {
    expect(resolveTheme(null, true)).toBe('dark');
    expect(resolveTheme('junk', false)).toBe('light');
  });
});

describe('applyTheme', () => {
  it('sets data-theme for dark and removes it for light', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    applyTheme('light');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('initTheme', () => {
  it('applies the system preference when nothing is stored', () => {
    mockMatchMedia(true);
    expect(initTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
  it('follows live system changes only without a stored choice', () => {
    const media = mockMatchMedia(false);
    initTheme();
    media.fire(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    setTheme('light');
    media.fire(true);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('setTheme', () => {
  it('persists and applies', () => {
    mockMatchMedia(false);
    setTheme('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/frontend && pnpm test --run src/lib/theme.test.ts`
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Implement**

```ts
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'aubesonore-theme';

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export function initTheme(): Theme {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const theme = resolveTheme(localStorage.getItem(THEME_STORAGE_KEY), media.matches);
  applyTheme(theme);
  media.addEventListener('change', (event) => {
    if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  });
  return theme;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd apps/frontend && pnpm test --run src/lib/theme.test.ts`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/theme.ts apps/frontend/src/lib/theme.test.ts
git commit -m "feat(frontend): theme resolution with persisted override"
```

---

### Task 4: Storybook wiring — Tailwind entry, theme + font toolbars, purge old stories

**Files:**

- Create: `apps/frontend/src/design/storybook.css`
- Rewrite: `apps/frontend/.storybook/preview.tsx`
- Delete: `apps/frontend/src/components/ui/Moments.stories.tsx`, `apps/frontend/src/components/ui/Typographie.stories.tsx`
- Modify: `apps/frontend/package.json` (add font candidate B)

**Interfaces:**

- Consumes: `tokens.css` (Task 2).
- Produces: every story renders inside a themed root; toolbar `theme` (`light`/`dark`) sets `data-theme` on `<html>`; toolbar `fonte` (`inter`/`instrument`) overrides `--p-font-stack` inline for the typography comparison. Stories from Task 5 rely on both.

- [ ] **Step 1: Add the second font candidate**

Run: `cd apps/frontend && pnpm add @fontsource-variable/instrument-sans`
Expected: dependency added to package.json. If the package does not exist on the registry, use `@fontsource-variable/public-sans` instead and substitute the family name `'Public Sans Variable'` everywhere `'Instrument Sans Variable'` appears below.

- [ ] **Step 2: Write `src/design/storybook.css`**

```css
@import 'tailwindcss';
@import './tokens.css';

body {
  background-color: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
}
```

- [ ] **Step 3: Rewrite `.storybook/preview.tsx`**

```tsx
import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/instrument-sans';
import '../src/design/storybook.css';

const FONT_STACKS: Record<string, string> = {
  inter: "'Inter Variable', system-ui, sans-serif",
  instrument: "'Instrument Sans Variable', system-ui, sans-serif",
};

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
    fonte: {
      description: 'Candidate typographique',
      toolbar: {
        title: 'Fonte',
        icon: 'paragraph',
        items: [
          { value: 'inter', title: 'Inter' },
          { value: 'instrument', title: 'Instrument Sans' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    fonte: 'inter',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      const fonte = context.globals.fonte as string;
      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
        document.documentElement.style.setProperty('--p-font-stack', FONT_STACKS[fonte]);
      }, [theme, fonte]);
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

- [ ] **Step 4: Delete the old stories**

```bash
git rm apps/frontend/src/components/ui/Moments.stories.tsx apps/frontend/src/components/ui/Typographie.stories.tsx
```

- [ ] **Step 5: Verify Storybook builds**

Run: `cd apps/frontend && pnpm build-storybook`
Expected: build succeeds, no missing-module errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/design/storybook.css apps/frontend/.storybook/preview.tsx apps/frontend/package.json ../../pnpm-lock.yaml
git commit -m "feat(frontend): storybook themed on v3 tokens with font candidates"
```

(The `git rm` from Step 4 is already staged.)

---

### Task 5: Foundations stories

**Files:**

- Create: `apps/frontend/src/design/Couleurs.stories.tsx`
- Create: `apps/frontend/src/design/Typographie.stories.tsx`
- Create: `apps/frontend/src/design/Espacement.stories.tsx`
- Create: `apps/frontend/src/design/Onde.stories.tsx`

**Interfaces:**

- Consumes: semantic utilities (Task 2), toolbars (Task 4).
- Produces: the visual checkpoint Victor validates. Story titles: `Fondations/Couleurs`, `Fondations/Typographie`, `Fondations/Espacement`, `Fondations/Onde`.

- [ ] **Step 1: Write `Couleurs.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Couleurs' };
export default meta;

const SWATCHES = [
  { name: 'surface', className: 'bg-surface border border-border' },
  { name: 'surface-raised', className: 'bg-surface-raised' },
  { name: 'text', className: 'bg-text' },
  { name: 'text-muted', className: 'bg-text-muted' },
  { name: 'text-faint', className: 'bg-text-faint' },
  { name: 'border', className: 'bg-border' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'on-accent', className: 'bg-on-accent border border-border' },
];

export const Palette: StoryObj = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SWATCHES.map((s) => (
          <figure key={s.name} className="flex flex-col gap-2">
            <div className={`h-16 rounded-md ${s.className}`} />
            <figcaption className="text-caption text-text-muted">{s.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="rounded-md bg-accent p-4 text-body text-on-accent">
        Texte sur accent — la paire on-accent/accent est prouvée AA.
      </div>
    </div>
  ),
};

export const LueurAube: StoryObj = {
  render: () => (
    <div className="dawn-glow -m-8 min-h-screen p-8">
      <p className="max-w-[66ch] text-display">La page semble imprimée au lever du jour.</p>
      <p className="mt-4 max-w-[66ch] text-body text-text-muted">
        La lueur est un dégradé statique en tête de page, présent dans les deux thèmes. Elle doit
        rester discrète : si elle se remarque avant le contenu, elle est trop forte.
      </p>
    </div>
  ),
};
```

- [ ] **Step 2: Write `Typographie.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Typographie' };
export default meta;

export const Echelle: StoryObj = {
  render: () => (
    <div className="flex max-w-[66ch] flex-col gap-6">
      <p className="text-display">Aube Sonore, la radio qui se lève tôt</p>
      <p className="text-title">Titre de section — artiste et morceau</p>
      <p className="text-lead">
        Lead : une phrase d’accroche qui respire, pour les descriptions d’émissions.
      </p>
      <p className="text-body">
        Body : le texte courant. La longueur de ligne reste sous soixante-six caractères pour un
        confort de lecture optimal, et l’interlignage est sans unité.
      </p>
      <p className="text-caption text-text-muted">CAPTION — HORAIRES 06:12 · MÉTADONNÉES</p>
      <p className="text-body tabular-nums">Tabulaires : 06:12 — 11:00 — 23:58</p>
    </div>
  ),
};
```

- [ ] **Step 3: Write `Espacement.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Espacement' };
export default meta;

const STEPS = [1, 2, 3, 4, 6, 8, 12, 16];

export const Echelle: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      {STEPS.map((step) => (
        <div key={step} className="flex items-center gap-4">
          <span className="w-16 text-caption text-text-muted tabular-nums">{step * 4}px</span>
          <div className="bg-accent" style={{ width: `${step * 0.25}rem`, height: '1rem' }} />
        </div>
      ))}
      <p className="mt-4 max-w-[66ch] text-caption text-text-muted">
        Base 4px (échelle Tailwind par défaut) — les espacements de composition privilégient les
        multiples de 8 : gap-2, gap-4, gap-6, gap-8.
      </p>
    </div>
  ),
};
```

- [ ] **Step 4: Write `Onde.stories.tsx`** (static SVG study — the real-time canvas comes with the Player migration)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';

const meta: Meta = { title: 'Fondations/Onde' };
export default meta;

const wavePath = (amplitude: number, cycles: number) => {
  const points = Array.from({ length: 121 }, (_, i) => {
    const x = (i / 120) * 600;
    const y =
      40 + amplitude * Math.sin((i / 120) * cycles * Math.PI * 2) * Math.sin((i / 120) * Math.PI);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return points.join(' ');
};

const Wave = ({
  amplitude,
  cycles,
  thickness,
  label,
}: {
  amplitude: number;
  cycles: number;
  thickness: number;
  label: string;
}) => (
  <figure className="flex flex-col gap-1">
    <svg viewBox="0 0 600 80" className="h-20 w-full max-w-2xl" role="img" aria-label={label}>
      <path
        d={wavePath(amplitude, cycles)}
        fill="none"
        stroke="currentColor"
        strokeWidth={thickness}
        strokeLinecap="round"
      />
    </svg>
    <figcaption className="text-caption text-text-muted">{label}</figcaption>
  </figure>
);

export const Etude: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-8 text-text">
      <Wave amplitude={26} cycles={9} thickness={1.5} label="Direct — fine (1.5)" />
      <Wave amplitude={26} cycles={9} thickness={2.5} label="Direct — médium (2.5)" />
      <Wave amplitude={12} cycles={14} thickness={1.5} label="Direct — dense et calme" />
      <Wave amplitude={0} cycles={1} thickness={1.5} label="Pause — le filet" />
      <div className="text-accent">
        <Wave amplitude={26} cycles={9} thickness={1.5} label="Variante accent (à discuter)" />
      </div>
      <p className="max-w-[66ch] text-caption text-text-muted">
        Étude statique : épaisseurs et densités de la ligne d’encre. La version temps réel
        (WebAudio) arrive avec la migration du Player ; sous prefers-reduced-motion elle restera un
        filet + mention textuelle du direct.
      </p>
    </div>
  ),
};
```

- [ ] **Step 5: Verify in Storybook**

Run: `cd apps/frontend && pnpm build-storybook`
Expected: build succeeds. Then run `pnpm storybook` and confirm: 4 `Fondations/*` entries render, theme toolbar flips light/dark, fonte toolbar switches the typography story, addon-a11y panel shows no violations on any foundations story.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/design/Couleurs.stories.tsx apps/frontend/src/design/Typographie.stories.tsx apps/frontend/src/design/Espacement.stories.tsx apps/frontend/src/design/Onde.stories.tsx
git commit -m "feat(frontend): v3 foundations stories (colors, type, spacing, wave study)"
```

---

### Task 6: Agent conventions — `apps/frontend/CLAUDE.md`

**Files:**

- Create: `apps/frontend/CLAUDE.md`

- [ ] **Step 1: Write the file**

```markdown
# Frontend — agent conventions (design system v3)

Spec: `docs/superpowers/specs/2026-07-20-design-system-v3-design.md`.

## Tailwind v4 — this project uses v4 syntax ONLY

- No `tailwind.config.js`, no `@tailwind base/components/utilities`, no `theme.extend`.
- Tokens live in `src/design/tokens.css` (`@theme inline`). New utilities via `@utility`, new variants via `@custom-variant`, in that file only.
- Dark mode = `data-theme="dark"` attribute (variant `dark:`), never the `.dark` class, never `prefers-color-scheme` directly in component CSS.

## Token vocabulary (the ONLY allowed colors)

`bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`,
`border-border`, `bg-accent`, `text-accent`, `text-on-accent`, utility `dawn-glow`.

- Never write hex/hsl/oklch values outside `src/design/tokens.css`.
- Never use arbitrary values for color, spacing, typography (`bg-[#fff]`, `p-[13px]`, `text-[17px]`).
- Typography: `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption` — nothing else.
- Radii: `rounded-sm`, `rounded-md`, `rounded-full` — nothing else.
- New token needed? Add it to both theme blocks in `tokens.css`, add its pair to `scripts/check-contrast.mjs`, run the script.

## Non-negotiables

- `node scripts/check-contrast.mjs` passes (wired in CI Quality).
- Every interactive element: hover, focus-visible, active, disabled states; touch target ≥ 44px.
- Decorative motion only under `prefers-reduced-motion: no-preference`; 150–250ms; `ease-out-quart`.
- Storybook story colocated for every `ui/` primitive, all states × both themes; addon-a11y must be clean.
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend/CLAUDE.md
git commit -m "docs(frontend): agent conventions for tailwind v4 token vocabulary"
```

---

### Task 7: CI wiring + full validation

**Files:**

- Modify: `apps/frontend/package.json` (scripts block)
- Modify: `.github/workflows/ci.yml` (Quality job, after the `Typecheck` step)

- [ ] **Step 1: Add the npm script**

In `apps/frontend/package.json` scripts, after `"typecheck"`:

```json
"check:contrast": "node scripts/check-contrast.mjs",
```

- [ ] **Step 2: Add the CI step**

In `.github/workflows/ci.yml`, Quality job, insert after the `- name: Typecheck` step (match existing indentation):

```yaml
- name: Contrast proof (design tokens)
  run: pnpm --filter=@aubesonore/frontend check:contrast
```

- [ ] **Step 3: Full validation**

Run, from `apps/frontend`:

```bash
pnpm check:contrast && pnpm typecheck && pnpm lint && pnpm test --run && pnpm knip && pnpm build-storybook && pnpm build
```

Expected: every command exits 0, lint with zero warnings. `pnpm build` proves the untouched app still compiles. If knip flags the deleted stories' leftovers or unused exports from `theme.ts`, fix by removing dead references — `theme.ts` exports consumed only by tests are expected at this stage; if knip complains, add `src/lib/theme.ts` to knip's entry ignore for this PR and remove the ignore in the screen-migration plan.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/package.json .github/workflows/ci.yml
git commit -m "ci: prove design token contrast in quality job"
```

---

### Task 8: PR + checkpoint

- [ ] **Step 1: Push and open the PR**

```bash
git push -u origin feat/design-v3-foundations
gh pr create --title "feat(frontend): design system v3 foundations" --body "$(cat <<'EOF'
## Summary
- v3 two-theme OKLCH tokens (light warm / dark blue-ink) on Tailwind 4 @theme, single source src/design/tokens.css
- Theme resolution with persisted override (lib/theme.ts, unit-tested, not yet mounted)
- Contrast proof script parses tokens.css and gates CI (Quality job)
- Storybook: theme + font-candidate toolbars, foundations stories (Couleurs, Typographie, Espacement, Onde study, Lueur d'aube)
- Agent conventions in apps/frontend/CLAUDE.md
- App untouched — old design keeps running until screen migrations

Spec: docs/superpowers/specs/2026-07-20-design-system-v3-design.md

## Test plan
- [ ] CI green (4 required checks + new contrast step)
- [ ] Storybook checkpoint: Victor validates palette, typography candidate, wave direction, dawn glow

Generated with Claude Code
EOF
)"
```

- [ ] **Step 2: Checkpoint**

Do NOT merge. Report to Victor: Storybook checkpoint — palette (both themes), typography candidate (Inter vs Instrument Sans), wave thickness/density, dawn glow intensity. Plan 2 (primitives) is written only after his validation, which fixes the font choice and wave parameters.

---

## Self-Review (done at plan time)

- Spec coverage: §2 tokens (Task 2), theme mechanics (Task 3), conventions livrable (Task 6), §4-PR1 stories incl. wave study + glow (Task 5), §5 contrast-in-CI (Tasks 1, 7). §1 font decision deliberately deferred to the checkpoint — the toolbar makes the comparison. OK.
- Placeholders: none — every step carries full code or exact commands.
- Type consistency: `Theme`, `resolveTheme/applyTheme/initTheme/setTheme`, `THEME_STORAGE_KEY` used identically in Tasks 3 and later references; token names identical across script (Task 1), CSS (Task 2), stories (Task 5), conventions (Task 6).

```

```
