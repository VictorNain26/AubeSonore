import { Slider as BaseSlider } from '@base-ui/react/slider';

export interface SliderProps {
  /** Libellé accessible du curseur (`aria-label`). */
  label: string;
  /** Valeur courante. */
  value: number;
  /** Appelé avec la nouvelle valeur lors du déplacement du curseur. */
  onValueChange: (value: number) => void;
  /** Valeur minimale. */
  min?: number;
  /** Valeur maximale. */
  max?: number;
  /** Pas d'incrémentation. */
  step?: number;
  /** Désactive l'interaction. */
  disabled?: boolean;
  /** Sens du curseur. */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Curseur de valeur continue (ex. volume) basé sur `Slider` de Base UI,
 * disponible en orientation horizontale ou verticale.
 */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled,
  orientation = 'horizontal',
}: SliderProps) {
  const isVertical = orientation === 'vertical';

  return (
    <BaseSlider.Root
      value={value}
      onValueChange={(next) => onValueChange(next)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      orientation={orientation}
      className={
        isVertical
          ? 'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
          : 'w-full data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
      }
    >
      <BaseSlider.Control
        className={
          isVertical
            ? 'flex h-32 w-11 touch-none items-center justify-center'
            : 'flex h-11 w-full touch-none items-center'
        }
      >
        <BaseSlider.Track
          className={
            isVertical ? 'bg-border relative h-full w-1' : 'bg-border relative h-px w-full'
          }
        >
          <BaseSlider.Indicator
            className={isVertical ? 'bg-accent absolute bottom-0 w-1' : 'bg-accent absolute h-px'}
          />
          <BaseSlider.Thumb
            aria-label={label}
            className="border-accent bg-surface ease-out-quart focus-visible:outline-accent size-4 rounded-full border transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-110"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
