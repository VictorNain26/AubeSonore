import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/design/tokens.css'),
  'utf8'
);

const block = (selector) => {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return css.slice(open + 1, close);
};

const parseVars = (text) => {
  const vars = {};
  for (const m of text.matchAll(/--([\w-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/g)) {
    vars[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return vars;
};

const oklchToLinearSrgb = ([L, C, H]) => {
  const h = (H * Math.PI) / 180;
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const [l, m, s] = [l_ ** 3, m_ ** 3, s_ ** 3];
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => Math.min(1, Math.max(0, c)));
};

const luminance = (rgb) => rgb.reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const mix = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));

const themes = {
  light: parseVars(block(':root')),
  dark: parseVars(block("[data-theme='dark']")),
};

let fail = false;
for (const [name, vars] of Object.entries(themes)) {
  const c = (key) => {
    if (!vars[key]) throw new Error(`missing --${key} in ${name}`);
    return oklchToLinearSrgb(vars[key]);
  };
  const glow = mix(c('dawn-tint'), c('surface'), 0.3);
  const pairs = [
    ['text/surface', c('text'), c('surface'), 4.5],
    ['text-muted/surface', c('text-muted'), c('surface'), 4.5],
    ['text-faint/surface', c('text-faint'), c('surface'), 4.5],
    ['text/surface-raised', c('text'), c('surface-raised'), 4.5],
    ['accent/surface', c('accent'), c('surface'), 3.0],
    ['on-accent/accent', c('on-accent'), c('accent'), 4.5],
    ['text/dawn-glow', c('text'), glow, 4.5],
  ];
  for (const [label, fg, bg, floor] of pairs) {
    const r = ratio(fg, bg);
    const ok = r >= floor;
    if (!ok) fail = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${label} ${r.toFixed(2)} (min ${floor})`);
  }
}
process.exit(fail ? 1 : 0);
