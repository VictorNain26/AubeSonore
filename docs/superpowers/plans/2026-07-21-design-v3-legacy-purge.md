# Design v3 — Legacy Purge Plan (4 short PRs)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans, one PR per branch, adversarial review before each merge.

**Goal:** Zero legacy design code left. Every component on `src/design/` tokens + primitives, `src/index.css` reduced to base layer consuming v3 tokens, legacy fonts and `src/components/ui/` removed.

**Decision (state colors):** No `danger`/`success` tokens are added. The v3 precedent is `TextField`: errors are expressed with `accent`. Destructive menu items and error toasts use `text-accent` / `border-accent`; success toasts need no color (plain `border-border`). This extends the "no alert-red" stance that removed the live badge.

**Decision (typography):** Per spec, single sans family. `body` switches to `var(--font-sans)`; Spectral/Young Serif imports and deps are removed in PR D. `@fontsource-variable/instrument-sans` STAYS (used by the Storybook `fonte` toolbar — candidate comparison still open).

**Reference mapping:** `text-ink`→`text-text` · `text-ink-soft`→`text-text-muted` · `text-ink-faint`→`text-text-faint` · `bg-paper`→`bg-surface` · `bg-paper-raised`→`bg-surface-raised` · `border-line`/`bg-line`→`border-border`/`bg-border` · `text-danger`→`text-accent` · `rule`→`border-t border-border` · `panel`→`rounded-md border border-border bg-surface-raised` (Menu popup pattern) · `skeleton`→`animate-pulse rounded-sm bg-surface-raised` (radius per shape) · `eyebrow`→`text-caption tracking-widest uppercase text-text-faint` · `font-display <h*>`→`text-title`/`text-display` · `ease-(--ease-snappy)`→`ease-out-quart` · `IconButton`→`Button variant="icon"` · `ModalShell`→`design/ui/Modal` (controlled) · `DropdownMenu`→`design/ui/Menu`.

Guard grep after each file: `grep -nE "\bink\b|ink-|paper|\bline\b|danger|success|rule|panel|skeleton|eyebrow|IconButton|ModalShell|DropdownMenu|font-display|ease-snappy" <file>` → zero (ignore data-testid and words like inline/online).

---

## PR A — `feat/design-v3-stationlog`

- `Player/StationLog.tsx`: `border-line`→`border-border`, `rule`→`border-t border-border`, `eyebrow`→v3 composite, `skeleton`→v3 pulse blocks, `text-ink-faint`→`text-text-faint`.
- `Player/StationLogRow.tsx`: full remap; liked heart `text-danger`→`text-accent` (same decision as TrackMeta in PR #117).
- Adapt colocated tests. Gates + commit `feat(frontend): station log on v3 tokens`.

## PR B — `feat/design-v3-modals-light`

- `AboutModal.tsx`: `ModalShell`→`Modal` v3 (controlled), token remaps.
- `ErrorFallback.tsx`: standalone (no modal) — `rule`→v3, `font-display`→`text-title`, tokens.
- `PWAInstallBanner.tsx`: `panel`→v3 composite, `ui/Button`→`design/ui/Button`, tokens.
- `layout/Layout.tsx`: `toast-success`→`border-l-2 border-border` v3 classes, `toast-danger`→`border-l-2 border-accent` (inline Tailwind via Sonner `toastOptions.classNames`, drop the CSS classes).
- Adapt tests. One commit per component.

## PR C — `feat/design-v3-auth-liked`

- `AuthModal.tsx` (heaviest): `ModalShell`→`Modal` v3, `ui/Button`→v3 `Button`, inputs→`design/ui/TextField` where the markup is a labeled input (keep behavior identical: validation au blur, autocomplete, aria), `rule` separators→`border-t border-border`, full token remap. `text-danger` error text→`text-accent`.
- `LikedTracksModal.tsx`: `ModalShell`→`Modal` v3, `DropdownMenu`→`design/ui/Menu`, `ui/Button`/`IconButton`→v3 `Button`, full token remap, `hover:text-danger`→`hover:text-accent`.
- Adapt both test files. Two commits.

## PR D — `chore/design-v3-legacy-removal`

Only after A–C are merged (verify with repo-wide guard grep first):

1. Delete `src/components/ui/` (Button, ModalShell, DropdownMenu + tests). Update `vitest.config.ts` exclude list (drop `src/components/ui/**` entry).
2. `src/index.css`: remove legacy alias vars (`--paper*`, `--ink*`, `--line`, `--color-paper*`, `--color-ink*`, `--color-line`, `--color-danger`, `--color-success`, `--ease-fluid`, `--ease-snappy`, `--font-text`, `--font-display`), utilities (`.rule`, `.panel`, `.skeleton`, `.eyebrow`, `.press-ink`, `.toast-*`), `@keyframes pulse-soft`. `body font-family`→`var(--font-sans)`. Rewrite `input[type='range']` block on `--border`/`--text` (native ranges may remain in mobile web contexts) or delete if unreferenced.
3. `src/main.tsx`: drop Spectral/Young Serif imports. `package.json`: remove `@fontsource/spectral`, `@fontsource/young-serif` (root pnpm-lock updated via `pnpm install`). Keep `@fontsource-variable/instrument-sans`.
4. Repo-wide final guard: `grep -rnE "ink-|paper|--line|danger|ModalShell|IconButton|DropdownMenu|font-display|Spectral|Young Serif|ease-snappy|ease-fluid" src/ --include="*.tsx" --include="*.ts" --include="*.css"` → zero real hits.
5. Full gates + 4 CDP screenshots (body font flips to Inter — visual check both themes, both viewports) presented before merge.

Each PR: `pnpm typecheck && pnpm lint && pnpm test --run --coverage && pnpm build && node scripts/check-contrast.mjs`, adversarial review, auto-merge on green, next PR branches from fresh master.
