import type { Meta, StoryObj } from '@storybook/react-vite';
import { MemoryRouter } from 'react-router';
import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { ArtistPageView } from './ArtistPageView';

const profile: ArtistProfile = {
  id: 'abc',
  name: 'Daft Punk',
  slug: 'daft-punk',
  image: 'https://picsum.photos/seed/daftpunk/300/300',
  bio: 'Duo français de musique électronique formé en 1993, figure majeure de la French touch.',
  tags: ['french house', 'électronique'],
  listeners: 4200,
  similar: [
    { id: 'j', name: 'Justice', image: 'https://picsum.photos/seed/justice/200/200' },
    { id: 'a', name: 'Air', image: null },
  ],
  topTracks: [{ title: 'Around the World', url: 'https://deezer.com/track/1' }],
  links: [
    { platform: 'official', url: 'https://daftpunk.com' },
    { platform: 'wikipedia', url: 'https://fr.wikipedia.org/wiki/Daft_Punk' },
  ],
  playedOnRadio: [
    { title: 'Around the World', artist: 'Daft Punk', playedAt: '2026-07-27T10:00:00.000Z' },
    { title: 'Da Funk', artist: 'Daft Punk', playedAt: '2026-07-26T18:30:00.000Z' },
  ],
  resolved: true,
};

const meta = {
  title: 'Organisms/ArtistPageView',
  component: ArtistPageView,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Page artiste. Chaque section disparaît indépendamment quand sa source est vide ; « Passé sur AubeSonore » et les liens forment le socle affiché même quand aucune source externe ne connaît l’artiste — c’est ce qui rend la page utile aux artistes émergents.',
      },
    },
  },
  args: {
    profile,
    isLoading: false,
    error: null,
  },
} satisfies Meta<typeof ArtistPageView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Complet: Story = {};

export const SansBio: Story = {
  args: { profile: { ...profile, bio: null } },
  parameters: {
    docs: {
      description: { story: 'La section entière disparaît, sans bloc vide en remplacement.' },
    },
  },
};

export const SansSimilaires: Story = {
  args: { profile: { ...profile, similar: [] } },
};

export const SansPortrait: Story = {
  args: { profile: { ...profile, image: null } },
  parameters: {
    docs: {
      description: {
        story:
          'Repli sur CoverGlyph, libellé au nom de l’artiste pour rester distinguable des cartes.',
      },
    },
  },
};

export const ArtisteEmergent: Story = {
  args: {
    profile: {
      ...profile,
      name: 'Un Groupe Inconnu',
      resolved: false,
      image: null,
      bio: null,
      tags: [],
      similar: [],
      topTracks: [],
      links: [{ platform: 'bandcamp', url: 'https://ungroupeinconnu.bandcamp.com' }],
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Le cas qui justifie la fonctionnalité : aucune source externe, mais la radio l’a diffusé — la page reste réelle.',
      },
    },
  },
};

export const Chargement: Story = {
  args: { profile: null, isLoading: true },
};

export const Erreur: Story = {
  args: { profile: null, isLoading: false, error: 'Impossible de charger cet artiste.' },
};
