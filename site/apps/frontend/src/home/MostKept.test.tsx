// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MostKeptView } from './MostKept';

const entry = (title: string, likes: number) => ({
  title,
  artist: 'Artiste',
  artworkUrl: null,
  likes,
});

describe('MostKeptView', () => {
  it('ranks the week, then switches to all time', async () => {
    render(
      <MostKeptView
        trends={{
          week: [entry('Nüchtern', 3), entry('Oh No', 1)],
          allTime: [entry('Sleep Apnea', 9)],
        }}
        status="ready"
      />
    );

    expect(screen.getByText('Nüchtern')).toBeInTheDocument();
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(screen.getByText('gardé 3 fois')).toBeInTheDocument();
    expect(screen.getByText('gardé 1 fois')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Depuis le début' }));
    expect(await screen.findByText('Sleep Apnea')).toBeInTheDocument();
  });

  it('shows at most five tracks', () => {
    const week = Array.from({ length: 8 }, (_, i) => entry(`Titre ${i}`, 8 - i));
    render(<MostKeptView trends={{ week, allTime: [] }} status="ready" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('invites to keep the first track of an empty week', () => {
    render(<MostKeptView trends={{ week: [], allTime: [] }} status="ready" />);
    expect(
      screen.getByText('Rien de gardé cette semaine. Le premier, ce sera peut-être vous.')
    ).toBeInTheDocument();
  });

  it('says the ranking is unavailable on error', () => {
    render(<MostKeptView trends={null} status="error" />);
    expect(screen.getByText("Le classement est indisponible pour l'instant.")).toBeInTheDocument();
  });
});
