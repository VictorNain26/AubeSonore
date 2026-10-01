// Writes the home page as static HTML in each language, so crawlers that do
// not run JavaScript (AI crawlers included) read the real page. Runs after
// `vite build` (client) and `vite build --ssr src/entry-server.tsx`.
// Pre-rendering pattern: https://vite.dev/guide/ssr#pre-rendering-ssg
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const SITE = 'https://aubesonore.fr';
const PAGES = [
  { locale: 'fr', path: '/', file: 'dist/index.html', ogLocale: 'fr_FR' },
  { locale: 'en', path: '/en/', file: 'dist/en/index.html', ogLocale: 'en_GB' },
];

const { pageHtml, meta } = await import('../dist-ssr/entry-server.js');
const template = await readFile('dist/index.html', 'utf8');
const base = meta('fr');

const alternates = [
  ...PAGES.map((p) => `<link rel="alternate" hreflang="${p.locale}" href="${SITE}${p.path}" />`),
  `<link rel="alternate" hreflang="x-default" href="${SITE}/" />`,
].join('\n    ');

function replaceOrFail(html, from, to) {
  if (!html.includes(from)) throw new Error(`prerender: "${from}" not found in index.html`);
  return html.replaceAll(from, to);
}

for (const page of PAGES) {
  const { title, description } = meta(page.locale);
  let html = template;
  html = replaceOrFail(html, '<html lang="fr">', `<html lang="${page.locale}">`);
  html = replaceOrFail(html, base.title, title);
  html = replaceOrFail(html, base.description, description);
  html = replaceOrFail(
    html,
    '<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:locale" content="${page.ogLocale}" />`
  );
  html = replaceOrFail(
    html,
    `<link rel="canonical" href="${SITE}/" />`,
    `<link rel="canonical" href="${SITE}${page.path}" />\n    ${alternates}`
  );
  html = replaceOrFail(
    html,
    `<meta property="og:url" content="${SITE}/" />`,
    `<meta property="og:url" content="${SITE}${page.path}" />`
  );
  html = replaceOrFail(
    html,
    '<div id="root"></div>',
    `<div id="root">${await pageHtml(page.locale)}</div>`
  );
  await mkdir(new URL(`../${page.file.replace(/[^/]+$/, '')}`, import.meta.url), {
    recursive: true,
  });
  await writeFile(page.file, html);
  console.log(`prerendered ${page.path} (${page.locale})`);
}

await rm('dist-ssr', { recursive: true, force: true });
