import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerErrorFallback } from './ErrorFallback';

const meta = {
  title: 'Organisms/ErrorFallback/Player',
  component: PlayerErrorFallback,
  parameters: {
    docs: {
      description: {
        component:
          'Fallback `react-error-boundary` du lecteur : message d’erreur + un unique bouton « Réessayer » câblé sur `resetErrorBoundary`.',
      },
    },
  },
} satisfies Meta<typeof PlayerErrorFallback>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  args: { error: new Error('Lecture interrompue'), resetErrorBoundary: () => {} },
};
