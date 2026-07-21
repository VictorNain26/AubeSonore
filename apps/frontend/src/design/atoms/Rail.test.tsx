// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Rail } from './Rail';

describe('Rail', () => {
  it('renders children inside a labelled list', () => {
    render(
      <Rail ariaLabel="Vient de passer">
        <div role="listitem">Un</div>
        <div role="listitem">Deux</div>
      </Rail>
    );
    expect(screen.getByRole('list', { name: 'Vient de passer' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
