const hsl2rgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [r + m, g + m, b + m];
};
const lum = (rgb) =>
  rgb
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [l1, l2] = [lum(hsl2rgb(...a)), lum(hsl2rgb(...b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const mix = (ink, paper, pct) =>
  hsl2rgb(...ink).map((v, i) => v * pct + hsl2rgb(...paper)[i] * (1 - pct));
const ratioMixed = (ink, paper, pct) => {
  const [l1, l2] = [lum(mix(ink, paper, pct)), lum(hsl2rgb(...paper))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const MOMENTS = {
  dawn: { paper: [10, 45, 93], ink: [350, 25, 12], accent: [345, 55, 45] },
  day: { paper: [210, 36, 97], ink: [220, 26, 12], accent: [214, 74, 38] },
  dusk: { paper: [270, 20, 93], ink: [270, 20, 12], accent: [30, 85, 33] },
  night: { paper: [240, 18, 10], ink: [40, 30, 92], accent: [230, 45, 74] },
};
let fail = false;
for (const [name, m] of Object.entries(MOMENTS)) {
  const accent = ratio(m.accent, m.paper);
  const inkFaint = ratioMixed(m.ink, m.paper, 0.63);
  const ok = accent >= 4.5 && inkFaint >= 4.5;
  if (!ok) fail = true;
  console.log(
    `${name}: accent/paper ${accent.toFixed(2)} inkFaint/paper ${inkFaint.toFixed(2)} ${ok ? 'OK' : 'FAIL'}`
  );
}
process.exit(fail ? 1 : 0);
