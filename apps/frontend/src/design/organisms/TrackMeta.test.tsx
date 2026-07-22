// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrackMetaView } from './TrackMeta';

const inkFlip = { initial: {}, animate: {}, exit: {}, transition: {} } as never;
const base = {
  inkFlip,
  artist: 'Some Artist',
  shId: 1,
};

describe('TrackMetaView', () => {
  it('exposes the full title via the title attribute and clamps it', () => {
    const long = 'A Very Long Track Title That Would Otherwise Wrap Across Many Lines';
    render(<TrackMetaView {...base} title={long} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('title', long);
    expect(heading.className).toContain('line-clamp-2');
  });
});
