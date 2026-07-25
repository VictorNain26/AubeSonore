import { PLATFORM_NAMES } from '@aubesonore/shared-types/client';
import type { PreferredPlatform } from '@aubesonore/shared-types/client';
import type { SonglinkResult } from '../songlinkService';
import { env } from '../../config/env';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface SharePageInput {
  title: string;
  artist: string;
  /** Canonical URL of this share page, used for og:url. */
  shareUrl: string;
  songlink: SonglinkResult | null;
}

// Static HTML page (no JS): link crawlers must read the OG meta without
// executing scripts, so the CSP allows only inline styles and https images.
export function renderSharePage({ title, artist, shareUrl, songlink }: SharePageInput): string {
  const artworkUrl = songlink?.artworkUrl?.startsWith('https://') ? songlink.artworkUrl : undefined;
  const platformLinks = songlink
    ? (Object.entries(songlink.platformLinks) as Array<[PreferredPlatform, string]>)
        .filter(([, url]) => url.startsWith('https://'))
        .slice(0, 4)
    : [];

  const ogImage = artworkUrl
    ? `\n    <meta property="og:image" content="${escapeHtml(artworkUrl)}" />`
    : '';
  const cover = artworkUrl
    ? `\n      <img class="cover" src="${escapeHtml(artworkUrl)}" alt="Pochette de ${escapeHtml(title)}" width="240" height="240" />`
    : '';
  const platforms =
    platformLinks.length > 0
      ? `\n      <nav class="platforms">\n${platformLinks
          .map(
            ([id, url]) =>
              `        <a class="platform" href="${escapeHtml(url)}" rel="noopener noreferrer">Écouter sur ${escapeHtml(PLATFORM_NAMES[id])}</a>`
          )
          .join('\n')}\n      </nav>`
      : '';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} — ${escapeHtml(artist)} | AubeSonore</title>
    <meta property="og:title" content="« ${escapeHtml(title)} — ${escapeHtml(artist)} »" />
    <meta property="og:description" content="Entendu sur AubeSonore — écoutez le direct" />
    <meta property="og:type" content="music.song" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:site_name" content="AubeSonore" />
    <meta name="twitter:card" content="summary_large_image" />${ogImage}
    <style>
      * { margin: 0; box-sizing: border-box; }
      body {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem 1rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        color: #292524;
        background: linear-gradient(160deg, #fff7ed 0%, #fde8d7 45%, #f9dce0 100%);
      }
      .card {
        width: 100%;
        max-width: 24rem;
        padding: 2rem;
        text-align: center;
        background: #fffdfb;
        border-radius: 1rem;
        box-shadow: 0 8px 30px rgb(87 42 12 / 12%);
      }
      .cover {
        width: 240px;
        height: 240px;
        max-width: 100%;
        border-radius: 0.75rem;
        object-fit: cover;
      }
      h1 { margin-top: 1.25rem; font-size: 1.5rem; line-height: 1.25; }
      .artist { margin-top: 0.375rem; font-size: 1.125rem; color: #57534e; }
      .heard { margin-top: 1rem; font-size: 0.875rem; color: #78716c; }
      .cta {
        display: inline-block;
        margin-top: 1.5rem;
        padding: 0.75rem 1.75rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fffdfb;
        background: #292524;
        border-radius: 9999px;
        text-decoration: none;
      }
      .platforms { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
      .platform {
        display: block;
        padding: 0.625rem 1rem;
        font-size: 0.9375rem;
        color: #292524;
        border: 1px solid #d6d3d1;
        border-radius: 0.5rem;
        text-decoration: none;
      }
      footer { margin-top: 2rem; font-size: 0.75rem; color: #78716c; }
    </style>
  </head>
  <body>
    <main class="card">${cover}
      <h1>${escapeHtml(title)}</h1>
      <p class="artist">${escapeHtml(artist)}</p>
      <p class="heard">Entendu sur AubeSonore</p>
      <a class="cta" href="${escapeHtml(env.FRONTEND_BASE_URL)}">Écouter le direct</a>${platforms}
      <footer>AubeSonore — radio de découverte musicale</footer>
    </main>
  </body>
</html>
`;
}
