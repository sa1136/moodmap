import axios from 'axios';
import { Place } from './aiService';
import { photonGeocode } from './geocoding';
import { getWikimediaCommonsPhotoUrls } from './wikimediaCommonsPhotos';

/**
 * Generate a deterministic numeric seed from a string so the same place
 * always gets the same image from Picsum Photos (fallback when no Google key).
 */
function stringToSeed(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) + 1; // 1..1000
}

function getPicsumPlaceImages(placeName: string, city: string, placeType?: string): string[] {
  try {
    const seed1 = stringToSeed(`${placeName}${city}`);
    const seed2 = stringToSeed(`${city}${placeType ?? ''}${placeName}`);

    const images = [`https://picsum.photos/seed/${seed1}/800/600`];
    if (seed2 !== seed1) {
      images.push(`https://picsum.photos/seed/${seed2}/800/600`);
    }
    return images;
  } catch (error) {
    console.warn(`[Images] Could not generate image URLs for ${placeName}:`, error);
    return [];
  }
}

/**
 * Wikimedia Commons (free, no key), then Picsum placeholders.
 */
async function getPlaceImages(
  placeName: string,
  city: string,
  placeType?: string,
  _lat?: number,
  _lng?: number
): Promise<string[]> {
  const wikiUrls = await getWikimediaCommonsPhotoUrls(placeName, city);
  if (wikiUrls?.length) return wikiUrls;
  return getPicsumPlaceImages(placeName, city, placeType);
}

/**
 * Fetch places from OpenStreetMap/Nominatim (100% FREE, no API key required!)
 * This is a great free alternative that doesn't require any registration.
 */
function shortCityLabel(fullAddress: string): string {
  const parts = fullAddress.split(',');
  return parts[0]?.trim() || fullAddress;
}

/** ISO 3166-1 alpha-2 for Nominatim `countrycodes` when the user picked a full address. */
function inferCountryCodes(location: string): string | undefined {
  const t = location.toLowerCase();
  if (
    t.includes('united states') ||
    t.includes('usa') ||
    /\bu\.s\.a\.?\b/.test(t) ||
    /\bu\.s\.?\b/.test(t)
  ) {
    return 'us';
  }
  if (
    t.includes('united kingdom') ||
    t.includes(', england') ||
    t.includes('scotland') ||
    t.includes('wales') ||
    t.includes('northern ireland')
  ) {
    return 'gb';
  }
  if (t.includes('canada')) return 'ca';
  if (t.includes('australia')) return 'au';
  return undefined;
}

