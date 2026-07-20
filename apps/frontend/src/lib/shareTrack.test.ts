import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareTrack } from './shareTrack';

const input = {
  title: 'Balance Act',
  artist: 'Psychic Lines',
  url: 'https://aubesonore.fr',
};

afterEach(() => vi.unstubAllGlobals());

describe('shareTrack', () => {
  it('uses navigator.share when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await expect(shareTrack(input)).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'AubeSonore',
      text: '« Balance Act — Psychic Lines », découvert sur AubeSonore',
      url: 'https://aubesonore.fr',
    });
  });

  it('falls back to clipboard when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await expect(shareTrack(input)).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith(
      '« Balance Act — Psychic Lines », découvert sur AubeSonore https://aubesonore.fr'
    );
  });

  it('treats user-cancelled share as shared (no fallback)', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancel', 'AbortError'));
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } });
    await expect(shareTrack(input)).resolves.toBe('shared');
  });
});
