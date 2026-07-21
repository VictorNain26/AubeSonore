import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heart, Share2 } from 'lucide-react';
import { IconButton } from './IconButton';

const meta: Meta<typeof IconButton> = { title: 'Atoms/IconButton', component: IconButton };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-2">
        <IconButton label="Partager">
          <Share2 className="size-5" />
        </IconButton>
        <IconButton label="Retirer de mes morceaux" active>
          <Heart className="size-5" fill="currentColor" />
        </IconButton>
        <IconButton label="Aimer" disabled>
          <Heart className="size-5" />
        </IconButton>
      </div>
      <div className="group flex items-center gap-2 rounded-md border border-border p-3">
        <span className="text-caption text-text-muted">Survolez ce bloc — actions `reveal` :</span>
        <IconButton label="Aimer" reveal>
          <Heart className="size-5" />
        </IconButton>
        <IconButton label="Partager" reveal>
          <Share2 className="size-5" />
        </IconButton>
      </div>
    </div>
  ),
};
