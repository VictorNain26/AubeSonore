import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerErrorFallback, ModalErrorFallback } from './ErrorFallback';

const meta = {
  title: 'Features/ErrorFallback',
  parameters: {
    docs: {
      description: {
        component:
          'Fallbacks affichés par `react-error-boundary` quand un pan de l’UI plante : `PlayerErrorFallback` pour le lecteur, `ModalErrorFallback` pour le contenu d’une modale.',
      },
    },
  },
} satisfies Meta;
export default meta;

type Story = StoryObj<typeof meta>;

export const Player: Story = {
  parameters: {
    docs: { description: { story: 'Erreur du lecteur : un unique bouton « Réessayer ».' } },
  },
  render: () => (
    <PlayerErrorFallback error={new Error('Lecture interrompue')} resetErrorBoundary={() => {}} />
  ),
};

export const InModal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Erreur dans une modale : se ferme elle-même avant de notifier le parent.',
      },
    },
  },
  render: () => (
    <ModalErrorFallback
      error={new Error('Lecture interrompue')}
      resetErrorBoundary={() => {}}
      onClose={() => {}}
    />
  ),
};
