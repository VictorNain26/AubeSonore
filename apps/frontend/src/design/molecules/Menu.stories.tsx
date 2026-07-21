import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button';
import { Menu } from './Menu';

const meta: Meta<typeof Menu> = { title: 'Molecules/Menu', component: Menu };
export default meta;

export const Actions: StoryObj = {
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

export const WithSelection: StoryObj = {
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

export const WithHeader: StoryObj = {
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
