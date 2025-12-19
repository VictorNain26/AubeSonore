/**
 * LikedTrack model - consistent with database schema
 */
export interface LikedTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  youtubeUrl: string;
  userId: string;
}

/**
 * New track creation (without generated fields)
 */
export interface NewLikedTrack {
  title: string;
  artist: string;
  artwork: string;
  youtubeUrl: string;
  userId: string;
}

/**
 * Track from scraper (Hypem)
 */
export interface ScrapedTrack {
  artist: string;
  title: string;
  tags: string[];
}

/**
 * Scrape results by genre
 */
export interface ScrapeResults {
  [genre: string]: ScrapedTrack[];
}
