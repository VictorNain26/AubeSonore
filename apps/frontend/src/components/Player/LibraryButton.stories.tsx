import type { Meta, StoryObj } from '@storybook/react-vite';
import { LibraryButtonView } from './LibraryButton';

const meta = {
  title: 'Features/LibraryButton',
  component: LibraryButtonView,
  parameters: {
    docs: {
      description: {
        component:
          'Ouvre la bibliothèque de titres aimés. Passe en accent dès qu’un titre y est enregistré.',
      },
    },
  },
  args: {
    hasLikedTracks: false,
    onOpen: () => undefined,
  },
} satisfies Meta<typeof LibraryButtonView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithLikedTracks: Story = { args: { hasLikedTracks: true } };
