import type { Meta, StoryObj } from '@storybook/react-vite';
import { Moon, Sun } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'Molecules/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    docs: {
      description: {
        component:
          'Choix exclusif en segments (ToggleGroup Base UI) : état via `data-[pressed]`, navigation clavier aux flèches. Utilisé pour le thème et la langue du panneau réglages.',
      },
    },
  },
  args: {
    ariaLabel: 'Thème',
    value: 'light',
    onChange: () => {},
  },
} satisfies Meta<typeof SegmentedControl>;
export default meta;

type Story = StoryObj<typeof meta>;

export const AvecIcones: Story = {
  args: {
    options: [
      { value: 'light', label: 'Clair', icon: <Sun className="size-3.5" /> },
      { value: 'dark', label: 'Sombre', icon: <Moon className="size-3.5" /> },
    ],
  },
};

export const TexteSeul: Story = {
  args: {
    ariaLabel: 'Langue',
    value: 'fr',
    options: [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
    ],
  },
};
