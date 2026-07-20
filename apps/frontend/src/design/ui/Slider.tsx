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
      onValueChange={(next) => onValueChange(next)}
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
