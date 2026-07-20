interface ShareTrackInput {
  title: string;
  artist: string;
  url: string;
}

export async function shareTrack({
  title,
  artist,
  url,
}: ShareTrackInput): Promise<'shared' | 'copied'> {
  const text = `« ${title} — ${artist} », découvert sur AubeSonore`;
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
