import { Slider as BaseSlider } from '@base-ui/react/slider';

export interface SliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

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
            isVertical ? 'relative h-full w-1 bg-border' : 'relative h-px w-full bg-border'
          }
        >
          <BaseSlider.Indicator
            className={isVertical ? 'absolute bottom-0 w-1 bg-accent' : 'absolute h-px bg-accent'}
          />
          <BaseSlider.Thumb
            aria-label={label}
            className="size-4 rounded-full border border-accent bg-surface transition-transform duration-150 ease-out-quart focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-110"
          />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
