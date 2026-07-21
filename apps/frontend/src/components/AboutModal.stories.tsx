import type { Meta, StoryObj } from '@storybook/react-vite';
import { AboutModal } from './AboutModal';

const meta = {
  title: 'Features/AboutModal',
  component: AboutModal,
  parameters: {
    docs: {
      description: {
        component:
          'Modale « à propos » : contenu statique présentant AubeSonore et un contact email.',
      },
    },
  },
  args: {
    isOpen: true,
    onClose: () => {},
  },
} satisfies Meta<typeof AboutModal>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Ouvert: Story = {};