/** Nominatim returns OSM tags in `extratags` (with extratags=1); some proxies use `tags`. */
function nominatimOsmTags(result: {
  tags?: Record<string, string>;
  extratags?: Record<string, string> | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const merge = (src?: Record<string, string> | null) => {
    if (!src || typeof src !== 'object') return;
    for (const [k, v] of Object.entries(src)) {
      if (v != null && String(v).trim() !== '' && out[k] === undefined) {
        out[k] = String(v).trim();
      }
    }
  };
  merge(result.tags);
  merge(result.extratags ?? undefined);
  return out;
}

function amenitiesFromOsm(osm: Record<string, string>, fallback: string): string[] {
  const a: string[] = [];
  if (osm.amenity) a.push(osm.amenity);
  if (osm.shop) a.push(osm.shop);
  if (osm.leisure) a.push(osm.leisure);
  if (osm.tourism) a.push(osm.tourism);
  if (a.length === 0) a.push(fallback);
  return a.filter(Boolean);
}

function contactFromOsm(
  osm: Record<string, string>,
  defaultHours: string
): { hours: string; phone: string; website: string } {
  const hours =
    osm.opening_hours || osm['opening_hours:kitchen'] || osm['opening_hours:signed'] || defaultHours;
  const phone = osm.phone || osm['contact:phone'] || '';
  const website = osm.website || osm['contact:website'] || osm.url || '';
  return { hours, phone, website };
}

function cuisineFromOsm(osm: Record<string, string>): string | undefined {
  const c = osm.cuisine;
  if (!c) return undefined;
  const label = c
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean)
    .join(' · ');
  return label || undefined;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nominatim viewbox: min longitude, max latitude, max longitude, min latitude.
 * @see https://nominatim.org/release-docs/latest/api/Search/
 */
function buildViewbox(lat: number, lng: number, radiusKm: number): string {
  const latRad = (lat * Math.PI) / 180;
  const dLat = radiusKm / 111.32;
  const dLon = radiusKm / (111.32 * Math.max(0.25, Math.cos(latRad)));
  const minLon = lng - dLon;
  const maxLon = lng + dLon;
  const minLat = lat - dLat;
  const maxLat = lat + dLat;
  return `${minLon},${maxLat},${maxLon},${minLat}`;
}

// Helper function to add delay (rate limiting for Nominatim)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      const isRateLimit = error.response?.status === 418 || error.response?.status === 429;
      
      if (attempt === maxRetries - 1) {
        // Last attempt failed
        if (isTimeout) {
          console.warn(`[OpenStreetMap] Request timed out after ${maxRetries} attempts`);
        } else if (isRateLimit) {
          console.warn(`[OpenStreetMap] Rate limited after ${maxRetries} attempts`);
        }
        return null;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delayMs = baseDelay * Math.pow(2, attempt);
      if (isRateLimit) {
        // Longer delay for rate limits
        await delay(delayMs * 2);
      } else {
        await delay(delayMs);
      }
    }
  }
  return null;
}

const MAX_DISTANCE_KM = 35;
const VIEWBOX_RADIUS_KM = 26;

