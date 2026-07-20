const moments = {
  night: { paper: [240, 18, 10], ink: [40, 30, 92], accent: [230, 45, 74], sky: [238, 22, 13] },
  dawn: { paper: [10, 45, 93], ink: [350, 25, 12], accent: [345, 55, 45], sky: [8, 55, 89] },
  day: { paper: [210, 36, 97], ink: [220, 26, 12], accent: [214, 74, 38], sky: [210, 45, 94] },
  dusk: { paper: [292, 24, 90], ink: [288, 24, 6], accent: [30, 85, 29], sky: [318, 34, 84] },
};
const hslToRgb = ([h, s, l]) => {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
};
const mix = (a, b, w) => a.map((v, i) => v * w + b[i] * (1 - w));
const lum = (rgb) =>
  rgb
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (f, b) => {
  const [l1, l2] = [lum(f), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
let fail = false;
for (const [name, m] of Object.entries(moments)) {
  const paper = hslToRgb(m.paper),
    ink = hslToRgb(m.ink),
    sky = hslToRgb(m.sky);
  const pairs = {
    'ink/paper': [ink, paper],
    'ink-soft/paper': [mix(ink, paper, 0.75), paper],
    'ink-faint/paper': [mix(ink, paper, 0.66), paper],
    'ink-faint/sky': [mix(ink, paper, 0.66), sky],
    'accent/paper': [hslToRgb(m.accent), paper],
  };
  for (const [pair, [f, b]] of Object.entries(pairs)) {
    const r = ratio(f, b);
    const ok = r >= 4.5;
    if (!ok) fail = true;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${pair} ${r.toFixed(2)}`);
  }
}
process.exit(fail ? 1 : 0);
