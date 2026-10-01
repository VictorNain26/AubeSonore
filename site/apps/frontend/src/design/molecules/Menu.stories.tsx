import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button';
import { Menu } from './Menu';

const meta: Meta<typeof Menu> = {
  title: 'Molecules/Menu',
  component: Menu,
  parameters: {
    docs: {
      description: {
        component:
          'Menu contextuel (Base UI). Devient un groupe radio dès qu’une entrée porte `selected`. Composite : `trigger`/`items` passés en props d’un `render`, pas de story par état d’args.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Menu>;

export const Actions: Story = {
  parameters: {
    docs: { description: { story: 'Liste d’actions simples, une entrée désactivée.' } },
  },
  render: () => (
    <Menu
      trigger={
        <Button variant="icon" aria-label="Options">
          ⋯
        </Button>
      }
      items={[
        { label: 'Partager', onSelect: () => {} },
        { label: 'Voir la fiche artiste', onSelect: () => {} },
        { label: 'Supprimer des favoris', onSelect: () => {}, disabled: true },
      ]}
    />
  ),
};

export const WithSelection: Story = {
  parameters: {
    docs: { description: { story: 'Une entrée `selected` : le menu bascule en groupe radio.' } },
  },
  render: () => (
    <Menu
      trigger={<Button variant="ghost">Spotify</Button>}
      items={[
        { label: 'Spotify', onSelect: () => {}, selected: true },
        { label: 'Apple Music', onSelect: () => {} },
        { label: 'Deezer', onSelect: () => {} },
      ]}
    />
  ),
};

export const WithHeader: Story = {
  parameters: {
    docs: { description: { story: 'Avec un en-tête (infos utilisateur) au-dessus des actions.' } },
  },
  render: () => (
    <Menu
      header={
        <div>
          <p className="font-medium">Victor</p>
          <p className="text-caption text-text-muted">victor@example.com</p>
        </div>
      }
      trigger={
        <Button variant="icon" aria-label="Options">
          ⋯
        </Button>
      }
      items={[{ label: 'Déconnexion', onSelect: () => {} }]}
    />
  ),
};
