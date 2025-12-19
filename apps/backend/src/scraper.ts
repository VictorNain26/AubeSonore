import axios from 'axios';
import * as cheerio from 'cheerio';

interface Track {
  artist: string;
  title: string;
  tags: string[];
}

interface ScrapeResults {
  [genre: string]: Track[];
}

export async function scrapeTracksForGenres(
  genres: string[],
  pages = 1,
  excludedTags: string[] = [],
): Promise<ScrapeResults> {
  const results: ScrapeResults = {};
  const seenGlobal = new Set<string>();

  for (const genre of genres) {
    results[genre] = [];
    const seenArtistsGenre = new Set<string>();

    for (let page = 1; page <= pages; page++) {
      const url = `https://hypem.com/tags/${genre}${page > 1 ? `/${  page}` : ''}`;

      try {
        const res = await axios.get(url, {
          headers: { 'User-Agent': 'OurMusicBot/1.0' },
        });

        const newTracks = parseTracksFromHTML(
          res.data,
          excludedTags,
          seenArtistsGenre,
          seenGlobal,
        );

        console.log(`📥 ${newTracks.length} nouveaux titres pour ${genre} (page ${page})`);
        results[genre].push(...newTracks);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Scraper Error] (${url}) : ${errorMessage}`);
      }
    }
  }

  return results;
}

function parseTracksFromHTML(
  html: string,
  excludedTags: string[] = [],
  seenArtistsGenre: Set<string>,
  seenGlobal: Set<string>,
): Track[] {
  const $ = cheerio.load(html);
  const output: Track[] = [];

  $('h3.track_name').each((_, el) => {
    const artist = $(el).find('a.artist').text().trim();
    const title = $(el).find('a.track').text().trim();
    if (!artist || !title) {
      return;
    }

    const globalKey = `${artist.toLowerCase()}-${title.toLowerCase()}`;
    if (seenGlobal.has(globalKey)) {
      return;
    }

    if (seenArtistsGenre.has(artist.toLowerCase())) {
      return;
    }

    const tags = $(el)
      .closest('.section-player')
      .find('ul.tags a')
      .map((_, tag) => $(tag).text().trim().toLowerCase())
      .get();

    if (excludedTags.some(tag => tags.includes(tag))) {
      return;
    }

    seenGlobal.add(globalKey);
    seenArtistsGenre.add(artist.toLowerCase());
    output.push({ artist, title, tags });
  });

  return output;
}
