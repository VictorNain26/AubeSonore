import { Heart, X } from 'lucide-react';
import { Button, IconButton } from '../components/ui/Button';
import { MOMENT_LABELS, MOMENT_ORDER, MOMENT_TAGLINES } from '../lib/moments';

const TYPE_SCALE = [
  { cls: 'text-display font-display', label: 'display / Young Serif' },
  { cls: 'text-title font-display', label: 'title / Young Serif' },
  { cls: 'text-lead', label: 'lead / Spectral' },
  { cls: 'text-body', label: 'body / Spectral' },
  { cls: 'text-caption', label: 'caption / Spectral' },
] as const;

const SWATCHES = ['bg-paper', 'bg-paper-raised', 'bg-accent'] as const;
const INKS = ['text-ink', 'text-ink-soft', 'text-ink-faint', 'text-accent'] as const;

export default function DevSystemPage() {
  return (
    <div className="mx-auto max-w-[640px] px-6 py-12 space-y-12">
      <header className="space-y-1">
        <p className="eyebrow">/dev/system</p>
        <h1 className="text-title font-display">Le système</h1>
        <p className="text-body text-ink-soft">
          Ajouter ?moment=dawn|day|dusk|night à l&apos;URL pour changer de papier.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="eyebrow">Moments</h2>
        {MOMENT_ORDER.map((m) => (
          <p key={m} className="text-body">
            <span className="font-display">{MOMENT_LABELS[m]}</span>
            <span className="text-ink-soft"> — {MOMENT_TAGLINES[m]}</span>
          </p>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Typographie</h2>
        {TYPE_SCALE.map(({ cls, label }) => (
          <div key={label}>
            <p className={cls}>Aube sonore</p>
            <p className="text-caption text-ink-faint">{label}</p>
          </div>
        ))}
        <p className="eyebrow">Surtitre (.eyebrow) — la seule voix en capitales</p>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Encres & papiers</h2>
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
        <div
          className="h-24 w-full rounded-md border border-line"
          style={{
            backgroundImage: 'linear-gradient(to bottom, var(--sky), var(--color-paper) 40%)',
            backgroundAttachment: 'fixed',
          }}
        />
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow">Primitives</h2>
        <div className="flex items-center gap-3">
          <Button variant="accent">Bouton accent</Button>
          <Button variant="ink">Bouton encre</Button>
          <Button variant="ghost">Bouton fantôme</Button>
          <IconButton label="Icône fantôme">
            <Heart />
          </IconButton>
          <IconButton shape="round" label="Icône ronde">
            <X />
          </IconButton>
        </div>
        <p className="eyebrow text-ink-soft">
          Crépuscule — 19h42 <span className="text-ink-faint">(badge moment)</span>
        </p>
        <div className="rule" />
        <div className="flex items-center gap-3 py-2">
          <div className="size-10 rounded-sm bg-paper-raised" />
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