export async function fetchPlacesFromOpenStreetMap(
  city: string,
  lat?: number,
  lng?: number,
  mood?: string,
  preferences?: string[]
): Promise<Place[]> {
  try {
    const locationQuery = city.trim();
    const cityName = shortCityLabel(locationQuery);
    const countryCodes = inferCountryCodes(locationQuery);

    console.log(`[OpenStreetMap] Fetching places for location: ${locationQuery}, mood: ${mood}`);

    let searchLat = lat;
    let searchLng = lng;

    if (!searchLat || !searchLng) {
      console.log(`[OpenStreetMap] Geocoding: ${locationQuery}`);
      await delay(1000);

      let geocoded: { lat: number; lng: number } | null = null;

      try {
        const runGeocode = async (useCountryFilter: boolean) => {
          const params: Record<string, string | number> = {
            q: locationQuery,
            format: 'json',
            limit: 5,
            addressdetails: 1,
            'accept-language': 'en',
          };
          if (useCountryFilter && countryCodes) {
            params.countrycodes = countryCodes;
          }
          return axios.get('https://nominatim.openstreetmap.org/search', {
            params,
            headers: { 'User-Agent': 'MoodMap/1.0 (contact: dev@localhost)' },
            timeout: 30000,
          });
        };

        let geocodeResponse = await retryWithBackoff(async () => runGeocode(!!countryCodes));

        if (geocodeResponse?.data?.length === 0 && countryCodes) {
          await delay(1500);
          geocodeResponse = await retryWithBackoff(async () => runGeocode(false));
        }

        if (geocodeResponse?.data?.length) {
          geocoded = {
            lat: parseFloat(geocodeResponse.data[0].lat),
            lng: parseFloat(geocodeResponse.data[0].lon),
          };
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[OpenStreetMap] Nominatim geocode failed for "${locationQuery}": ${msg}`);
      }

      if (!geocoded) {
        const photon = await photonGeocode(locationQuery);
        if (photon) {
          geocoded = { lat: photon.lat, lng: photon.lon };
          console.log(
            `[OpenStreetMap] Geocoded via Photon fallback "${locationQuery}" → ${geocoded.lat}, ${geocoded.lng}`
          );
        }
      }

      if (!geocoded) {
        console.warn(`[OpenStreetMap] Could not geocode: ${locationQuery}`);
        return [];
      }

      searchLat = geocoded.lat;
      searchLng = geocoded.lng;
      console.log(`[OpenStreetMap] Geocoded "${locationQuery}" to: ${searchLat}, ${searchLng}`);
    }

    if (searchLat === undefined || searchLng === undefined) {
      return [];
    }

    const viewbox = buildViewbox(searchLat, searchLng, VIEWBOX_RADIUS_KM);

    const searchTerms = mapMoodToSearchTerms(mood, preferences);
    console.log(`[OpenStreetMap] Search terms for mood "${mood}" with preferences:`, preferences, '→', searchTerms);
    
    const places: Place[] = [];
    
    // Try multiple search terms if the first one doesn't return results
    for (const searchTerm of searchTerms) {
      if (places.length >= 15) break;
      
      try {
        await delay(2000);
        
        // Comma-separated queries perform better on Nominatim than "X in Y" free text.
        const query = `${searchTerm}, ${locationQuery}`;
        console.log(`[OpenStreetMap] Searching for: ${query}`);

        const searchUrl = 'https://nominatim.openstreetmap.org/search';
        const searchParams: Record<string, string | number> = {
          q: query,
          format: 'json',
          limit: 15,
          addressdetails: 1,
          extratags: 1,
          'accept-language': 'en',
          viewbox,
          bounded: 1,
        };
        if (countryCodes) {
          searchParams.countrycodes = countryCodes;
        }

        const searchResponse = await retryWithBackoff(async () => {
          return await axios.get(searchUrl, {
            params: searchParams,
            headers: {
              'User-Agent': 'MoodMap/1.0',
            },
            timeout: 30000,
          });
        });
        
        if (!searchResponse) {
          console.log(`[OpenStreetMap] Request failed for "${query}", trying next search term...`);
          continue; // Skip to next search term
        }

        const results = searchResponse.data || [];
        console.log(`[OpenStreetMap] Found ${results.length} results for "${query}"`);
        
        if (results && results.length > 0) {
          for (const result of results) {
          const rLat = parseFloat(result.lat);
          const rLon = parseFloat(result.lon);
          const distanceKm =
            Number.isFinite(rLat) && Number.isFinite(rLon)
              ? haversineKm(searchLat, searchLng, rLat, rLon)
              : undefined;
          if (
            Number.isFinite(rLat) &&
            Number.isFinite(rLon) &&
            (distanceKm ?? 0) > MAX_DISTANCE_KM
          ) {
            continue;
          }

          const address = result.address || {};
          const name = result.name || result.display_name?.split(',')[0] || 'Place';

          if (places.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            continue;
          }
          
          // Build a cleaner address from address components
          const addressParts: string[] = [];
          if (address.road) addressParts.push(address.road);
          if (address.house_number) addressParts.unshift(address.house_number);
          if (addressParts.length === 0 && address.amenity) {
            // If no street address, use amenity name
            addressParts.push(address.amenity);
          }
          
          // Add city/state/zip
          const cityState: string[] = [];
          if (address.city || address.town || address.village) {
            cityState.push(address.city || address.town || address.village);
          }
          if (address.state) {
            cityState.push(address.state);
          }
          if (address.postcode) {
            cityState.push(address.postcode);
          }
          
          // Format address: "123 Main St, City, State ZIP" or fallback to shorter display_name
          let formattedAddress = '';
          if (addressParts.length > 0) {
            formattedAddress = addressParts.join(' ');
            if (cityState.length > 0) {
              formattedAddress += ', ' + cityState.join(', ');
            }
          } else {
            // Fallback: use first 2-3 parts of display_name (more readable)
            const displayParts = result.display_name?.split(',').slice(0, 3) || [];
            formattedAddress = displayParts.join(',').trim() || cityName;
          }
          
          const osm = nominatimOsmTags(result);
          const amenities = amenitiesFromOsm(osm, result.type || result.class || searchTerm || 'place');
          const { hours, phone, website } = contactFromOsm(osm, 'Hours vary');
          const cuisine = cuisineFromOsm(osm);
          
          // Extract city more accurately (prefer actual city over mall/shopping center names)
          let extractedCity = address.city || address.town || address.village || address.municipality;
          // If city is a shopping center/mall name, try to get the actual city from address
          if (!extractedCity || extractedCity.toLowerCase().includes('mall') || extractedCity.toLowerCase().includes('field')) {
            extractedCity = address.city || address.town || address.village || address.municipality || address.county || cityName;
          }
          
          const placeImages = await getPlaceImages(
            name,
            extractedCity || cityName,
            result.type || result.class || searchTerm,
            rLat,
            rLon
          );
          
          places.push({
            id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
            name,
            type: result.type || result.class || searchTerm || 'Place',
            distanceKm,
            distanceLabel: distanceKm !== undefined ? `${distanceKm.toFixed(1)} km away` : '',
            address: formattedAddress,
            city: extractedCity || cityName,
            description: `A ${searchTerm || 'place'} near ${cityName}.`,
            hours,
            price: '$$',
            phone,
            website,
            cuisine,
            amenities: amenities.filter(Boolean),
            photos: placeImages,
          });
          
          if (places.length >= 15) break;
          }
        } else {
          console.log(`[OpenStreetMap] No results for "${query}", trying next search term...`);
        }
      } catch (error: any) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isRateLimit = error.response?.status === 418 || error.response?.status === 429;
        
        if (isRateLimit) {
          console.warn(`[OpenStreetMap] Rate limited for "${searchTerm}". Waiting longer...`);
          await delay(10000); // Wait 10 seconds for rate limits
          if (searchTerm === searchTerms[searchTerms.length - 1]) {
            break; // Stop if this is the last search term
          }
        } else if (isTimeout) {
          console.warn(`[OpenStreetMap] Timeout for "${searchTerm}", skipping to next term...`);
          // Continue to next search term
        } else {
          console.error(`[OpenStreetMap] Error searching for "${searchTerm}":`, error.message);
          // Continue to next search term
        }
      }
    }

    // If searching in Los Angeles with beach/water preference, try specific beach locations
    if (places.length < 10 && (cityName.toLowerCase().includes('los angeles') || cityName.toLowerCase().includes('la'))) {
      const hasBeachPreference = preferences?.some(p => 
        p.toLowerCase().includes('beach') || 
        p.toLowerCase().includes('water') ||
        p.toLowerCase().includes('ocean')
      ) || false;
      
      if (hasBeachPreference || mood?.toLowerCase() === 'relaxed' || mood?.toLowerCase() === 'energetic') {
        console.log(`[OpenStreetMap] Searching for specific LA beach locations...`);
        const laBeachQueries = [
          'Santa Monica Pier',
          'Venice Beach',
          'Venice Canals',
          'Santa Monica Beach',
          'Manhattan Beach',
          'Redondo Beach Pier'
        ];
        
        for (const beachQuery of laBeachQueries) {
          if (places.length >= 15) break;
          try {
            await delay(2000);
            const searchResponse = await retryWithBackoff(async () => {
              return await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                  q: `${beachQuery}, Los Angeles, California, United States`,
                  format: 'json',
                  limit: 3,
                  addressdetails: 1,
                  extratags: 1,
                  'accept-language': 'en',
                  viewbox,
                  bounded: 1,
                  countrycodes: 'us',
                },
                headers: { 'User-Agent': 'MoodMap/1.0' },
                timeout: 30000,
              });
            });
            
            if (!searchResponse) {
              console.warn(`[OpenStreetMap] Request failed for ${beachQuery}, skipping...`);
              continue;
            }
            
            const results = searchResponse.data || [];
            if (results.length > 0) {
              for (const result of results) {
                const name = result.name || result.display_name?.split(',')[0] || beachQuery;
                if (places.some(p => p.name.toLowerCase() === name.toLowerCase())) continue;
                
                const address = result.address || {};
                const addressParts: string[] = [];
                if (address.road) addressParts.push(address.road);
                if (address.house_number) addressParts.unshift(address.house_number);
                
                const cityState: string[] = [];
                if (address.city || address.town) cityState.push(address.city || address.town);
                if (address.state) cityState.push(address.state);
                if (address.postcode) cityState.push(address.postcode);
                
                let formattedAddress = '';
                if (addressParts.length > 0) {
                  formattedAddress = addressParts.join(' ');
                  if (cityState.length > 0) formattedAddress += ', ' + cityState.join(', ');
                } else {
                  const displayParts = result.display_name?.split(',').slice(0, 3) || [];
                  formattedAddress = displayParts.join(',').trim();
                }
                
                const osmBeach = nominatimOsmTags(result);
                const amenities: string[] = [];
                if (osmBeach.amenity) amenities.push(osmBeach.amenity);
                if (osmBeach.leisure) amenities.push(osmBeach.leisure);
                if (osmBeach.tourism) amenities.push(osmBeach.tourism);
                if (amenities.length === 0) {
                  if (beachQuery.toLowerCase().includes('pier')) {
                    amenities.push('pier');
                  } else if (beachQuery.toLowerCase().includes('canal')) {
                    amenities.push('canal');
                  } else {
                    amenities.push('beach');
                  }
                }
                const beachContact = contactFromOsm(osmBeach, 'Open 24/7');
                const beachCuisine = cuisineFromOsm(osmBeach);
                
                // Determine type for the place
                let placeType = result.type || 'Place';
                if (beachQuery.toLowerCase().includes('pier')) {
                  placeType = 'Pier';
                } else if (beachQuery.toLowerCase().includes('canal')) {
                  placeType = 'Canal';
                } else if (beachQuery.toLowerCase().includes('beach')) {
                  placeType = 'Beach';
                }
                
                // Extract city dynamically
                const extractedCity = address.city || address.town || address.village || address.municipality || 'Los Angeles';
                
                const rLatBeach = parseFloat(result.lat);
                const rLonBeach = parseFloat(result.lon);
                const placeImages = await getPlaceImages(
                  name,
                  extractedCity,
                  placeType,
                  Number.isFinite(rLatBeach) ? rLatBeach : undefined,
                  Number.isFinite(rLonBeach) ? rLonBeach : undefined
                );
                
                places.push({
                  id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
                  name,
                  type: placeType,
                  distanceKm: Number.isFinite(parseFloat(result.lat)) && Number.isFinite(parseFloat(result.lon))
                    ? haversineKm(searchLat, searchLng, parseFloat(result.lat), parseFloat(result.lon))
                    : undefined,
                  distanceLabel: Number.isFinite(parseFloat(result.lat)) && Number.isFinite(parseFloat(result.lon))
                    ? `${haversineKm(searchLat, searchLng, parseFloat(result.lat), parseFloat(result.lon)).toFixed(1)} km away`
                    : '',
                  address: formattedAddress,
                  city: extractedCity,
                  description: `${name} in ${extractedCity}. A popular beach destination.`,
                  hours: beachContact.hours,
                  price: 'Free',
                  phone: beachContact.phone,
                  website: beachContact.website,
                  cuisine: beachCuisine,
                  amenities: amenities.filter(Boolean),
                  photos: placeImages,
                });
              }
            }
          } catch (error: any) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
            if (isTimeout) {
              console.warn(`[OpenStreetMap] Timeout for ${beachQuery}, skipping...`);
            } else {
              console.error(`[OpenStreetMap] Error searching for ${beachQuery}:`, error.message);
            }
          }
        }
      }
    }

    // If no places found with mood-specific terms, try a general search
    if (places.length === 0 && mood) {
      console.log(`[OpenStreetMap] No mood-specific results, trying general search...`);
      try {
        await delay(2000);
        const generalQuery = `attractions, ${locationQuery}`;
        const searchUrl = 'https://nominatim.openstreetmap.org/search';
        const searchParams: Record<string, string | number> = {
          q: generalQuery,
          format: 'json',
          limit: 10,
          addressdetails: 1,
          extratags: 1,
          'accept-language': 'en',
          viewbox,
          bounded: 1,
        };
        if (countryCodes) {
          searchParams.countrycodes = countryCodes;
        }
        
        const generalResponse = await retryWithBackoff(async () => {
          return await axios.get(searchUrl, {
            params: searchParams,
            headers: { 'User-Agent': 'MoodMap/1.0' },
            timeout: 30000, // Increased to 30 seconds
          });
        });
        
        if (!generalResponse) {
          console.warn('[OpenStreetMap] General search request failed');
          return places; // Return whatever places we have
        }
        
        const generalResults = generalResponse.data || [];
        console.log(`[OpenStreetMap] Found ${generalResults.length} general results`);
        
        if (!generalResults || generalResults.length === 0) {
          console.log('[OpenStreetMap] No general results found');
          return places;
        }
        
        // Process general results (same logic as above)
        for (const result of generalResults.slice(0, 10)) {
          const grLat = parseFloat(result.lat);
          const grLon = parseFloat(result.lon);
          const distanceKm =
            Number.isFinite(grLat) && Number.isFinite(grLon)
              ? haversineKm(searchLat, searchLng, grLat, grLon)
              : undefined;
          if (
            Number.isFinite(grLat) &&
            Number.isFinite(grLon) &&
            (distanceKm ?? 0) > MAX_DISTANCE_KM
          ) {
            continue;
          }

          const address = result.address || {};
          const name = result.name || result.display_name?.split(',')[0] || 'Place';

          if (places.some(p => p.name.toLowerCase() === name.toLowerCase())) continue;
          
          const addressParts: string[] = [];
          if (address.road) addressParts.push(address.road);
          if (address.house_number) addressParts.unshift(address.house_number);
          
          const cityState: string[] = [];
          if (address.city || address.town || address.village) {
            cityState.push(address.city || address.town || address.village);
          }
          if (address.state) cityState.push(address.state);
          if (address.postcode) cityState.push(address.postcode);
          
          let formattedAddress = '';
          if (addressParts.length > 0) {
            formattedAddress = addressParts.join(' ');
            if (cityState.length > 0) {
              formattedAddress += ', ' + cityState.join(', ');
            }
          } else {
            const displayParts = result.display_name?.split(',').slice(0, 3) || [];
            formattedAddress = displayParts.join(',').trim() || cityName;
          }
          
          const osmGen = nominatimOsmTags(result);
          const amenities = amenitiesFromOsm(osmGen, result.type || result.class || 'place');
          const genContact = contactFromOsm(osmGen, 'Hours vary');
          const genCuisine = cuisineFromOsm(osmGen);
          
          let extractedCity = address.city || address.town || address.village || address.municipality;
          if (!extractedCity || extractedCity.toLowerCase().includes('mall') || extractedCity.toLowerCase().includes('field')) {
            extractedCity = address.city || address.town || address.village || address.municipality || address.county || cityName;
          }
          
          const generalImages = await getPlaceImages(
            name,
            extractedCity || cityName,
            result.type || result.class,
            grLat,
            grLon
          );
          
          places.push({
            id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
            name,
            type: result.type || result.class || 'Place',
            distanceKm,
            distanceLabel: distanceKm !== undefined ? `${distanceKm.toFixed(1)} km away` : '',
            address: formattedAddress,
            city: extractedCity || cityName,
            description: `A place near ${cityName}.`,
            hours: genContact.hours,
            price: '$$',
            phone: genContact.phone,
            website: genContact.website,
            cuisine: genCuisine,
            amenities: amenities.filter(Boolean),
            photos: generalImages,
          });
        }
      } catch (error: any) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        if (isTimeout) {
          console.warn('[OpenStreetMap] Timeout in general search');
        } else {
          console.error('[OpenStreetMap] Error in general search:', error.message);
        }
      }
    }

    console.log(`[OpenStreetMap] Total places found: ${places.length}`);
    return places;
  } catch (error: any) {
    console.error('[OpenStreetMap] Error fetching places:', error.message);
    return [];
  }
}

/**
 * Map mood to search terms for Nominatim
 */
function mapMoodToSearchTerms(mood?: string, preferences?: string[]): string[] {
  const moodLower = mood?.toLowerCase() || '';
  
  // Check if user has beach/water preference
  const hasBeachPreference = preferences?.some(p => 
    p.toLowerCase().includes('beach') || 
    p.toLowerCase().includes('water') ||
    p.toLowerCase().includes('ocean')
  ) || false;

  const preferenceBoost: string[] = [];
  const pref = (preferences || []).map((p) => p.toLowerCase());
  const hasParks = pref.some((p) => p.includes('parks') || p.includes('nature'));
  const hasGyms = pref.some((p) => p.includes('gyms') || p.includes('fitness'));
  const hasCafes = pref.some((p) => p.includes('cafes') || p.includes('coffee'));
  const hasRestaurants = pref.some((p) => p.includes('restaurants'));
  const hasMuseums = pref.some((p) => p.includes('museums') || p.includes('culture'));
  const hasShopping = pref.some((p) => p.includes('shopping'));
  const hasNightlife = pref.some((p) => p.includes('nightlife'));
  const hasEntertainment = pref.some((p) => p.includes('entertainment'));
  const hasOutdoor = pref.some((p) => p.includes('outdoor'));

  if (hasParks) preferenceBoost.push('park', 'garden', 'nature reserve');
  if (hasGyms) preferenceBoost.push('gym', 'fitness centre', 'sports centre');
  if (hasCafes) preferenceBoost.push('cafe', 'coffee shop');
  if (hasRestaurants) preferenceBoost.push('restaurant');
  if (hasMuseums) preferenceBoost.push('museum', 'art gallery');
  if (hasShopping) preferenceBoost.push('shopping mall', 'market');
  if (hasEntertainment) preferenceBoost.push('theatre', 'cinema');
  if (hasNightlife) preferenceBoost.push('bar', 'nightclub');
  if (hasOutdoor) preferenceBoost.push('hiking trail', 'outdoor activities');
  if (hasBeachPreference) preferenceBoost.push('beach', 'waterfront');
  
  const termMap: Record<string, string[]> = {
    happy: ['art gallery', 'comedy club', 'entertainment'],
    excited: ['nightclub', 'adventure park', 'escape room'],
    focused: ['library', 'cafe', 'coworking space', 'study cafe'],
    relaxed: hasBeachPreference 
      ? ['beach', 'pier', 'beachfront', 'waterfront', 'coastal', 'marina', 'beach walk', 'oceanfront', 'canal']
      : ['spa', 'park', 'library', 'beach', 'pier'],
    creative: ['art gallery', 'museum', 'art studio'],
    adventurous: ['hiking trail', 'rock climbing', 'outdoor activities'],
    social: ['restaurant', 'cafe', 'community center'],
    peaceful: ['park', 'garden', 'meditation center'],
    energetic: hasBeachPreference
      ? ['beach volleyball', 'beach sports', 'surfing', 'beach activities', 'water sports', 'beach fitness', 'pier', 'beachfront', 'beach', 'canal']
      : ['gym', 'fitness', 'sports', 'fitness center', 'sports complex', 'athletic'],
    curious: ['museum', 'science center', 'planetarium'],
    romantic: ['restaurant', 'wine bar', 'scenic overlook'],
  };

  const base = termMap[moodLower] || ['restaurant', 'cafe', 'park'];
  const combined = [...preferenceBoost, ...base];
  const seen = new Set<string>();
  return combined.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
