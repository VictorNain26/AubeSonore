import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModalErrorFallback } from './ErrorFallback';

const meta = {
  title: 'Features/ErrorFallback/Modal',
  component: ModalErrorFallback,
  parameters: {
    docs: {
      description: {
        component:
          'Fallback `react-error-boundary` pour le contenu d’une modale : s’affiche dans une `Modal` et se ferme elle-même avant de notifier le parent via `onClose`.',
      },
    },
  },
} satisfies Meta<typeof ModalErrorFallback>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Defaut: Story = {
  args: {
    error: new Error('Lecture interrompue'),
    resetErrorBoundary: () => {},
    onClose: () => {},
  },
};
