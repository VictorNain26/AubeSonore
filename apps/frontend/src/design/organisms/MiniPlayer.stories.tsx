import type { Meta, StoryObj } from '@storybook/react-vite';
import { MiniPlayer } from './MiniPlayer';

const meta = {
  title: 'Organisms/MiniPlayer',
  component: MiniPlayer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Barre de lecture compacte affichée sur toutes les pages sauf l’accueil. C’est une seconde vue du même état de lecture : elle ne contient aucune logique audio, donc naviguer n’interrompt jamais le flux.',
      },
    },
  },
  argTypes: {
    isPlaying: { control: 'boolean', description: 'Pilote l’icône et le libellé du bouton.' },
    artworkUrl: { control: 'text' },
    title: { control: 'text' },
    artist: { control: 'text' },
  },
  args: {
    title: 'Around the World',
    artist: 'Daft Punk',
    artworkUrl: null,
    isPlaying: false,
    onTogglePlay: () => {},
  },
} satisfies Meta<typeof MiniPlayer>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EnLecture: Story = {
  args: { isPlaying: true },
  parameters: {
    docs: {
      description: {
        story: 'Le bouton bascule sur l’icône pause et le libellé « Mettre en pause ».',
      },
    },
  },
};

export const AvecPochette: Story = {
  args: { artworkUrl: 'https://picsum.photos/seed/aubesonore/80/80' },
};

export const SansMorceau: Story = {
  args: { title: undefined, artist: undefined },
  parameters: {
    docs: {
      description: {
        story:
          'Avant la première réponse de l’antenne : le composant reste rendu et actionnable plutôt que de disparaître.',
      },
    },
  },
};

export const Showcase: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Les quatre états côte à côte — repli sur CoverGlyph, pochette, lecture, sans morceau.',
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <MiniPlayer
        title="Around the World"
        artist="Daft Punk"
        isPlaying={false}
        onTogglePlay={() => {}}
        className="static"
      />
      <MiniPlayer
        title="Around the World"
        artist="Daft Punk"
        artworkUrl="https://picsum.photos/seed/aubesonore/80/80"
        isPlaying
        onTogglePlay={() => {}}
        className="static"
      />
      <MiniPlayer isPlaying={false} onTogglePlay={() => {}} className="static" />
    </div>
  ),
};
