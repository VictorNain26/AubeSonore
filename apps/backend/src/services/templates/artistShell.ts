import type { ArtistProfile } from '@aubesonore/shared-types/client';
import { escapeHtml } from './sharePage';

// Only Deezer's CDN may end up in og:image: an attacker-controlled host there
// would let a poisoned profile dictate what social networks display for us.
const ALLOWED_IMAGE_HOSTS = ['cdn-images.dzcdn.net', 'e-cdns-images.dzcdn.net', 'cdn.deezer.com'];

const OG_DESCRIPTION_MAX = 200;

function isAllowedImage(url: string | null): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function renderArtistShell(
  shell: string,
  profile: ArtistProfile,
  pageUrl: string
): Promise<string> {
  const title = `${profile.name} | AubeSonore`;
  const description = profile.bio
    ? truncate(profile.bio, OG_DESCRIPTION_MAX)
    : `${profile.name} — passé sur AubeSonore, radio de découverte musicale.`;

  const tags: Array<[attribute: string, key: string, value: string]> = [
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:type', 'profile'],
    ['property', 'og:url', pageUrl],
    ['property', 'og:site_name', 'AubeSonore'],
    ['name', 'twitter:card', 'summary_large_image'],
  ];
  if (isAllowedImage(profile.image)) tags.push(['property', 'og:image', profile.image]);

  const rewriter = new HTMLRewriter()
    .on('title', {
      element(element) {
        // setInnerContent defaults to text mode, so HTMLRewriter escapes this.
        element.setInnerContent(title);
      },
    })
    .on('head', {
      element(element) {
        // append() with html:true inserts raw markup — every interpolated
        // value goes through escapeHtml first.
        for (const [attribute, key, value] of tags) {
          element.append(`<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`, {
            html: true,
          });
        }
      },
    });

  return rewriter
    .transform(new Response(shell, { headers: { 'content-type': 'text/html' } }))
    .text();
}
