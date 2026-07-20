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
