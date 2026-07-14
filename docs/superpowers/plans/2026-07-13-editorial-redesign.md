# Refonte éditoriale lumineuse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'exécution visuelle rejetée (glassmorphism sombre) par un design éditorial lumineux piloté par un système de tokens unique, appliqué à toutes les surfaces, avec boucle de vérification visuelle Chrome DevTools MCP.

**Architecture:** Un système (tokens CSS + 4 primitives) est défini et validé sur une page dev-only `/dev/system` AVANT tout composant. Ensuite chaque surface est re-skinnée contre ce système, la logique (player, auth, likes, cast) restant intacte. Le fil-journée devient un rail horizontal de 8 pistes. GSAP et le dossier Sky/ sont supprimés.

**Tech Stack:** React 19, Vite 8, Tailwind 4 (`@theme`), `motion` (seule lib d'animation), Vitest + RTL + MSW, Chrome DevTools MCP pour la vérification visuelle.

**Spec:** `docs/superpowers/specs/2026-07-13-frontend-editorial-redesign-design.md`

## Global Constraints

- **Récit obligatoire (demande explicite de Victor)** : chaque élément visuel doit se justifier par le thème — le papier teinté par la lumière du moment, l'encre du magazine, la grande serif comme un titre de presse, le rail comme un bac à vinyles qu'on feuillette. Un choix visuel qui ne raconte rien est retiré. Chaque tâche de composant ci-dessous commence par sa phrase de récit ; l'implémenteur doit pouvoir la réciter.
- **Interdits absolus** : `backdrop-filter`/blur, surfaces translucides blanches (`bg-foreground/5` comme fond de carte), dégradés multi-stops saturés, grain, halo, text-shadow lumineux, plus d'une chose animée à la fois.
- Tokens uniquement : aucune couleur, taille de police ou espacement littéral dans un composant. Tout vient de `index.css` (`@theme`) via les classes Tailwind qu'il génère.
- Échelle typo : 5 tailles nommées seulement (`--text-caption`, `--text-body`, `--text-lead`, `--text-title`, `--text-display`).
- `motion` est la seule lib d'animation. Interdiction d'importer `gsap` ou `@gsap/react` (supprimés en Task 10). `motion-presets.ts` reste la source unique des durées/eases.
- Pas de nouvelle dépendance. Ne pas réintroduire les deps bannies par CLAUDE.md (react-router-dom, etc. — `/dev/system` se fait par test de `window.location.pathname`, pas par un router).
- Conventional Commits en anglais, staging explicite (`git add <fichier>`), jamais `--no-verify`.
- Avant chaque commit : `pnpm typecheck && pnpm lint` depuis la racine du monorepo.
- Vérification visuelle : chaque tâche UI se termine par des screenshots Chrome DevTools MCP aux 4 moments via `?moment=dawn|day|dusk|night`, comparés aux critères : hiérarchie typo, palette, rythme d'espacement, respect des interdits. 2–3 itérations max, puis jalon Victor le cas échéant.
- Les jalons Victor (tâches « CHECKPOINT ») suspendent l'exécution : présenter les screenshots, attendre validation explicite avant la tâche suivante.

## File Structure

```
apps/frontend/
  .mcp.json n'existe pas ici — la config MCP va dans /home/victormoi/AubeSonore/.mcp.json (racine repo)
  src/
    index.css                     — RÉÉCRIT : tokens papier/encre/accent × 4 moments, échelle typo, utilities
    lib/moments.ts                — MODIFIÉ : retrait SKY_STOPS ; ajout MOMENT_TAGLINES
    lib/recentTracks.ts           — CRÉÉ : takeRecent() (troncature/tri, pure)
    lib/dayTimeline.ts            — SUPPRIMÉ (dedupeBySongId déménage dans recentTracks.ts)
    hooks/useMoment.ts            — MODIFIÉ : override dev `?moment=`
    hooks/useDayHistory.ts        — RENOMMÉ hooks/useRecentHistory.ts (rows=24, plus de fenêtre 24h)
    pages/DevSystemPage.tsx       — CRÉÉ : page /dev/system (dev only)
    pages/HomePage.tsx            — MODIFIÉ : colonne éditoriale
    layout/Layout.tsx             — RÉÉCRIT : header/footer éditorial, sans Sky
    components/Sky/               — SUPPRIMÉ en entier
    components/Player/DayTimeline.tsx, HistoryItem.tsx — SUPPRIMÉS
    components/Player/RecentRail.tsx, RailCard.tsx     — CRÉÉS
    components/Player/* (reste)   — RE-SKINNÉS, logique intacte
    components/{AuthModal,LikedTracksModal,AboutModal,PWAInstallBanner,ErrorFallback}.tsx,
    components/ui/DropdownMenu.tsx — RE-SKINNÉS
```

---

### Task 1: Outillage visuel — Chrome DevTools MCP + override `?moment=`

Récit : « plus jamais à l'aveugle » — l'exécuteur voit ce qu'il livre, aux 4 heures de la journée, sans attendre l'heure réelle.

**Files:**

- Create: `/home/victormoi/AubeSonore/.mcp.json`
- Modify: `apps/frontend/src/hooks/useMoment.ts`
- Test: `apps/frontend/src/hooks/useMoment.test.ts` (existant, on ajoute un cas)

**Interfaces:**

- Produces: `useMoment(): Moment` inchangé pour les consommateurs ; en dev, `?moment=dawn|day|dusk|night` force la valeur.

- [ ] **Step 1: Créer la config MCP**

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest", "--headless", "--isolated"]
    }
  }
}
```

Écrire ce contenu dans `/home/victormoi/AubeSonore/.mcp.json`. (Si le fichier existe déjà, fusionner la clé `chrome-devtools` dans `mcpServers`.)

- [ ] **Step 2: Test qui échoue — override dev**

Ajouter à `apps/frontend/src/hooks/useMoment.test.ts` :

```ts
it('honors ?moment= override in dev', () => {
  vi.stubEnv('DEV', true);
  window.history.replaceState({}, '', '/?moment=dusk');
  const { result } = renderHook(() => useMoment());
  expect(result.current).toBe('dusk');
  expect(document.documentElement.dataset.moment).toBe('dusk');
  window.history.replaceState({}, '', '/');
});
```

(Reprendre les imports/helpers déjà présents dans ce fichier de test — il utilise `renderHook` de RTL et des fake timers.)

- [ ] **Step 3: Vérifier l'échec** — `cd apps/frontend && pnpm exec vitest run src/hooks/useMoment.test.ts` → FAIL (retourne le moment horloge, pas `dusk`).

- [ ] **Step 4: Implémenter l'override**

Dans `useMoment.ts`, ajouter avant le hook :

```ts
const FORCEABLE: readonly Moment[] = ['dawn', 'day', 'dusk', 'night'];

