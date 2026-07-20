import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './Slider';

const meta: Meta<typeof Slider> = { title: 'Primitives/Slider', component: Slider };
export default meta;

const Demo = ({ disabled = false }: { disabled?: boolean }) => {
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
