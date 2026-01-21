import { scrapeTracksForGenres } from '../scraper.js';

// Interface pour les tracks scrapées
interface ScrapedTrack {
  artist: string;
  title: string;
  tags?: string[];
}

// Type pour les résultats du scraping par genre
type ScrapeResults = Record<string, ScrapedTrack[]>;

const genres: string[] = [
  'indie+rock',
  'pop',
  'electronica',
  'electronic',
  'hip+hop',
  'rock',
  'classical',
  'awesome',
];

const excludedTags: string[] = [
  'trance',
  'metal',
  'dubstep',
  'acid',
  'screamo',
  'easy+listening',
  'heavy+metal',
  'industrial+metal',
  'emo',
  'black+metal',
  'death+metal',
  'hardcore',
  'reggae',
  'trash+metal',
];

(async (): Promise<void> => {
  console.time('scrape');
  const results: ScrapeResults = await scrapeTracksForGenres(genres, 1, excludedTags);
  console.timeEnd('scrape');

  // ------------------------------
  //  Vérification des doublons
  // ------------------------------
  const flat: ScrapedTrack[] = Object.values(results).flat();
  const uniq: Set<string> = new Set(
    flat.map((t: ScrapedTrack) => `${t.artist.toLowerCase()}-${t.title.toLowerCase()}`)
  );
  const total: number = flat.length;

  console.log(`\n🎧  Total récupéré : ${total}`);
  console.log(`✅  Uniques        : ${uniq.size}`);

  if (total !== uniq.size) {
    console.log('❌  DUPLICATES FOUND\n');
    // Affiche exactement quels titres sont dupliqués
    const seen: Set<string> = new Set();
    flat.forEach(({ artist, title }: ScrapedTrack) => {
      const key = `${artist.toLowerCase()}-${title.toLowerCase()}`;
      if (seen.has(key)) {
        console.log(`· ${artist} – ${title}`);
      } else {
        seen.add(key);
      }
    });
    process.exit(1);
  } else {
    console.log('🎉  Aucun doublon détecté');
    process.exit(0);
  }
})();
