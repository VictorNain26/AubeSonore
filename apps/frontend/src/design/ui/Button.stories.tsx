import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = { title: 'Primitives/Button', component: Button };
export default meta;

export const Etats: StoryObj = {
  render: () => (
    <div className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <Button>Écouter le direct</Button>
        <Button variant="ghost">Historique</Button>
        <Button variant="icon" aria-label="Partager">
          ↗
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button disabled>Écouter le direct</Button>
        <Button variant="ghost" disabled>
          Historique
        </Button>
        <Button loading>Connexion</Button>
      </div>
      <p className="text-caption text-text-muted">
        Hover, focus (Tab) et active se testent au clavier et à la souris — cibles 44px.
      </p>
    </div>
  ),
};