function forcedMoment(): Moment | null {
  if (!import.meta.env.DEV) return null;
  const raw = new URLSearchParams(window.location.search).get('moment');
  return FORCEABLE.includes(raw as Moment) ? (raw as Moment) : null;
}
```

Et dans le hook, remplacer le state initial et la fonction `arm` pour court-circuiter :

```ts
const [moment, setMoment] = useState<Moment>(() => forcedMoment() ?? getMoment(new Date()));

// dans arm():
const forced = forcedMoment();
setMoment(forced ?? getMoment(now));
```

- [ ] **Step 5: Vérifier le pass** — même commande vitest → PASS, et la suite `useMoment.test.ts` entière reste verte.

- [ ] **Step 6: Smoke test MCP** — lancer `pnpm --filter @aubesonore/frontend dev` en arrière-plan, puis via les outils MCP chrome-devtools : ouvrir `http://localhost:5173/?moment=dawn`, prendre un screenshot, vérifier dans le DOM que `document.documentElement.dataset.moment === 'dawn'`, lire la console (zéro erreur attendue). Arrêter le dev server.

- [ ] **Step 7: Commit**

```bash
git add .mcp.json apps/frontend/src/hooks/useMoment.ts apps/frontend/src/hooks/useMoment.test.ts
git commit -m "feat(frontend): dev moment override and Chrome DevTools MCP config"
```

---

### Task 2: Le système — réécriture de `index.css` + purge de `SKY_STOPS`

Récit : le site est un magazine imprimé sur un papier qui prend la couleur de la lumière du moment ; l'encre reste de l'encre, l'accent est la seule couleur vive et il appartient au moment.

**Files:**

- Modify: `apps/frontend/src/index.css` (réécriture complète)
- Modify: `apps/frontend/src/lib/moments.ts` (retrait `SKY_STOPS`, ajout `MOMENT_TAGLINES`)
- Test: `apps/frontend/src/lib/moments.test.ts`

**Interfaces:**

- Produces (classes Tailwind générées par `@theme`, utilisées par TOUTES les tâches suivantes) :
  - Couleurs : `bg-paper`, `bg-paper-raised`, `text-ink`, `text-ink-soft`, `text-ink-faint`, `border-line`, `bg-accent`, `text-accent`, `text-on-accent`, `text-danger`, `text-success`
  - Typo : `text-caption` (0.75rem), `text-body` (0.9375rem), `text-lead` (1.1875rem), `text-title` (1.75rem), `text-display` (clamp(2.25rem → 4.25rem)) ; `font-display` = Fraunces, `font-sans` = Inter
  - Radii : `rounded-sm|md|lg` (0.375/0.625/0.875rem)
  - Utilities CSS : `.rule` (filet), `.panel` (surface modale papier), `.skeleton`, `.sr-only-focusable`, `.pb-safe`, `.rail-mask`
  - `MOMENT_TAGLINES: Record<Moment, string>`

- [ ] **Step 1: Test qui échoue — moments.ts**

Dans `moments.test.ts`, supprimer tout test référençant `SKY_STOPS` et ajouter :

```ts
import { MOMENT_TAGLINES, MOMENT_ORDER } from './moments';

it('has a tagline for every moment', () => {
  for (const m of MOMENT_ORDER) {
    expect(MOMENT_TAGLINES[m]).toBeTruthy();
  }
});
```

- [ ] **Step 2: Vérifier l'échec** — `cd apps/frontend && pnpm exec vitest run src/lib/moments.test.ts` → FAIL (`MOMENT_TAGLINES` n'existe pas).

- [ ] **Step 3: Modifier `moments.ts`** — supprimer le bloc `SKY_STOPS` (lignes 26–32) et ajouter :

```ts
export const MOMENT_TAGLINES: Record<Moment, string> = {
  dawn: 'La lumière se lève sur ce qui était resté dans l’ombre.',
  day: 'Plein jour sur les morceaux qui le méritent.',
  dusk: 'La lumière descend, l’écoute se resserre.',
  night: 'La nuit veille sur les découvertes de demain.',
};
```

- [ ] **Step 4: Vérifier le pass** — même commande → PASS.

- [ ] **Step 5: Réécrire `index.css` intégralement**

