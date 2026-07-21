import type { Meta, StoryObj } from '@storybook/react-vite';
import { ThemeToggleView } from './ThemeToggle';

const meta = {
  title: 'Features/ThemeToggle',
  component: ThemeToggleView,
  parameters: {
    docs: {
      description: {
        component:
          'Bascule entre thème clair et sombre. Le libellé accessible annonce le thème vers lequel on va basculer, pas celui affiché.',
      },
    },
  },
  argTypes: {
    theme: { control: 'inline-radio', options: ['light', 'dark'] },
  },
  args: {
    theme: 'light',
    onToggle: () => undefined,
  },
} satisfies Meta<typeof ThemeToggleView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = { args: { theme: 'dark' } };
