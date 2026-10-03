// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { makeArtistProfile, makeFriezeArtist } from '../mocks/handlers';
import {
  ArtistPageView,
  factsLine,
  type ArtistPageState,
  type LineageState,
} from './ArtistPageView';

function show(state: ArtistPageState, lineage: LineageState = { status: 'none' }) {
  return render(<ArtistPageView state={state} lineage={lineage} />, { wrapper: MemoryRouter });
}

const ready = { status: 'ready' as const, profile: makeArtistProfile() };

function ref(mbid: string, name: string, played: { id: string; slug: string } | null = null) {
  return { mbid, name, disambiguation: null, y0: 1960, played };
}

const SUMMARY = {
  text: 'Hania Rani est une pianiste et compositrice polonaise.',
  lang: 'fr' as const,
  url: 'https://fr.wikipedia.org/wiki/Hania_Rani',
};

describe('ArtistPageView', () => {
  it('says who the artist is, then what the antenna played', () => {
    show({ status: 'ready', profile: makeArtistProfile() });

    expect(screen.getByRole('heading', { level: 1, name: 'Hania Rani' })).toBeInTheDocument();
    expect(screen.getByText('Artiste · Pologne')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Passé sur AubeSonore' })).toBeInTheDocument();
    expect(screen.getByText('F Major')).toBeInTheDocument();
  });

  it('quotes the Wikipedia summary with its source and licence', () => {
    show({ status: 'ready', profile: makeArtistProfile({ summary: SUMMARY }) });

    expect(screen.getByRole('blockquote')).toHaveTextContent(SUMMARY.text);
    expect(screen.getByRole('blockquote')).toHaveAttribute('lang', 'fr');
    expect(screen.getByRole('link', { name: 'Wikipédia' })).toHaveAttribute('href', SUMMARY.url);
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-sa/4.0/'
    );
  });

  it('says when the summary is in the other language', () => {
    show({
      status: 'ready',
      profile: makeArtistProfile({ summary: { ...SUMMARY, lang: 'en' } }),
    });

    expect(screen.getByRole('blockquote')).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('link', { name: 'Wikipédia, en anglais' })).toBeInTheDocument();
  });

  it('says so when no play is recorded yet', () => {
    show({ status: 'ready', profile: makeArtistProfile({ playedOnRadio: [] }) });

    expect(screen.getByText("Aucun passage enregistré pour l'instant.")).toBeInTheDocument();
  });

  it('shows nothing a source could not fill', () => {
    show({ status: 'ready', profile: makeArtistProfile({ facts: null }) });

    expect(screen.queryByRole('blockquote')).not.toBeInTheDocument();
    expect(screen.queryByText(/Artiste ·/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Écouter ailleurs' })).not.toBeInTheDocument();
  });

  it('opens outside links in a new tab, named by platform', () => {
    show({
      status: 'ready',
      profile: makeArtistProfile({
        links: [
          { platform: 'deezer', url: 'https://www.deezer.com/artist/1' },
          { platform: 'official', url: 'https://haniarani.com/' },
        ],
      }),
    });

    expect(screen.getByRole('link', { name: 'Deezer' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Site officiel' })).toHaveAttribute(
      'href',
      'https://haniarani.com/'
    );
  });

  it('says the artist is not found, or that the page failed', () => {
    const { rerender } = show({ status: 'missing' });
    expect(screen.getByRole('heading', { name: 'Artiste introuvable.' })).toBeInTheDocument();

    rerender(<ArtistPageView state={{ status: 'error' }} />);
    expect(screen.getByRole('heading', { name: 'Page indisponible.' })).toBeInTheDocument();
  });

  it('leads back to the live from the header', () => {
    show({ status: 'loading' });

    expect(screen.getByRole('link', { name: 'Revenir au direct' })).toHaveAttribute('href', '/');
  });
});

describe('factsLine', () => {
  const group = {
    kind: 'group' as const,
    place: 'Paris',
    country: 'FR',
    formed: 1993,
    ended: 2021,
    active: false,
  };

  it('names a group, where and when it played', () => {
    expect(factsLine(group)).toBe('Groupe · Paris, France · 1993 – 2021');
    expect(factsLine({ ...group, ended: null, active: true })).toBe(
      'Groupe · Paris, France · depuis 1993'
    );
  });

  it('never says "since" of a group that ended on an unknown date', () => {
    expect(factsLine({ ...group, ended: null })).toBe('Groupe · Paris, France · formé en 1993');
  });

  it('says nothing when MusicBrainz states nothing', () => {
    expect(
      factsLine({
        kind: null,
        place: null,
        country: null,
        formed: null,
        ended: null,
        active: false,
      })
    ).toBeNull();
  });
});

describe('ArtistPageView, lineage and contemporaries', () => {
  it('names each model by its role in the source, and links the ones the antenna played', () => {
    show(ready, {
      status: 'ready',
      artist: makeFriezeArtist({
        lineage: [
          {
            side: 'inspiration',
            artist: {
              ...ref('mb-t', 'Lindsay Kemp', { id: 'p-1', slug: 'lindsay-kemp' }),
              yEnd: 2018,
            },
            source: 'mb_teacher',
          },
          {
            side: 'inspiration',
            artist: { ...ref('mb-a', 'Anthony Newley'), yEnd: null },
            source: 'mb_tribute',
          },
        ],
      }),
    });

    expect(screen.getByRole('heading', { name: 'Ses modèles' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lindsay Kemp' })).toHaveAttribute(
      'href',
      '/artist/p-1/lindsay-kemp'
    );
    expect(screen.getByText('professeur')).toBeInTheDocument();
    expect(screen.getByText('Anthony Newley').tagName).toBe('SPAN');
    expect(screen.getByText('honoré')).toBeInTheDocument();
  });

  it('says no source is known rather than leaving a side blank', () => {
    show(ready, { status: 'ready', artist: makeFriezeArtist() });

    expect(screen.getAllByText('Aucune source connue.')).toHaveLength(3);
  });

  it('shows the first twelve heirs and counts the rest', () => {
    const lineage = Array.from({ length: 15 }, (_, i) => ({
      side: 'descendant' as const,
      artist: { ...ref(`mb-${i}`, `Pupil ${i}`), yEnd: null },
      source: 'mb_teacher',
    }));

    show(ready, { status: 'ready', artist: makeFriezeArtist({ lineage }) });

    expect(screen.getAllByText('élève')).toHaveLength(12);
    expect(screen.getByText('Et 3 autres.')).toBeInTheDocument();
  });

  it('counts tribute acts under their own label instead of mixing them with the heirs', () => {
    const tributes = Array.from({ length: 30 }, (_, i) => ({
      side: 'descendant' as const,
      artist: { ...ref(`mb-t${i}`, `Tribute ${i}`), yEnd: null },
      source: 'mb_tribute',
    }));
    const heir = {
      side: 'descendant' as const,
      artist: { ...ref('mb-h', 'Dave Rodgers'), disambiguation: 'Eurobeat artist', yEnd: 2024 },
      source: 'mb_named_after',
    };

    show(ready, { status: 'ready', artist: makeFriezeArtist({ lineage: [heir, ...tributes] }) });

    expect(screen.getByText('Dave Rodgers')).toBeInTheDocument();
    expect(screen.getByText('Eurobeat artist · porte son nom')).toBeInTheDocument();
    expect(screen.queryByText('Tribute 0')).not.toBeInTheDocument();
    expect(screen.getByText('Groupes hommage : 30.')).toBeInTheDocument();
  });

  it('gives each contemporary the genres it shares and the scene that matched', () => {
    show(ready, {
      status: 'ready',
      artist: makeFriezeArtist({
        contemporaries: {
          total: 30,
          offset: 0,
          items: [
            {
              artist: { ...ref('mb-c', 'Hot Chocolate'), yPresenceEnd: 1987 },
              scene: 'begin_area',
              sharedGenres: ['soul', 'pop'],
              jaccard: 0.4,
            },
          ],
        },
      }),
    });

    expect(screen.getByText('soul, pop · même lieu')).toBeInTheDocument();
    expect(screen.getByText('1960 – 1987')).toBeInTheDocument();
    expect(screen.getByText('Et 29 autres.')).toBeInTheDocument();
  });

  it('shows nothing of musilogy while it loads, fails, or does not know the artist', () => {
    for (const lineage of [
      { status: 'loading' as const },
      { status: 'error' as const },
      { status: 'ready' as const, artist: null },
      { status: 'none' as const },
    ]) {
      const { unmount } = show(ready, lineage);
      expect(screen.queryByRole('heading', { name: 'Ses modèles' })).not.toBeInTheDocument();
      unmount();
    }
  });
});
