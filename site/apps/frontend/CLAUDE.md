# Frontend — agent conventions (design system)

## Tailwind v4 — this project uses v4 syntax ONLY

- No `tailwind.config.js`, no `@tailwind base/components/utilities`, no `theme.extend`.
- Tokens live in `src/design/tokens.css` (`@theme inline`). New utilities via `@utility`, new variants via `@custom-variant`, in that file only.
- One style only: no dark theme, no `dark:` variant, no palette that changes with the time of day.

## Token vocabulary (the ONLY allowed colors)

`bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`,
`border-border`, `bg-accent`, `text-accent`, `text-on-accent`, utility `dawn-glow`.

- Never write hex/hsl/oklch values outside `src/design/tokens.css`.
- Never use arbitrary values for color, spacing, typography (`bg-[#fff]`, `p-[13px]`, `text-[17px]`).
- Typography: one family, Bricolage Grotesque (Fontsource, self-hosted: the CSP allows `font-src 'self'` only). Sizes: `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption` — nothing else.
- Radii: `rounded-sm`, `rounded-md`, `rounded-full` — nothing else.
- New token needed? Add it to `tokens.css`, add its pair to `scripts/check-contrast.mjs`, run the script.

## Non-negotiables

- `node scripts/check-contrast.mjs` passes (wired in CI Quality).
- Every interactive element: hover, focus-visible, active, disabled states; touch target ≥ 44px.
- Decorative motion only under `prefers-reduced-motion: no-preference`; 150–250ms; `ease-out-quart`.
- Never ship UI blind: before a UI PR, screenshot the real page at 1280 and 390 px wide (headless Chromium `--screenshot`) and look at it.
- Store-coupled components ship a presentational unit (props in) + a thin store container, so the unit is testable without stores.
