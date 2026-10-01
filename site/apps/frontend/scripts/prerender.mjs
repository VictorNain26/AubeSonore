// Writes the site as static HTML so crawlers that do not run JavaScript (AI
// crawlers included) read the real pages. Runs after `vite build` (client)
// and `vite build --ssr src/entry-server.tsx`.
// Pre-rendering pattern: https://vite.dev/guide/ssr#pre-rendering-ssg
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const SITE = 'https://aubesonore.fr';
const { pageHtml, staticPageHtml, meta } = await import('../dist-ssr/entry-server.js');
const template = await readFile('dist/index.html', 'utf8');
const base = meta('fr');

function replaceOrFail(html, from, to) {
  if (!html.includes(from)) throw new Error(`prerender: "${from}" not found in index.html`);
  return html.replaceAll(from, to);
}

function alternates(pages) {
  return [
    ...pages.map((p) => `<link rel="alternate" hreflang="${p.locale}" href="${SITE}${p.path}" />`),
    `<link rel="alternate" hreflang="x-default" href="${SITE}${pages[0].path}" />`,
  ].join('\n    ');
}

/** Static pages carry no app script: they are read, never hydrated. */
function withoutScripts(html) {
  return html
    .replace(/<script type="module"[^>]*><\/script>\s*/g, '')
    .replace(/<link rel="modulepreload"[^>]*>\s*/g, '')
    .replace(/<script id="vite-plugin-pwa:register-sw"[^>]*><\/script>\s*/g, '');
}

async function write(page, body, { siblings, noindex = false, hydrate = true }) {
  const { title, description } = meta(page.locale, page.kind);
  let html = template;
  html = replaceOrFail(html, '<html lang="fr">', `<html lang="${page.locale}">`);
  html = replaceOrFail(html, base.title, title);
  html = replaceOrFail(html, base.description, description);
  html = replaceOrFail(html, `${SITE}/og-fr.png`, `${SITE}/og-${page.locale}.png`);
  html = replaceOrFail(
    html,
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:locale" content="${page.locale === 'fr' ? 'fr_FR' : 'en_GB'}" />`
  );
  html = replaceOrFail(
    html,
    `<meta property="og:url" content="${SITE}/" />`,
    `<meta property="og:url" content="${SITE}${page.path}" />`
  );
  html = replaceOrFail(
    html,
    `<link rel="canonical" href="${SITE}/" />`,
    noindex
      ? '<meta name="robots" content="noindex" />'
      : `<link rel="canonical" href="${SITE}${page.path}" />\n    ${alternates(siblings)}`
  );
  html = replaceOrFail(html, '<div id="root"></div>', `<div id="root">${body}</div>`);
  if (!hydrate) html = withoutScripts(html);
  await mkdir(dirname(page.file), { recursive: true });
  await writeFile(page.file, html);
  console.log(`prerendered ${page.file}`);
}

const home = [
  { kind: 'home', locale: 'fr', path: '/', file: 'dist/index.html' },
  { kind: 'home', locale: 'en', path: '/en/', file: 'dist/en/index.html' },
];
const legal = [
  { kind: 'legal', locale: 'fr', path: '/mentions-legales/', file: 'dist/mentions-legales/index.html' },
  { kind: 'legal', locale: 'en', path: '/en/legal/', file: 'dist/en/legal/index.html' },
];

for (const page of home) await write(page, await pageHtml(page.locale), { siblings: home });
for (const page of legal) {
  await write(page, await staticPageHtml('legal', page.locale), { siblings: legal, hydrate: false });
}
await write(
  { kind: 'notFound', locale: 'fr', path: '/404', file: 'dist/404.html' },
  await staticPageHtml('notFound', 'fr'),
  { siblings: home, noindex: true, hydrate: false }
);

await rm('dist-ssr', { recursive: true, force: true });
