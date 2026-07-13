interface ShareTrackInput {
  title: string;
  artist: string;
  url: string;
  momentLabel: string;
}

export async function shareTrack({
  title,
  artist,
  url,
  momentLabel,
}: ShareTrackInput): Promise<'shared' | 'copied'> {
  const text = `« ${title} — ${artist} », découvert ${momentLabel} sur AubeSonore`;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'AubeSonore', text, url });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) throw err;
    }
    return 'shared';
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  return 'copied';
}