```css
@import 'tailwindcss';

/* =============================================================================
   LE PAPIER DU MOMENT — le site est imprimé sur un papier qui prend la
   couleur de la lumière. Encre foncée, un seul accent, filets fins.
   Bornes horaires : lib/moments.ts.
   ============================================================================= */

:root,
[data-moment='night'] {
  /* Nuit — le seul moment sombre : papier encre profonde, texte ivoire, accent lunaire */
  --paper: hsl(240 18% 10%);
  --ink: hsl(40 30% 92%);
  --accent: hsl(230 45% 74%);
  --on-accent: hsl(240 18% 10%);
}

[data-moment='dawn'] {
  /* Aube — papier crème rosé, encre brune, accent corail doux */
  --paper: hsl(28 60% 94%);
  --ink: hsl(22 32% 16%);
  --accent: hsl(12 62% 50%);
  --on-accent: hsl(28 60% 96%);
}

[data-moment='day'] {
  /* Jour — blanc légèrement bleuté, encre presque noire, accent bleu profond */
  --paper: hsl(210 36% 97%);
  --ink: hsl(220 26% 12%);
  --accent: hsl(214 74% 38%);
  --on-accent: hsl(210 36% 97%);
}

[data-moment='dusk'] {
  /* Crépuscule — ivoire ambré, encre chaude, accent terracotta */
  --paper: hsl(36 48% 92%);
  --ink: hsl(18 34% 15%);
  --accent: hsl(16 70% 44%);
  --on-accent: hsl(36 48% 94%);
}

/* Dérivés — jamais redéfinis par moment, toujours calculés */
:root,
[data-moment] {
  --ink-soft: color-mix(in srgb, var(--ink) 62%, var(--paper));
  --ink-faint: color-mix(in srgb, var(--ink) 38%, var(--paper));
  --line: color-mix(in srgb, var(--ink) 16%, transparent);
  --paper-raised: color-mix(in srgb, var(--ink) 4%, var(--paper));
}

@theme {
  --color-*: initial;
  --color-paper: var(--paper);
  --color-paper-raised: var(--paper-raised);
  --color-ink: var(--ink);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-line: var(--line);
  --color-accent: var(--accent);
  --color-on-accent: var(--on-accent);
  --color-danger: hsl(0 62% 44%);
  --color-success: hsl(150 55% 32%);

  --text-*: initial;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1.4;
  --text-body: 0.9375rem;
  --text-body--line-height: 1.55;
  --text-lead: 1.1875rem;
  --text-lead--line-height: 1.45;
  --text-title: 1.75rem;
  --text-title--line-height: 1.2;
  --text-display: clamp(2.25rem, 5.5vw, 4.25rem);
  --text-display--line-height: 1.04;

  --radius-*: initial;
  --radius-sm: 0.375rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.875rem;

  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Fraunces Variable', Georgia, serif;
}

@layer base {
  body {
    background-color: var(--color-paper);
    color: var(--color-ink);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
    -webkit-font-smoothing: antialiased;
    transition:
      background-color 1200ms var(--ease-fluid),
      color 1200ms var(--ease-fluid);
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
    background: color-mix(in srgb, var(--ink) 30%, transparent);
    border-radius: 9999px;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
}

@layer utilities {
  /* Filet éditorial — la séparation se fait à l'encre, pas par des cartes */
  .rule {
    border-top: 1px solid var(--color-line);
  }

  /* Panneau papier — modales, dropdowns : papier levé + filet, AUCUN blur */
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

  /* Fondu des bords du rail horizontal */
  .rail-mask {
    mask-image: linear-gradient(
      to right,
      transparent,
      black 2rem,
      black calc(100% - 2rem),
      transparent
    );
  }

  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }

  .sr-only-focusable {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  .sr-only-focusable:focus-visible {
    position: fixed;
    top: 1rem;
    left: 1rem;
    width: auto;
    height: auto;
    padding: 0.5rem 1rem;
    margin: 0;
    overflow: visible;
    clip: auto;
    background: var(--color-paper-raised);
    color: var(--color-ink);
    border-radius: var(--radius-md);
    z-index: 9999;
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

/* Range slider — trait d'encre, poignée encre */
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

Notes d'implémentation : `--color-*: initial` et `--text-*: initial` purgent les palettes/tailles par défaut de Tailwind 4 — toute classe hors système devient inerte, c'est le garde-fou anti-dérive. La transition de `body` est LA bascule douce du papier au changement de moment (spec §5).

- [ ] **Step 6: Build de contrôle** — `pnpm --filter @aubesonore/frontend build` → succès attendu MAIS les composants existants référencent des classes mortes (`text-foreground`, `glass-strong`…) : c'est attendu, elles deviennent inertes visuellement sans casser le build. Vérifier seulement que la compilation CSS passe.

- [ ] **Step 7: Vérifier que rien n'importe SKY_STOPS** — `grep -rn "SKY_STOPS" apps/frontend/src/` → seuls des fichiers de `components/Sky/` peuvent apparaître (supprimés en Task 10 ; si `SkyBackground.tsx` casse le typecheck maintenant, remplacer son usage de `SKY_STOPS` par un tableau local temporaire — il vit jusqu'à la Task 5).

- [ ] **Step 8: Typecheck + tests** — `pnpm typecheck` (racine) et `cd apps/frontend && pnpm exec vitest run src/lib/moments.test.ts` → verts.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/index.css apps/frontend/src/lib/moments.ts apps/frontend/src/lib/moments.test.ts
git commit -m "feat(frontend): editorial paper/ink token system, drop SKY_STOPS"
```

---

### Task 3: Page `/dev/system` (dev only)

Récit : le nuancier du magazine — la page où le système se juge d'un coup d'œil, aux 4 moments, avant d'imprimer quoi que ce soit.

**Files:**

- Create: `apps/frontend/src/pages/DevSystemPage.tsx`
- Modify: `apps/frontend/src/App.tsx`

**Interfaces:**

- Consumes: classes du système (Task 2), `MOMENT_LABELS`, `MOMENT_TAGLINES`, `MOMENT_ORDER` de `lib/moments.ts`.
- Produces: route dev `http://localhost:5173/dev/system?moment=<m>`. Exclue du bundle prod (lazy + `import.meta.env.DEV`).

- [ ] **Step 1: Créer `DevSystemPage.tsx`**

```tsx
import { MOMENT_LABELS, MOMENT_ORDER, MOMENT_TAGLINES } from '../lib/moments';

const TYPE_SCALE = [
  { cls: 'text-display font-display', label: 'display / Fraunces' },
  { cls: 'text-title font-display', label: 'title / Fraunces' },
  { cls: 'text-lead', label: 'lead / Inter' },
  { cls: 'text-body', label: 'body / Inter' },
  { cls: 'text-caption', label: 'caption / Inter' },
] as const;

const SWATCHES = ['bg-paper', 'bg-paper-raised', 'bg-accent'] as const;
const INKS = ['text-ink', 'text-ink-soft', 'text-ink-faint', 'text-accent'] as const;

export default function DevSystemPage() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-12 space-y-12">
      <header className="space-y-1">
        <p className="text-caption tracking-widest uppercase text-ink-faint">/dev/system</p>
        <h1 className="text-title font-display">Le système</h1>
        <p className="text-body text-ink-soft">
          Ajouter ?moment=dawn|day|dusk|night à l’URL pour changer de papier.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-caption tracking-widest uppercase text-ink-faint">Moments</h2>
        {MOMENT_ORDER.map((m) => (
          <p key={m} className="text-body">
            <span className="font-display">{MOMENT_LABELS[m]}</span>
            <span className="text-ink-soft"> — {MOMENT_TAGLINES[m]}</span>
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-caption tracking-widest uppercase text-ink-faint">Typographie</h2>
        {TYPE_SCALE.map(({ cls, label }) => (
          <div key={label}>
            <p className={cls}>Aube sonore</p>
            <p className="text-caption text-ink-faint">{label}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-caption tracking-widest uppercase text-ink-faint">Encres & papiers</h2>
        <div className="flex gap-3">
          {SWATCHES.map((cls) => (
            <div key={cls} className={`h-16 w-24 rounded-md border border-line ${cls}`}>
              <span className="text-caption text-ink-faint">{cls}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {INKS.map((cls) => (
            <p key={cls} className={`text-body ${cls}`}>
              {cls} — Découverte musicale émergente
            </p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-caption tracking-widest uppercase text-ink-faint">Primitives</h2>
        <div className="flex items-center gap-3">
          <button className="rounded-md bg-accent px-4 py-2 text-body text-on-accent">
            Bouton plein
          </button>
          <button className="rounded-md border border-line px-4 py-2 text-body text-ink hover:bg-paper-raised">
            Bouton fantôme
          </button>
        </div>
        <p className="text-caption tracking-widest uppercase text-ink-soft">
          Crépuscule — 19h42 <span className="text-ink-faint">(badge moment)</span>
        </p>
        <div className="rule" />
        <div className="flex items-center gap-3 py-2">
          <div className="h-10 w-10 rounded-sm bg-paper-raised" />
          <div className="flex-1">
            <p className="text-body">Titre de piste</p>
            <p className="text-caption text-ink-soft">Artiste</p>
          </div>
          <span className="text-caption text-ink-faint">19h42</span>
        </div>
        <div className="panel max-w-xs p-4">
          <p className="text-body">Panneau papier (modales, menus)</p>
          <p className="text-caption text-ink-soft">Filet + ombre encre, zéro blur.</p>
        </div>
        <div className="skeleton h-10 w-40" />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Brancher dans `App.tsx`** (pas de router — deps bannies) :

```tsx
import { lazy, Suspense } from 'react';
// ...imports existants

const DevSystemPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DevSystemPage'))
  : null;

export default function App() {
  useMoment();
  if (DevSystemPage && window.location.pathname === '/dev/system') {
    return (
      <Suspense fallback={null}>
        <DevSystemPage />
      </Suspense>
    );
  }
  return (
    /* ...arbre existant inchangé... */
  );
}
```

- [ ] **Step 3: Vérification visuelle MCP** — dev server lancé, screenshots de `http://localhost:5173/dev/system?moment=dawn`, `?moment=day`, `?moment=dusk`, `?moment=night`. Contrôler : les 4 papiers distincts et doux (jamais criards), l'encre lisible partout, l'accent unique, la display Fraunces qui a du caractère, l'échelle d'espacement régulière. Console : zéro erreur. Itérer sur les valeurs HSL de `index.css` si un papier vire au criard ou si un contraste est faible (viser AA : ratio ≥ 4.5 pour text-body sur paper) — 2–3 itérations max.

- [ ] **Step 4: Vérifier l'exclusion prod** — `pnpm --filter @aubesonore/frontend build && grep -rl "dev/system" apps/frontend/dist/assets/ || echo "OK absent du bundle"` → OK attendu.

- [ ] **Step 5: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add apps/frontend/src/pages/DevSystemPage.tsx apps/frontend/src/App.tsx
git commit -m "feat(frontend): dev-only /dev/system design reference page"
```

---

### Task 4: CHECKPOINT ① — Validation du système par Victor

- [ ] Présenter à Victor les 4 screenshots de `/dev/system` (un par moment) avec deux phrases : ce que chaque papier raconte, et où sont les primitives. **Attendre sa validation explicite.** S'il demande des ajustements : modifier les tokens dans `index.css` uniquement (jamais dans la page), re-screenshoter, re-présenter. Ne pas passer à la Task 5 sans accord.

---

### Task 5: Layout — header, footer, structure de page

Récit : la une du magazine — le wordmark comme un titre de presse, le moment et sa devise en exergue, et rien d'autre qui parle.

**Files:**

- Modify: `apps/frontend/src/layout/Layout.tsx` (réécriture du rendu, logique conservée)
- Modify: `apps/frontend/src/pages/HomePage.tsx`

**Interfaces:**

- Consumes: `useMoment()` (App pose `data-moment`), `MOMENT_LABELS`/`MOMENT_TAGLINES`, stores auth existants, `DropdownMenu` (re-skinné Task 9 — l'utiliser tel quel ici).
- Produces: structure `header / main#main / footer` que HomePage remplit ; le badge moment vit dans le header (le `MomentBadge` du player est supprimé en Task 6).

- [ ] **Step 1: Réécrire le rendu de `Layout.tsx`** — conserver intégralement : le hook auth, `readResetTokenFromUrl` + l'effet reset-password, le state `isAboutOpen`, le lazy `AboutModal`, le skip-link, le `Toaster`. Supprimer : les imports et rendus `SkyBackground` / `CoverTint`, le `text-shadow` halo, tout `bg-foreground/*` et `border-foreground/*`. Nouveau rendu (mêmes handlers) :

```tsx
return (
  <div className="min-h-dvh flex flex-col bg-paper text-ink">
    <a href="#main" className="sr-only-focusable">
      Aller au contenu principal
    </a>

    <Toaster
      position="bottom-center"
      duration={3000}
      toastOptions={{
        classNames: {
          toast: 'panel !text-ink !text-body',
          description: '!text-ink-soft',
          success: '!border-l-2 !border-l-[var(--color-success)]',
          error: '!border-l-2 !border-l-[var(--color-danger)]',
        },
      }}
    />

    <header className="mx-auto w-full max-w-[640px] px-6 pt-8 pb-4 flex items-start justify-between">
      <div>
        <p className="font-display text-lead tracking-tight">AubeSonore</p>
        <MomentLine />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsAboutOpen(true)}
          className="p-2 rounded-md text-ink-faint hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer"
          title="À propos"
        >
          <Info className="w-4 h-4" />
        </button>
        {/* bloc auth existant : bouton Connexion → classes
            'rounded-md border border-line px-3 py-1.5 text-body text-ink-soft hover:text-ink hover:bg-paper-raised transition-colors cursor-pointer'
            avatar → 'h-7 w-7 rounded-full bg-paper-raised text-caption text-ink' ;
            le DropdownMenu garde sa structure, ses classes viennent de Task 9 */}
      </div>
    </header>

    <main id="main" className="flex-1 flex flex-col">
      {children}
    </main>

    <footer className="mx-auto w-full max-w-[640px] px-6 py-6">
      <div className="rule mb-4" />
      <p className="text-caption text-ink-faint tracking-widest">
        AubeSonore — Découverte musicale émergente
      </p>
    </footer>

    {/* AboutModal Suspense inchangé */}
  </div>
);
```

