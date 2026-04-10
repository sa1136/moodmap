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

/** One Commons request at a time — avoids rate limits and keeps throttle honest under concurrency. */
let commonsChain: Promise<unknown> = Promise.resolve();
function runCommonsSerialized<T>(fn: () => Promise<T>): Promise<T> {
  const p = commonsChain.then(fn, fn);
  commonsChain = p.then(() => undefined).catch(() => undefined);
  return p;
}

type CommonsPage = {
  imageinfo?: { thumburl?: string; url?: string }[];
};

async function searchCommonsFiles(gsrsearch: string): Promise<string[] | null> {
  const q = gsrsearch.trim();
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
        gsrlimit: 8,
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

/**
 * Search Commons "File:" namespace for images matching place name + city.
 * Falls back to place name only when "name + city" has no file hits (common for small venues).
 */
export async function getWikimediaCommonsPhotoUrls(
  placeName: string,
  city: string
): Promise<string[] | null> {
  return runCommonsSerialized(async () => {
    const name = placeName.trim();
    const full = [name, city].filter(Boolean).join(' ').trim();
    if (full.length < 2) return null;

    let urls = await searchCommonsFiles(full);
    if (urls?.length) return urls;

    if (name.length >= 3 && full.toLowerCase() !== name.toLowerCase()) {
      urls = await searchCommonsFiles(name);
    }

    return urls?.length ? urls : null;
  });
}
