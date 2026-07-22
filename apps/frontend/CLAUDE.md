# Frontend — agent conventions (design system)

## Tailwind v4 — this project uses v4 syntax ONLY

- No `tailwind.config.js`, no `@tailwind base/components/utilities`, no `theme.extend`.
- Tokens live in `src/design/tokens.css` (`@theme inline`). New utilities via `@utility`, new variants via `@custom-variant`, in that file only.
- Dark mode = `data-theme="dark"` attribute (variant `dark:`), never the `.dark` class, never `prefers-color-scheme` directly in component CSS.

## Token vocabulary (the ONLY allowed colors)

`bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`,
`border-border`, `bg-accent`, `text-accent`, `text-on-accent`, utility `dawn-glow`.

- Never write hex/hsl/oklch values outside `src/design/tokens.css`.
- Never use arbitrary values for color, spacing, typography (`bg-[#fff]`, `p-[13px]`, `text-[17px]`).
- Typography families: default body = Inter (`font-sans`, implicite via `<body>`); headings & section kickers = `font-display` (Instrument Sans), appliqué sur `text-display`, `text-title`, et le libellé de section (kicker uppercase, ex. « Vient de passer »).
- Typography: `text-display`, `text-title`, `text-lead`, `text-body`, `text-caption` — nothing else.
- Radii: `rounded-sm`, `rounded-md`, `rounded-full` — nothing else.
- New token needed? Add it to both theme blocks in `tokens.css`, add its pair to `scripts/check-contrast.mjs`, run the script.

## Non-negotiables

- `node scripts/check-contrast.mjs` passes (wired in CI Quality).
- Every interactive element: hover, focus-visible, active, disabled states; touch target ≥ 44px.
- Decorative motion only under `prefers-reduced-motion: no-preference`; 150–250ms; `ease-out-quart`.
- Storybook story colocated for every `atoms/`, `molecules/`, `organisms/` component, all states × both themes; addon-a11y must be clean.
- Design system layer is organized atomically: `src/design/{atoms,molecules,organisms,foundations}`.

## Storybook documentation standard

Storybook is the source of truth for the UI — every visual component is documented there. Store-coupled components ship a **presentational unit** (props-in, the Storybook truth) + a thin store container.

- **Global config** (already wired): `react-docgen-typescript` (`.storybook/main.ts`) generates prop tables from TS types + JSDoc; autodocs is on for all stories (`export const tags = ['autodocs']` in `.storybook/preview.tsx`). Don't re-disable either.
- **CSF3, args-based.** `const meta = { component, ... } satisfies Meta<typeof X>`; `type Story = StoryObj<typeof meta>`. One named story per state (`Default`, `Disabled`, `Loading`, …) driven by `args` so Controls are interactive; add a `Showcase` render story for the side-by-side overview.
- **Component doc** via `meta.parameters.docs.description.component` (markdown); per-story notes via `parameters.docs.description.story`.
- **Prop docs:** JSDoc on the design-system component's prop interface is the documented exception to "no comments" — it is API documentation and feeds react-docgen-typescript. Keep implementation bodies comment-free.
- Cover every state; verify both themes via the **Thème** toolbar; addon-a11y clean.
