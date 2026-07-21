import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Slider } from './Slider';

const meta = {
  title: 'Atoms/Slider',
  component: Slider,
  parameters: {
    docs: {
      description: {
        component:
          'Curseur de valeur continue (ex. volume) basé sur `Slider` de Base UI, disponible en orientation horizontale ou verticale.',
      },
    },
  },
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
    value: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    disabled: { control: 'boolean' },
  },
  args: {
    label: 'Volume',
    value: 0.6,
    onValueChange: () => {},
    disabled: false,
    orientation: 'horizontal',
  },
} satisfies Meta<typeof Slider>;
export default meta;

type Story = StoryObj<typeof meta>;

function ControlledSlider(args: React.ComponentProps<typeof Slider>) {
  const [value, setValue] = useState(args.value);
  return <Slider {...args} value={value} onValueChange={setValue} />;
}

export const Default: Story = {
  render: (args) => (
    <div className="max-w-xs">
      <ControlledSlider {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="max-w-xs">
      <ControlledSlider {...args} />
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <ControlledSlider {...args} />,
};

export const Showcase: Story = {
  parameters: {
    docs: { description: { story: 'Horizontal et vertical, actif et désactivé.' } },
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-xs flex-col gap-8">
        <ControlledSlider label="Volume" value={0.6} onValueChange={() => {}} />
        <ControlledSlider label="Volume" value={0.6} onValueChange={() => {}} disabled />
      </div>
      <div className="flex gap-8">
        <ControlledSlider
          label="Volume"
          orientation="vertical"
          value={0.6}
          onValueChange={() => {}}
        />
        <ControlledSlider
          label="Volume"
          orientation="vertical"
          value={0.6}
          onValueChange={() => {}}
          disabled
        />
      </div>
    </div>
  ),
};
