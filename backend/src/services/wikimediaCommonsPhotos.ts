import axios from 'axios';

/**
 * Free venue-related images from Wikimedia Commons (no API key).
 * @see https://commons.wikimedia.org/wiki/Commons:API
 * @see https://meta.wikimedia.org/wiki/User-Agent_policy
 */
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';

const USER_AGENT =
  'MoodMap/1.0 (local dev; https://github.com/sa1136/moodmap) axios';

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 350;

async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = lastRequestAt + MIN_INTERVAL_MS - now;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

type CommonsPage = {
  imageinfo?: { thumburl?: string; url?: string }[];
};

/**
 * Search Commons "File:" namespace for images matching place name + city.
 * Results are not guaranteed to be the exact business; good free upgrade vs random stock.
 */
export async function getWikimediaCommonsPhotoUrls(
  placeName: string,
  city: string
): Promise<string[] | null> {
  const q = [placeName, city].filter(Boolean).join(' ').trim();
  if (q.length < 2) return null;

  try {
    await throttle();
    const { data } = await axios.get(COMMONS_API, {
      params: {
        action: 'query',
        format: 'json',
        formatversion: '2',
        generator: 'search',
        gsrsearch: q,
        gsrnamespace: 6,
        gsrlimit: 6,
        prop: 'imageinfo',
        iiprop: 'url',
        iiurlwidth: 960,
      },
      timeout: 15000,
      headers: { 'User-Agent': USER_AGENT },
    });

    const pages: CommonsPage[] = data.query?.pages ?? [];
    if (!pages.length) return null;

    const urls: string[] = [];
    for (const p of pages) {
      const ii = p.imageinfo?.[0];
      const u = ii?.thumburl || ii?.url;
      if (typeof u === 'string' && u.startsWith('https://')) {
        urls.push(u);
      }
      if (urls.length >= 2) break;
    }

    return urls.length ? urls : null;
  } catch (e: unknown) {
    console.warn('[Wikimedia Commons] image search failed:', (e as Error)?.message || e);
    return null;
  }
}
