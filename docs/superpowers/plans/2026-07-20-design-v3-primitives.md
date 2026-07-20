# Design System v3 — Plan 2: Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five v3 UI primitives (Button, TextField, Modal, Menu, Slider) on Base UI behavior + v3 tokens, each with all states and a Storybook story, without touching the running app.

**Architecture:** Primitives live in `apps/frontend/src/design/ui/` (the design-system home, next to tokens and foundations stories) so they cannot collide with the old `src/components/ui/` primitives the app still uses. Screen-migration PRs will consume them; the demolition PR moves them to `src/components/ui/` once the old ones are deleted (spec's final structure). Interactive behavior (focus trap, keyboard, aria) comes from Base UI parts; ALL styling comes from our semantic token utilities.

**Tech Stack:** Base UI (`@base-ui/react`, stable — the docs' import form; Task 1 verifies the exact package name on the registry), React 19 (ref-as-prop, no forwardRef), Tailwind v4 token utilities, Vitest (jsdom pragma pattern), Storybook 10 + addon-a11y + addon-mcp.

**Spec:** `docs/superpowers/specs/2026-07-20-design-system-v3-design.md` §3. Foundations (PR #114) are merged: semantic utilities `bg-surface`, `bg-surface-raised`, `text-text`, `text-text-muted`, `text-text-faint`, `border-border`, `bg-accent`, `text-accent`, `text-on-accent`, type scale `text-display|title|lead|body|caption`, `rounded-sm|md|full`, `ease-out-quart`, variant `dark:`.

## Global Constraints

- Branch: `feat/design-v3-primitives` off fresh `master` (after PR #114 is merged). Conventional Commits English, scope `frontend`. Stage file by file. No `--no-verify`.
- Working dir for pnpm commands: `apps/frontend`. `pnpm typecheck && pnpm lint` zero warnings before claiming done; `pnpm build-storybook` must pass at the end of every task that adds a story.
- TypeScript strict, named exports, React 19 style (ref via props, never `forwardRef`), **no code comments**, no `eslint-disable`.
- Styling: ONLY the semantic token utilities listed above + layout/flex/grid/spacing/size utilities + `duration-150/duration-250` + `animate-spin`. No hex/hsl/oklch, no arbitrary color/spacing/font values, no `shadow-*` (depth = `border border-border`, per the ink-on-paper identity).
- Every interactive primitive: hover, focus-visible (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`), active, disabled (`disabled:pointer-events-none disabled:opacity-50`), and ≥44px touch target (`h-11` / `size-11`).
- French UI copy in stories; code identifiers English.
- Do NOT modify anything under `src/components/`, `src/index.css`, `src/lib/` (except nothing — this plan adds only `src/design/ui/**` files + stories + package.json/lockfile).
- **Base UI API verification step (mandatory, replaces guessing):** before running tests in each Base UI task, open the installed package's type declarations (`node_modules/@base-ui/react/**/*.d.ts` — e.g. `esm/dialog/index.d.ts`) and confirm every part name and prop used in this plan's code exists. If a name differs, align the code to the installed .d.ts (keeping the visual contract identical) and disclose the change in your report.

## File Structure

- Create: `src/design/ui/cn.ts` — class-merge helper (clsx + tailwind-merge), single helper for all primitives.
- Create: `src/design/ui/Button.tsx` + `Button.test.tsx` + `Button.stories.tsx`
- Create: `src/design/ui/TextField.tsx` + `TextField.test.tsx` + `TextField.stories.tsx`
- Create: `src/design/ui/Modal.tsx` + `Modal.test.tsx` + `Modal.stories.tsx`
- Create: `src/design/ui/Menu.tsx` + `Menu.stories.tsx`
- Create: `src/design/ui/Slider.tsx` + `Slider.stories.tsx`
- Modify: `apps/frontend/package.json` + root `pnpm-lock.yaml` (Base UI dep)

---

### Task 1: Base UI dependency + cn helper

**Files:**

- Modify: `apps/frontend/package.json`, root `pnpm-lock.yaml`
- Create: `apps/frontend/src/design/ui/cn.ts`

**Interfaces:**

- Produces: `cn(...inputs: ClassValue[]): string` — every later primitive imports it from `./cn`. Dependency `@base-ui/react` importable as `@base-ui/react/<component>`.

- [ ] **Step 1: Install Base UI**

Run from `apps/frontend`: `pnpm add @base-ui/react`
If the registry has no such package, run `pnpm add @base-ui-components/react` instead and use that name in every import in this plan; disclose in the report.

- [ ] **Step 2: Write `src/design/ui/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 3: Verify the dep resolves**

Run: `cd apps/frontend && pnpm typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml apps/frontend/src/design/ui/cn.ts
git commit -m "feat(frontend): add base ui and class-merge helper for v3 primitives"
```

---

### Task 2: Button

**Files:**

- Create: `src/design/ui/Button.tsx`, `src/design/ui/Button.test.tsx`, `src/design/ui/Button.stories.tsx`

**Interfaces:**

- Produces: `Button` with props `variant?: 'primary' | 'ghost' | 'icon'` (default `primary`), `loading?: boolean`, plus all native button props incl. `ref`. `loading` disables the button, sets `aria-busy`, shows a spinner.

- [ ] **Step 1: Write the failing tests** (`Button.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('fires clicks when enabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Écouter</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Écouter' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
  it('is disabled and busy while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Envoi
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Envoi' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('keeps the accessible name on icon variant via aria-label', () => {
    render(<Button variant="icon" aria-label="Partager" />);
    expect(screen.getByRole('button', { name: 'Partager' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/frontend && pnpm test --run src/design/ui/Button.test.tsx`
Expected: FAIL — cannot find module './Button'.

- [ ] **Step 3: Implement** (`Button.tsx`)

```tsx
import type { ButtonHTMLAttributes, Ref } from 'react';
import { cn } from './cn';

type ButtonVariant = 'primary' | 'ghost' | 'icon';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:opacity-90 px-6',
  ghost: 'text-text hover:bg-surface-raised px-4',
  icon: 'size-11 justify-center p-0 text-text hover:bg-surface-raised',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = 'primary',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-full text-body font-medium transition-opacity duration-150 ease-out-quart',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'active:opacity-80 disabled:pointer-events-none disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `cd apps/frontend && pnpm test --run src/design/ui/Button.test.tsx`
Expected: 3/3 PASS, pristine output.

- [ ] **Step 5: Write the story** (`Button.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = { title: 'Primitives/Button', component: Button };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <Button>Écouter le direct</Button>
        <Button variant="ghost">Historique</Button>
        <Button variant="icon" aria-label="Partager">
          ↗
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button disabled>Écouter le direct</Button>
        <Button variant="ghost" disabled>
          Historique
        </Button>
        <Button loading>Connexion</Button>
      </div>
      <p className="text-caption text-text-muted">
        Hover, focus (Tab) et active se testent au clavier et à la souris — cibles 44px.
      </p>
    </div>
  ),
};
```

- [ ] **Step 6: Verify Storybook builds**

Run: `cd apps/frontend && pnpm build-storybook`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/design/ui/Button.tsx apps/frontend/src/design/ui/Button.test.tsx apps/frontend/src/design/ui/Button.stories.tsx
git commit -m "feat(frontend): v3 button primitive with full state coverage"
```

---

### Task 3: TextField

**Files:**

- Create: `src/design/ui/TextField.tsx`, `src/design/ui/TextField.test.tsx`, `src/design/ui/TextField.stories.tsx`

**Interfaces:**

- Consumes: Base UI `Field` parts (`@base-ui/react/field`): `Field.Root`, `Field.Label`, `Field.Control`, `Field.Error`. Run the mandatory .d.ts verification before testing.
- Produces: `TextField` with props `label: string`, `error?: string`, plus native input props (`type`, `autoComplete`, `inputMode`, `value`, `onChange`, `onBlur`, …). Error text is announced (Base UI wires aria) and shown below the control.

- [ ] **Step 1: Write the failing tests** (`TextField.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TextField } from './TextField';

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Adresse e-mail" type="email" autoComplete="email" />);
    expect(screen.getByLabelText('Adresse e-mail')).toBeInTheDocument();
  });
  it('shows the error message when provided', () => {
    render(<TextField label="Adresse e-mail" error="Adresse invalide — vérifie le format." />);
    expect(screen.getByText('Adresse invalide — vérifie le format.')).toBeInTheDocument();
  });
  it('shows no error element without error', () => {
    render(<TextField label="Adresse e-mail" />);
    expect(screen.queryByText(/invalide/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/frontend && pnpm test --run src/design/ui/TextField.test.tsx`
Expected: FAIL — cannot find module './TextField'.

- [ ] **Step 3: Implement** (`TextField.tsx`)

```tsx
import type { ComponentProps } from 'react';
import { Field } from '@base-ui/react/field';
import { cn } from './cn';

export interface TextFieldProps extends ComponentProps<typeof Field.Control> {
  label: string;
  error?: string;
}

export function TextField({ label, error, className, ...props }: TextFieldProps) {
  return (
    <Field.Root invalid={error !== undefined} className="flex w-full flex-col gap-1.5">
      <Field.Label className="text-caption text-text-muted">{label}</Field.Label>
      <Field.Control
        className={cn(
          'h-11 w-full rounded-md border border-border bg-surface px-3 text-body text-text',
          'transition-colors duration-150 ease-out-quart placeholder:text-text-faint',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          error !== undefined && 'border-accent',
          className
        )}
        {...props}
      />
      {error !== undefined ? (
        <Field.Error className="text-caption text-accent" match>
          {error}
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
```

Note: if the installed .d.ts shows `Field.Root` has no `invalid` prop or `Field.Error` has no boolean `match` prop, align to the installed API (the visual contract stands: red-ish accent border + caption error below when `error` is set, nothing otherwise) and disclose.

- [ ] **Step 4: Run tests to verify pass**

Run: `cd apps/frontend && pnpm test --run src/design/ui/TextField.test.tsx`
Expected: 3/3 PASS.

- [ ] **Step 5: Write the story** (`TextField.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextField } from './TextField';

const meta: Meta<typeof TextField> = { title: 'Primitives/TextField', component: TextField };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-6">
      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        placeholder="toi@exemple.fr"
      />
      <TextField
        label="Adresse e-mail"
        type="email"
        defaultValue="pas-une-adresse"
        error="Adresse invalide — vérifie le format."
      />
      <TextField label="Pseudo" disabled defaultValue="aube.sonore" />
    </div>
  ),
};
```

- [ ] **Step 6: Verify Storybook builds**

Run: `cd apps/frontend && pnpm build-storybook` — success.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/design/ui/TextField.tsx apps/frontend/src/design/ui/TextField.test.tsx apps/frontend/src/design/ui/TextField.stories.tsx
git commit -m "feat(frontend): v3 text field primitive on base ui field"
```

---

### Task 4: Modal

**Files:**

- Create: `src/design/ui/Modal.tsx`, `src/design/ui/Modal.test.tsx`, `src/design/ui/Modal.stories.tsx`

**Interfaces:**

- Consumes: Base UI `Dialog` parts (`@base-ui/react/dialog`): `Root`, `Trigger`, `Portal`, `Backdrop`, `Popup`, `Title`, `Close`. Run the mandatory .d.ts verification before testing.
- Produces: `Modal` with props `title: string`, `trigger: ReactElement` (rendered as the dialog trigger via Base UI's `render` prop), `children`, optional controlled `open`/`onOpenChange`. Focus trap, Esc, backdrop click come from Base UI.

- [ ] **Step 1: Write the failing tests** (`Modal.test.tsx`)

```tsx
// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Button } from './Button';
import { Modal } from './Modal';

describe('Modal', () => {
  it('opens from the trigger and shows the title', () => {
    render(
      <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
        <p>Contenu</p>
      </Modal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compte' }));
    expect(screen.getByRole('dialog', { name: 'Se connecter' })).toBeInTheDocument();
  });
  it('closes via the close button', () => {
    render(
      <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
        <p>Contenu</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Compte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure** — cannot find module './Modal'.

- [ ] **Step 3: Implement** (`Modal.tsx`)

```tsx
import type { ReactElement, ReactNode } from 'react';
import { Dialog } from '@base-ui/react/dialog';

export interface ModalProps {
  title: string;
  trigger: ReactElement;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Modal({ title, trigger, children, open, onOpenChange }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-text/40 duration-150" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-md border border-border bg-surface-raised p-6 text-text focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-title">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-opacity duration-150 ease-out-quart hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:opacity-80"
            >
              ✕
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Note: `bg-text/40` is the semantic text token at 40% opacity for the backdrop scrim — allowed (token + opacity modifier, no new color).

- [ ] **Step 4: Run tests to verify pass** — 2/2 PASS. If Base UI portals confuse jsdom, check the .d.ts/readme for a `container` or animation-related prop before touching the test; disclose whatever was needed.

- [ ] **Step 5: Write the story** (`Modal.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Modal } from './Modal';
import { TextField } from './TextField';

const meta: Meta<typeof Modal> = { title: 'Primitives/Modal', component: Modal };
export default meta;

export const Connexion: StoryObj = {
  render: () => (
    <Modal title="Se connecter" trigger={<Button variant="ghost">Compte</Button>}>
      <div className="flex flex-col gap-4">
        <TextField label="Adresse e-mail" type="email" autoComplete="email" />
        <Button>Recevoir le lien</Button>
      </div>
    </Modal>
  ),
};
```

- [ ] **Step 6: Verify Storybook builds** — success.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/design/ui/Modal.tsx apps/frontend/src/design/ui/Modal.test.tsx apps/frontend/src/design/ui/Modal.stories.tsx
git commit -m "feat(frontend): v3 modal primitive on base ui dialog"
```

---

### Task 5: Menu

**Files:**

- Create: `src/design/ui/Menu.tsx`, `src/design/ui/Menu.stories.tsx`

**Interfaces:**

- Consumes: Base UI `Menu` parts (`@base-ui/react/menu`): `Root`, `Trigger`, `Portal`, `Positioner`, `Popup`, `Item`. Run the mandatory .d.ts verification before the Storybook build.
- Produces: `Menu` with props `trigger: ReactElement`, `items: MenuAction[]` where `MenuAction = { label: string; onSelect: () => void; disabled?: boolean }`. Keyboard navigation and typeahead come from Base UI.

- [ ] **Step 1: Implement** (`Menu.tsx`)

```tsx
import type { ReactElement } from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';

export interface MenuAction {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface MenuProps {
  trigger: ReactElement;
  items: MenuAction[];
}

export function Menu({ trigger, items }: MenuProps) {
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner sideOffset={4}>
          <BaseMenu.Popup className="min-w-44 rounded-md border border-border bg-surface-raised py-1 text-body text-text focus:outline-none">
            {items.map((item) => (
              <BaseMenu.Item
                key={item.label}
                disabled={item.disabled}
                onClick={item.onSelect}
                className="flex h-11 cursor-default items-center px-4 outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface"
              >
                {item.label}
              </BaseMenu.Item>
            ))}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
```

Note: if the installed .d.ts names the selection callback differently on `Menu.Item` (e.g. `onClick` absent in favor of a dedicated prop), align and disclose. The `data-[highlighted]`/`data-[disabled]` attribute names must also be confirmed in the .d.ts/docs of the installed version.

- [ ] **Step 2: Write the story** (`Menu.stories.tsx`)

```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Menu } from './Menu';

const meta: Meta<typeof Menu> = { title: 'Primitives/Menu', component: Menu };
export default meta;

export const Actions: StoryObj = {
  render: () => (
    <Menu
      trigger={
        <Button variant="icon" aria-label="Options">
          ⋯
        </Button>
      }
      items={[
        { label: 'Partager', onSelect: () => {} },
        { label: 'Voir la fiche artiste', onSelect: () => {} },
        { label: 'Supprimer des favoris', onSelect: () => {}, disabled: true },
      ]}
    />
  ),
};
```

- [ ] **Step 3: Validate**

Run: `cd apps/frontend && pnpm typecheck && pnpm lint && pnpm build-storybook`
Expected: all exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/design/ui/Menu.tsx apps/frontend/src/design/ui/Menu.stories.tsx
git commit -m "feat(frontend): v3 menu primitive on base ui menu"
```

---

### Task 6: Slider

**Files:**

- Create: `src/design/ui/Slider.tsx`, `src/design/ui/Slider.stories.tsx`

**Interfaces:**

- Consumes: Base UI `Slider` parts (`@base-ui/react/slider`): `Root`, `Control`, `Track`, `Indicator`, `Thumb`. Run the mandatory .d.ts verification before the Storybook build.
- Produces: `Slider` with props `label: string` (aria-label, not visually rendered), `value: number`, `onValueChange: (value: number) => void`, `min?`, `max?`, `step?`, `disabled?`. Thin ink track, accent indicator — the volume control of the future Player.

- [ ] **Step 1: Implement** (`Slider.tsx`)

```tsx
import { Slider as BaseSlider } from '@base-ui/react/slider';

export interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
}: SliderProps) {
  return (
    <BaseSlider.Root
      value={value}
      onValueChange={(next) => onValueChange(Array.isArray(next) ? next[0] : next)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="w-full data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <BaseSlider.Control className="flex h-11 w-full touch-none items-center">
        <BaseSlider.Track className="relative h-px w-full bg-border">
          <BaseSlider.Indicator className="absolute h-px bg-accent" />
          <BaseSlider.Thumb
            aria-label={label}
            className="size-4 rounded-full border border-accent bg-surface transition-transform duration-150 ease-out-quart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-110"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
```

- [ ] **Step 2: Write the story** (`Slider.stories.tsx`)

```tsx
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './Slider';

const meta: Meta<typeof Slider> = { title: 'Primitives/Slider', component: Slider };
export default meta;

const Demo = ({ disabled }: { disabled?: boolean }) => {
  const [volume, setVolume] = useState(0.6);
  return <Slider label="Volume" value={volume} onValueChange={setVolume} disabled={disabled} />;
};

export const Volume: StoryObj = {
  render: () => (
    <div className="flex max-w-xs flex-col gap-8">
      <Demo />
      <Demo disabled />
    </div>
  ),
};
```

- [ ] **Step 3: Validate**

Run: `cd apps/frontend && pnpm typecheck && pnpm lint && pnpm build-storybook`
Expected: all exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/design/ui/Slider.tsx apps/frontend/src/design/ui/Slider.stories.tsx
git commit -m "feat(frontend): v3 slider primitive on base ui slider"
```

---

### Task 7: Full validation + PR + checkpoint

- [ ] **Step 1: Full battery**

Run from `apps/frontend`:

```bash
pnpm check:contrast && pnpm typecheck && pnpm lint && pnpm test --run && pnpm knip && pnpm build-storybook && pnpm build
```

Expected: all exit 0, zero warnings. If knip flags `src/design/ui/**` exports as unused (consumed only by stories/tests until screen migration), add the minimal knip entry/ignore for that directory with removal planned in the screen-migration PRs; disclose in the report.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin feat/design-v3-primitives
gh pr create --title "feat(frontend): design system v3 primitives" --body "$(cat <<'EOF'
## Summary
- Five v3 primitives in src/design/ui/ on Base UI behavior + v3 tokens: Button (primary/ghost/icon, loading), TextField (label/error/disabled), Modal (dialog with focus trap), Menu, Slider
- All interactive states covered (hover, focus-visible, active, disabled, loading) with 44px targets
- One Storybook story per primitive under Primitives/*, addon-a11y active, exposed to agents via addon-mcp
- App untouched — primitives are consumed starting with the screen-migration PRs

Spec: docs/superpowers/specs/2026-07-20-design-system-v3-design.md §3

## Test plan
- [ ] CI green (4 required checks + contrast)
- [ ] Storybook checkpoint: Victor validates the five primitives in both themes — also re-judging whether Storybook stays (deal from 2026-07-20)

Generated with Claude Code
EOF
)"
```

- [ ] **Step 3: Checkpoint**

Do NOT merge. Report to Victor: Primitives checkpoint in Storybook (5 stories, both themes, keyboard walk-through) + his standing re-judgment of Storybook itself now that real components are inside.

---

## Self-Review (done at plan time)

- Spec coverage: §3 Base UI parts for Dialog/Menu/Slider/Field ✔ (Tooltip deliberately out — YAGNI until a screen needs it); states matrix ✔; 44px ✔; forms labels/autocomplete/error copy ✔ (validation-at-blur lives in the consuming form, not the primitive); stories as visual contract ✔.
- Placeholders: none; every step has full code or exact commands. API-uncertainty handled by the mandatory .d.ts verification instruction, which is concrete and bounded.
- Type consistency: `cn` (Task 1) used by Tasks 2-4; `Button` consumed in Modal/Menu stories; `TextField` in Modal story; prop names consistent.
- Location deviation from spec (§3 says components/ui): documented in Architecture — collision-free during transition, demolition PR moves them.
