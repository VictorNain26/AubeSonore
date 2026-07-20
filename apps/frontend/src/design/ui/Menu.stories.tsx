import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { Menu } from './Menu';

const meta: Meta<typeof Menu> = { title: 'Primitives/Menu', component: Menu };
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
