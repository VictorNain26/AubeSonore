import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export interface VolumeSliderProps {
  value: number;
  onChange: (_value: number[]) => void;
  className?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  value,
  onChange,
  className,
}) => (
  <SliderPrimitive.Root
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className,
    )}
    value={[value]}
    onValueChange={onChange}
    max={100}
    step={1}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-progress-bg">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-primary to-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={
      'block h-4 w-4 rounded-full border border-primary/50 bg-gradient-to-r from-primary to-accent ' +
      'shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ' +
      'disabled:pointer-events-none disabled:opacity-50'
    } />
  </SliderPrimitive.Root>
);