Avec, dans le même fichier, la ligne du moment (l'horloge du magazine) :

```tsx
function MomentLine() {
  const moment = useMoment();
  const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date()
  );
  return (
    <p className="text-caption tracking-widest uppercase text-ink-soft">
      {MOMENT_LABELS[moment]} <span className="text-ink-faint">— {time}</span>
    </p>
  );
}
```

(`useMoment` est déjà appelé dans App pour poser `data-moment` ; le rappeler ici ne crée qu'un second timer trivial — acceptable, YAGNI sur un contexte. Les liens sociaux `href="#"` du footer actuel sont supprimés : un lien mort ne raconte rien.)

- [ ] **Step 2: `HomePage.tsx`** — remplacer le wrapper :

```tsx
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 px-6 py-6">
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Player />
      </ErrorBoundary>
      <PlayerSideEffects />
    </div>
  );
}
```

- [ ] **Step 3: Retirer `theme="dark"`** du Toaster (fait dans le JSX ci-dessus — le panel suit le papier).

- [ ] **Step 4: Vérification** — `pnpm typecheck && pnpm lint` ; `cd apps/frontend && pnpm exec vitest run` (suites Layout si existantes). Screenshots MCP de `/?moment=day` et `/?moment=night` : header/footer éditoriaux, plus aucun ciel — le player au centre est encore en vieux style, c'est attendu jusqu'à Task 6.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/layout/Layout.tsx apps/frontend/src/pages/HomePage.tsx
git commit -m "feat(frontend): editorial layout header/footer, drop sky layers"
```

---

### Task 6: La scène — re-skin du Player (composition, artwork, meta, contrôles)

Récit : la pleine page du magazine — l'œuvre en photo nette, le titre en très grande serif comme une manchette, les contrôles en une ligne d'outils discrets sous l'article.

**Files:**

- Modify: `apps/frontend/src/components/Player/index.tsx`
- Modify: `apps/frontend/src/components/Player/TrackArtwork.tsx`
- Modify: `apps/frontend/src/components/Player/TrackMeta.tsx`
- Modify: `apps/frontend/src/components/Player/Timeline.tsx`, `WaveformCanvas.tsx`, `ElapsedReadout.tsx`
- Modify: `apps/frontend/src/components/Player/PlaybackControls.tsx`, `SecondaryControls.tsx`, `VolumeControl.tsx`, `SleepTimer.tsx`, `CastButton.tsx`, `LibraryButton.tsx`, `ListenersBadge.tsx`, `ArtistContext.tsx`
- Delete: `apps/frontend/src/components/Player/MomentBadge.tsx` (le moment vit dans le header depuis Task 5)

**Interfaces:**

- Consumes: stores existants (`useNowPlayingStore`, etc.) — AUCUN changement de logique, de props ou de hooks. `motion-presets.ts` inchangé.
- Produces: `Player` rend la scène + `<RecentRail />` en dernier enfant (créé Task 7 — laisser un commentaire `{/* RecentRail: Task 7 */}` à sa place pour l'instant).

Règles de conversion systématiques (à appliquer dans CHAQUE fichier de cette tâche) :

| Ancien                                                  | Nouveau                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `text-foreground`                                       | `text-ink`                                                             |
| `text-foreground/50`–`/70`                              | `text-ink-soft`                                                        |
| `text-foreground/25`–`/40`                              | `text-ink-faint`                                                       |
| `bg-foreground/5`, `bg-foreground/10` (fonds de bouton) | `hover:bg-paper-raised` (repos transparent)                            |
| `border-foreground/10`, bordures glass                  | `border-line`                                                          |
| `glass-strong`, `backdrop-blur*`                        | `panel` (si surface flottante) sinon suppression                       |
| `rounded-full` sur boutons rectangulaires               | `rounded-md` (les boutons-icônes ronds restent ronds)                  |
| tailles arbitraires `text-xs/sm/lg…`                    | la classe de l'échelle la plus proche (`text-caption/body/lead/title`) |
| toute couleur littérale (`hsl(...)`, hex)               | token équivalent                                                       |

- [ ] **Step 1: `Player/index.tsx`** — supprimer les imports `MomentBadge` et `DayTimeline` ; nouvelle composition (skeleton conservé, converti aux tokens) :

```tsx
return (
  <div className="w-full">
    <div className="flex flex-col items-start gap-6">
      <TrackArtwork />
      <TrackMeta />
    </div>
    <Timeline />
    <div className="mt-4 flex items-center">
      <SecondaryControls />
      <PlaybackControls />
      <div className="flex-1 flex justify-end items-center gap-2">
        <LibraryButton />
        <ListenersBadge />
      </div>
    </div>
    <ArtistContext />
    {/* RecentRail: Task 7 */}
  </div>
);
```

L'artwork passe à gauche/haut de colonne (alignement éditorial, plus de centrage systématique) : `TrackArtwork` rend une image `w-full max-w-[280px] rounded-lg` nette — supprimer dans `TrackArtwork.tsx` toute couche de blur/glow/reflet derrière l'image (le fichier fait 171 lignes : ne garder que le chargement d'image, le fallback icône `Music` sur `bg-paper-raised`, et le crossfade `motion` au changement de piste avec le preset `trackFlip`).

- [ ] **Step 2: `TrackMeta.tsx`** — la manchette. Supprimer TOUT usage de `gsap`/`SplitText` (le fichier en importe). Rendu cible :

```tsx
<div className="min-w-0">
  <motion.h2
    key={shId}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={trackFlip}
    className="font-display text-display text-ink [text-wrap:balance]"
  >
    {title}
  </motion.h2>
  <p className="mt-2 text-lead text-ink-soft">{artist}</p>
</div>
```

(Conserver les données/props/stores existants du fichier ; seul le rendu et l'animation changent — un seul élément animé : le titre.)

- [ ] **Step 3: Timeline / Waveform / ElapsedReadout** — la waveform devient un trait d'encre : dans `WaveformCanvas.tsx`, remplacer la/les couleurs de dessin par `getComputedStyle(document.documentElement).getPropertyValue('--ink')` avec alpha bas (barres passées : alpha 0.9 via la couleur `--accent` ; barres à venir : `--ink` à ~25%). Hauteur réduite (`h-8`). `ElapsedReadout` : `text-caption text-ink-faint tabular-nums`.

- [ ] **Step 4: Contrôles** (PlaybackControls, SecondaryControls, VolumeControl, SleepTimer, CastButton, LibraryButton, ListenersBadge) — appliquer la table de conversion. Le bouton play : `h-14 w-14 rounded-full bg-accent text-on-accent hover:opacity-90` — c'est LE seul aplat d'accent de la scène (le geste central). Retirer `animate-pulse-ring` (le halo pulsé ne raconte plus rien) et sa keyframe si plus utilisée. Les popovers (volume, sleep timer) passent en `panel`.

- [ ] **Step 5: `ArtistContext.tsx`** — bloc texte éditorial : `rule` au-dessus, `text-body text-ink-soft`, titre de section `text-caption tracking-widest uppercase text-ink-faint`.

- [ ] **Step 6: Supprimer `MomentBadge.tsx`** — `git rm apps/frontend/src/components/Player/MomentBadge.tsx` + retirer ses tests s'il en a (`ls apps/frontend/src/components/Player/*.test.*`).

- [ ] **Step 7: Vérification** — `pnpm typecheck && pnpm lint && cd apps/frontend && pnpm exec vitest run` → verts (adapter les tests player qui assertaient des classes supprimées, sans toucher aux assertions de comportement). Grep de contrôle des interdits :

```bash
grep -rn "backdrop-blur\|glass\|text-foreground\|bg-foreground" apps/frontend/src/components/Player/ && echo "ÉCHEC: résidus v1" || echo OK
```

- [ ] **Step 8: Screenshots MCP** — `/?moment=dawn|day|dusk|night` : manchette serif dominante, un seul accent (le play), artwork net, waveform discrète. 2–3 itérations.

- [ ] **Step 9: Commit**

```bash
git add -A apps/frontend/src/components/Player/
git commit -m "feat(frontend): editorial player scene, drop MomentBadge and GSAP usage"
```

---

### Task 7: CHECKPOINT ② — La scène, puis `RecentRail` + `RailCard`

Récit du rail : le bac à vinyles du disquaire — on feuillette du bout des doigts ce qui vient de passer, les pochettes s'inclinent sous le geste.

- [ ] **Step 0: CHECKPOINT ② — présenter les screenshots de la scène (Task 6) à Victor, attendre validation avant de continuer.**

**Files:**

- Create: `apps/frontend/src/lib/recentTracks.ts` + `apps/frontend/src/lib/recentTracks.test.ts`
- Rename: `apps/frontend/src/hooks/useDayHistory.ts` → `useRecentHistory.ts` (+ test)
- Create: `apps/frontend/src/components/Player/RecentRail.tsx`, `RailCard.tsx`
- Modify: `apps/frontend/src/components/Player/index.tsx` (brancher le rail)
- Delete: `apps/frontend/src/lib/dayTimeline.ts`, `dayTimeline.test.ts`, `components/Player/DayTimeline.tsx`, `HistoryItem.tsx`, `hooks/useDayHistory.test.ts`

**Interfaces:**

- Consumes: `SongEntry` de `lib/azuracast`, `useLikeAction`, `isTrackLiked`, `shareTrack`/`getTrackShareUrl` (mêmes appels que l'ancien DayTimeline — reprendre le corps de `handleShare` existant à l'identique).
- Produces: `takeRecent(entries: SongEntry[], n: number): SongEntry[]` (dédupliqué par `sh_id`, trié `played_at` décroissant, tronqué à n) ; `useRecentHistory(): { entries: SongEntry[]; isLoading: boolean; error: string | null }` ; `<RecentRail />` sans props.

- [ ] **Step 1: Test qui échoue — `recentTracks.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { takeRecent } from './recentTracks';
import type { SongEntry } from './azuracast';

const entry = (sh_id: number, played_at: number): SongEntry =>
  ({
    sh_id,
    played_at,
    song: { id: String(sh_id), title: `t${sh_id}`, artist: 'a', art: '' },
  }) as SongEntry;

describe('takeRecent', () => {
  it('sorts newest first and truncates', () => {
    const out = takeRecent([entry(1, 100), entry(2, 300), entry(3, 200)], 2);
    expect(out.map((e) => e.sh_id)).toEqual([2, 3]);
  });
  it('dedupes by sh_id keeping first occurrence', () => {
    const out = takeRecent([entry(1, 300), entry(1, 300), entry(2, 100)], 8);
    expect(out).toHaveLength(2);
  });
  it('returns empty for empty input', () => {
    expect(takeRecent([], 8)).toEqual([]);
  });
});
```

(Si le cast `as SongEntry` ne satisfait pas le schéma, reprendre le helper de fixture de `dayTimeline.test.ts` existant avant sa suppression.)

- [ ] **Step 2: Vérifier l'échec** — `cd apps/frontend && pnpm exec vitest run src/lib/recentTracks.test.ts` → FAIL (module absent).

- [ ] **Step 3: Implémenter `recentTracks.ts`** (reprendre `dedupeBySongId` depuis `dayTimeline.ts` : si son identité de dédup est `song.id`, la conserver telle quelle et déduper par cette même clé — adapter alors le test du Step 1 à la clé réelle) :

```ts
import type { SongEntry } from './azuracast';

export function takeRecent(entries: SongEntry[], n: number): SongEntry[] {
  const seen = new Set<number>();
  const unique = entries.filter((e) => {
    if (seen.has(e.sh_id)) return false;
    seen.add(e.sh_id);
    return true;
  });
  return unique.sort((a, b) => b.played_at - a.played_at).slice(0, n);
}
```

- [ ] **Step 4: Vérifier le pass** — même commande → PASS.

- [ ] **Step 5: `useRecentHistory.ts`** — renommer `useDayHistory.ts`, changer `rows=120` → `rows=24`, supprimer la fenêtre 24h (`DAY_SECONDS`/cutoff) et `dedupeBySongId`, retourner :

```ts
const entries = useMemo(
  () => takeRecent([...(liveSongHistory ?? []), ...fetched], 8),
  [liveSongHistory, fetched]
);
```

Créer `useRecentHistory.test.ts` sur le modèle de `useDayHistory.test.ts` (MSW) : vérifie 8 max, ordre décroissant, état d'erreur réseau. Supprimer l'ancien hook + test.

- [ ] **Step 6: `RailCard.tsx`**

```tsx
import { memo, useState } from 'react';
import { Music, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongEntry } from '../../lib/azuracast';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface RailCardProps {
  entry: SongEntry;
  isLiked: boolean;
  isLiking: boolean;
  onToggle: () => void;
  onShare: () => void;
}

export const RailCard = memo(function RailCard({
  entry,
  isLiked,
  isLiking,
  onToggle,
  onShare,
}: RailCardProps) {
  const [imgError, setImgError] = useState(false);
  return (
    <div role="listitem" className="group w-[132px] shrink-0 snap-start">
      <div className="relative h-[132px] w-[132px] overflow-hidden rounded-md bg-paper-raised">
        {entry.song.art && !imgError ? (
          <img
            src={entry.song.art}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <Music className="absolute inset-0 m-auto h-6 w-6 text-ink-faint" />
        )}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex justify-end gap-1 p-1.5',
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity'
          )}
        >
          <button
            onClick={onShare}
            className="rounded-md bg-paper p-1.5 text-ink-soft hover:text-ink cursor-pointer"
            aria-label="Partager"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            disabled={isLiking}
            aria-pressed={isLiked}
            aria-label={isLiked ? 'Retirer de ma bibliothèque' : 'Ajouter à ma bibliothèque'}
            className={cn(
              'rounded-md bg-paper p-1.5 cursor-pointer',
              isLiked ? 'text-danger' : 'text-ink-soft hover:text-danger',
              isLiking && 'animate-pulse pointer-events-none'
            )}
          >
            <Heart className={cn('h-3.5 w-3.5', isLiked && 'fill-current')} />
          </button>
        </div>
      </div>
      <p className="mt-2 truncate text-body text-ink">{entry.song.title}</p>
      <p className="truncate text-caption text-ink-soft">{entry.song.artist}</p>
      <p className="text-caption text-ink-faint">
        {timeFormatter.format(new Date(entry.played_at * 1000))}
      </p>
    </div>
  );
});
```

(Sur mobile, sans hover : les actions restent accessibles au focus (`group-focus-within`) et un tap sur la carte donne le focus — pas d'état "tap" supplémentaire, YAGNI.)

- [ ] **Step 7: `RecentRail.tsx`** — le geste du bac à vinyles :

```tsx
import { useRef, type WheelEvent } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, useVelocity } from 'motion/react';
import { toast } from 'sonner';
import { useRecentHistory } from '../../hooks/useRecentHistory';
import { useLikedTracksStore, isTrackLiked } from '../../stores/likedTracksStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { useLikeAction } from '../../hooks/player/useLikeAction';
import { getTrackShareUrl } from '@aubesonore/core/share';
import { shareTrack } from '../../lib/shareTrack';
import { getMoment, MOMENT_SHARE_PHRASES } from '../../lib/moments';
import { RailCard } from './RailCard';
import type { SongEntry } from '../../lib/azuracast';

export function RecentRail() {
  const { entries, isLoading, error } = useRecentHistory();
  const tracks = useLikedTracksStore((s) => s.tracks);
  const preferences = usePreferencesStore((s) => s.preferences);
  const { likingTrackId, toggleLike } = useLikeAction();
  const prefersReduced = useReducedMotion();

  const railRef = useRef<HTMLDivElement>(null);
  const { scrollX } = useScroll({ container: railRef });
  const velocity = useVelocity(scrollX);
  // Le geste incline les pochettes : ±4° max, comme des disques qu'on feuillette.
  const tilt = useTransform(velocity, [-1500, 0, 1500], [4, 0, -4], { clamp: true });

  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!railRef.current || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    railRef.current.scrollLeft += e.deltaY;
  };

  const handleShare = (entry: SongEntry) => {
    /* reprendre à l'identique le corps de handleShare de l'ancien DayTimeline.tsx
       (recherche du likedTrack, getTrackShareUrl, shareTrack + toasts) */
  };

  if (isLoading && entries.length === 0) {
    return (
      <section className="mt-10">
        <div className="rule mb-4" />
        <div className="flex gap-4">
          <div className="skeleton h-[132px] w-[132px]" />
          <div className="skeleton h-[132px] w-[132px]" />
          <div className="skeleton h-[132px] w-[132px]" />
        </div>
      </section>
    );
  }
  if (entries.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="rule mb-4" />
      <h3 className="mb-3 text-caption tracking-widest uppercase text-ink-faint">
        Vient de passer
      </h3>
      {error && (
        <p className="mb-2 text-caption text-ink-faint">
          Historique partiel — actualisation impossible pour le moment.
        </p>
      )}
      <div
        ref={railRef}
        role="list"
        onWheel={prefersReduced ? undefined : onWheel}
        className="rail-mask -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2"
      >
        {entries.map((entry) => (
          <motion.div key={entry.sh_id} style={prefersReduced ? undefined : { rotate: tilt }}>
            <RailCard
              entry={entry}
              isLiked={isTrackLiked(tracks, entry.song.title, entry.song.artist)}
              isLiking={likingTrackId === `${entry.song.title}-${entry.song.artist}`}
              onToggle={() => void toggleLike(entry.song.title, entry.song.artist, entry.song.art)}
              onShare={() => handleShare(entry)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Brancher** — dans `Player/index.tsx`, remplacer `{/* RecentRail: Task 7 */}` par `<RecentRail />` (+ import). Supprimer les fichiers morts :

```bash
git rm apps/frontend/src/components/Player/DayTimeline.tsx apps/frontend/src/components/Player/HistoryItem.tsx \
  apps/frontend/src/lib/dayTimeline.ts apps/frontend/src/lib/dayTimeline.test.ts \
  apps/frontend/src/hooks/useDayHistory.ts apps/frontend/src/hooks/useDayHistory.test.ts 2>/dev/null; true
```

(`useDayHistory.ts` n'existe plus si le rename du Step 5 est passé par `git mv` — adapter.) Vérifier qu'aucun import ne pend : `grep -rn "DayTimeline\|useDayHistory\|dayTimeline\|HistoryItem" apps/frontend/src/` → vide.

- [ ] **Step 9: Tests + vérification visuelle** — `pnpm exec vitest run` (frontend) vert ; screenshots MCP : rail sous filet, fondu des bords, drag → inclinaison subtile ; `?moment=night` lisible. Vérifier reduced-motion (émuler via MCP ou DevTools) : scroll natif simple, zéro tilt.

- [ ] **Step 10: Commit + CHECKPOINT ③** —

```bash
git add -A apps/frontend/src
git commit -m "feat(frontend): recent-tracks horizontal rail replaces day timeline"
```

Présenter les screenshots du rail à Victor, attendre validation.

---

### Task 8: Modales — AuthModal, LikedTracksModal, AboutModal

Récit : des encarts du même magazine — un panneau de papier posé sur la page, filet et ombre d'encre, jamais une vitre.

**Files:**

- Modify: `apps/frontend/src/components/AuthModal.tsx` (454 l.), `LikedTracksModal.tsx` (390 l.), `AboutModal.tsx` (139 l.)
- Tests existants: `AuthModal.test.tsx` — les assertions de comportement doivent rester vertes telles quelles.

**Interfaces:**

- Consumes: `.panel`, tokens, `modal` preset de `motion-presets.ts`. Radix Dialog reste la mécanique.

- [ ] **Step 1:** Dans chacun des trois fichiers, appliquer la table de conversion de la Task 6, plus : conteneur Radix `Content` → `panel w-full max-w-md p-6` (LikedTracks: `max-w-lg`) ; overlay → `bg-ink/20` (voile d'encre, PAS de backdrop-blur) ; titres de modale → `font-display text-title` ; champs de formulaire → `rounded-md border border-line bg-paper px-3 py-2 text-body text-ink placeholder:text-ink-faint focus-visible:outline-accent` ; bouton primaire → `bg-accent text-on-accent`, secondaire → `border border-line text-ink hover:bg-paper-raised` ; liens/actions tertiaires → `text-accent hover:underline`.
- [ ] **Step 2:** `LikedTracksModal` : les lignes de pistes reprennent exactement la primitive « ligne de piste » de `/dev/system` (vignette `rounded-sm bg-paper-raised`, `text-body` + `text-caption text-ink-soft`, heure `text-ink-faint`). Le bouton export → bouton fantôme.
- [ ] **Step 3:** Vérification : `pnpm exec vitest run src/components/AuthModal.test.tsx` PASS sans modifier les assertions de comportement ; grep interdits sur les 3 fichiers (même commande que Task 6 Step 7) → OK ; screenshots MCP des 3 modales ouvertes en `?moment=day` et `?moment=night`.
- [ ] **Step 4: Commit** — `git add` des 3 fichiers, `git commit -m "feat(frontend): paper-panel restyle for auth, liked-tracks and about modals"`.

---

### Task 9: Surfaces secondaires — DropdownMenu, PWAInstallBanner, ErrorFallback

Récit : même les marges du magazine sont composées — le menu est un encart papier, la bannière une note de bas de page, l'erreur un erratum sobre.

**Files:**

- Modify: `apps/frontend/src/components/ui/DropdownMenu.tsx`, `PWAInstallBanner.tsx`, `ErrorFallback.tsx`

- [ ] **Step 1:** `DropdownMenu.tsx` — `Content` → `panel min-w-[8rem] p-1` ; `Item` → `rounded-sm px-3 py-2 text-body text-ink data-[highlighted]:bg-paper-raised` ; variante `intent="danger"` → `text-danger` ; `Separator` → `my-1 h-px bg-line`.
- [ ] **Step 2:** `PWAInstallBanner.tsx` — conteneur `panel` en bas d'écran, texte `text-body`, action `text-accent`, dismiss `text-ink-faint`.
- [ ] **Step 3:** `ErrorFallback.tsx` — bloc centré : `rule`, `font-display text-title` (« La lecture s'est interrompue »), `text-body text-ink-soft`, bouton fantôme « Réessayer ».
- [ ] **Step 4:** Vérification : grep interdits sur les 3 fichiers → OK ; `pnpm exec vitest run src/components/ErrorFallback.test.tsx` PASS ; screenshot MCP du dropdown ouvert (menu compte) en `?moment=dusk`.
- [ ] **Step 5: Commit** — `git commit -m "feat(frontend): editorial restyle for dropdown, PWA banner and error fallback"`.

---

### Task 10: Purge — Sky/, GSAP, classes mortes

Récit : on retire de la page tout ce qui ne raconte plus rien.

**Files:**

- Delete: `apps/frontend/src/components/Sky/` (SkyBackground.tsx, CoverTint.tsx, useSkyChoreography.ts, useScrollSky.ts, sky.css + tests)
- Modify: `apps/frontend/package.json` (retrait `gsap`, `@gsap/react`)
- Modify: `apps/frontend/src/index.css` si des keyframes/utilities ne sont plus référencées

- [ ] **Step 1:** `git rm -r apps/frontend/src/components/Sky/` puis `grep -rn "Sky\|CoverTint\|sky.css" apps/frontend/src/` → vide (Layout nettoyé en Task 5).
- [ ] **Step 2:** Retirer les deps : `cd apps/frontend && pnpm remove gsap @gsap/react`. Vérifier : `grep -rn "gsap" apps/frontend/src/ apps/frontend/package.json` → vide.
- [ ] **Step 3:** Chasse aux classes mortes : `grep -rn "animate-pulse-ring\|glass\|text-foreground\|bg-foreground\|border-foreground\|--halo\|--sky-" apps/frontend/src/` → vide ; retirer de `index.css` toute utility/keyframe que ce grep révèle comme orpheline.
- [ ] **Step 4:** `pnpm typecheck && pnpm lint && pnpm --filter @aubesonore/frontend test -- --run` → tout vert. `pnpm --filter @aubesonore/frontend build` → succès.
- [ ] **Step 5:** Bundle : ouvrir le rapport du visualizer (`rollup-plugin-visualizer` déjà configuré) et confirmer l'absence de chunk gsap ; noter la taille totale avant/après dans le message de commit.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore(frontend): remove Sky layer, GSAP and dead v1 styles"`.

---

### Task 11: CHECKPOINT ④+⑤ — Contraste, page complète aux 4 moments, validation finale

- [ ] **Step 1: Contraste AA** — via MCP, sur `/dev/system` à chaque moment, échantillonner les couples (ink/paper, ink-soft/paper, on-accent/accent) et vérifier ratio ≥ 4.5:1 (calcul WCAG sur les valeurs HSL de `index.css` — un petit script node dans le scratchpad suffit). Corriger les tokens si un couple échoue.
- [ ] **Step 2: Web-vitals + console** — page d'accueil en prod build (`pnpm --filter @aubesonore/frontend preview`) : console propre, pas de layout shift visible au chargement (screenshot avant/après le settle).
- [ ] **Step 3: Screenshots finaux** — page complète (header, scène, rail, footer) aux 4 moments + les 3 modales + dropdown. Présenter le tout à Victor : **validation finale**.
- [ ] **Step 4:** À validation, merger la branche spec (`docs/editorial-redesign-spec`) si pas déjà fait, pousser la branche de travail et ouvrir la PR (titre : `feat(frontend): editorial light redesign`), corps résumant spec + jalons validés, trailer 🤖 conforme.

---

## Self-Review (fait à l'écriture)

- **Couverture spec** : §1 direction+interdits → Tasks 2/6/8/9 + grep interdits ; §2 système → Task 2 ; §3 page → Tasks 5/6 ; §4 rail → Task 7 ; §5 motion/GSAP → Tasks 6/10 ; §6 inventaire → Tasks 5–9 (chaque surface nommée) ; §7 boucle visuelle → Task 1 + steps MCP partout + checkpoints ①②③④⑤ (Tasks 4, 6→7, 7, 11) ; §8 perf/a11y → Tasks 10/11 ; §9 tests → Tasks 1/2/7 + suites existantes.
- **Types** : `takeRecent(entries, n)` défini Task 7 Step 3 = consommé Step 5 ; `useRecentHistory` retourne la même forme que l'ancien hook ; noms de classes (`panel`, `rule`, `rail-mask`, échelle typo) définis Task 2 = consommés Tasks 3/5/6/7/8/9.
- **Placeholders** : le corps de `handleShare` (Task 7) référence explicitement le code source existant à reprendre à l'identique (DayTimeline.tsx lignes 36–62 avant suppression) — copie, pas invention.
