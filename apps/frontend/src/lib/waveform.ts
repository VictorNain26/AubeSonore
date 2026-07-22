// Géométrie du tracé d'antenne (« le fil »). Fonctions pures, testables sans
// canvas. L'onde n'est pas une timeline : chaque point est traité pareil,
// amplitude homogène sur toute la largeur (aucun rétrécissement latéral).

/** Mappe un index de point sur une bande de fréquence, réparti linéairement. */
export function sampleBin(
  index: number,
  pointsCount: number,
  startBin: number,
  endBin: number
): number {
  const usableBins = endBin - startBin;
  const ratio = pointsCount > 1 ? index / (pointsCount - 1) : 0;
  return startBin + Math.floor(ratio * (usableBins - 1));
}

/** Décalage vertical normalisé [-1, 1] d'un point du tracé. */
export function waveOffset(value: number, index: number, time: number, isPlaying: boolean): number {
  if (isPlaying) {
    return (value - 0.15) * Math.sin(index * 0.85 + time * 2.2);
  }
  // Repos : respiration lente, basse amplitude, homogène (pas de badge LIVE).
  return 0.12 * Math.sin(index * 0.5 + time * 0.6);
}
