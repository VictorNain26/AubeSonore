import type { Meta, StoryObj } from '@storybook/react-vite';
import { Thumbnail } from './Thumbnail';

const meta: Meta<typeof Thumbnail> = { title: 'Atoms/Thumbnail', component: Thumbnail };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex items-end gap-6">
      <Thumbnail size="md" src="https://picsum.photos/seed/aube/96" alt="Pochette exemple" />
      <Thumbnail size="md" alt="" />
      <Thumbnail size="sm" alt="" />
      <p className="text-caption text-text-muted">Image · fallback (md) · fallback (sm)</p>
    </div>
  ),
};
