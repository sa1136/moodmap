import axios from 'axios';
import { Place } from './aiService';

/**
 * Fetch places from OpenStreetMap/Nominatim (100% FREE, no API key required!)
 * This is a great free alternative that doesn't require any registration.
 */
function extractCityName(fullAddress: string): string {
  const parts = fullAddress.split(',');
  return parts[0]?.trim() || fullAddress;
}

// Helper function to add delay (rate limiting for Nominatim)
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchPlacesFromOpenStreetMap(
  city: string,
  lat?: number,
  lng?: number,
  mood?: string
): Promise<Place[]> {
  try {
    const cityName = extractCityName(city);
    console.log(`[OpenStreetMap] Fetching places for city: ${cityName}, mood: ${mood}`);
    
    console.log(`[OpenStreetMap] Geocoding city: ${cityName}`);
    await delay(2000);
    
    const geocodeUrl = 'https://nominatim.openstreetmap.org/search';
    let searchLat: number | undefined;
    let searchLng: number | undefined;
    
    try {
      const geocodeResponse = await axios.get(geocodeUrl, {
        params: {
          q: cityName,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'MoodMap/1.0', // Required by Nominatim
        },
      });

      if (geocodeResponse.data && geocodeResponse.data.length > 0) {
        searchLat = parseFloat(geocodeResponse.data[0].lat);
        searchLng = parseFloat(geocodeResponse.data[0].lon);
        console.log(`[OpenStreetMap] Geocoded "${cityName}" to: ${searchLat}, ${searchLng}`);
      } else {
        console.warn(`[OpenStreetMap] Could not geocode city: ${cityName}`);
        return [];
      }
    } catch (error: any) {
      if (error.response?.status === 418) {
        console.warn(`[OpenStreetMap] Rate limited during geocoding. Waiting longer...`);
        await delay(5000);
        return [];
      }
      console.error(`[OpenStreetMap] Error geocoding city: ${cityName}`, error.message);
      return [];
    }

    const searchTerms = mapMoodToSearchTerms(mood);
    console.log(`[OpenStreetMap] Search terms for mood "${mood}":`, searchTerms);
    
    const places: Place[] = [];
    const primaryTerm = searchTerms[0];
    
    try {
      await delay(2000);
      
      const query = `${primaryTerm} in ${cityName}`;
      console.log(`[OpenStreetMap] Searching for: ${query}`);
      
      const searchUrl = 'https://nominatim.openstreetmap.org/search';
      const searchResponse = await axios.get(searchUrl, {
        params: {
          q: query,
          format: 'json',
          limit: 15,
          addressdetails: 1,
        },
        headers: {
          'User-Agent': 'MoodMap/1.0',
        },
        timeout: 10000,
      });

      const results = searchResponse.data || [];
      console.log(`[OpenStreetMap] Found ${results.length} results for "${query}"`);
      
      if (results.length > 0) {
        for (const result of results) {
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
          
          // Extract amenities from OpenStreetMap tags if available
          const amenities: string[] = [];
          if (result.tags) {
            if (result.tags.amenity) amenities.push(result.tags.amenity);
            if (result.tags.shop) amenities.push(result.tags.shop);
            if (result.tags.leisure) amenities.push(result.tags.leisure);
            if (result.tags.tourism) amenities.push(result.tags.tourism);
          }
          // Fallback to type/class if no tags
          if (amenities.length === 0) {
            amenities.push(result.type || result.class || primaryTerm || 'place');
          }
          
          // Extract city more accurately (prefer actual city over mall/shopping center names)
          let extractedCity = address.city || address.town || address.village || address.municipality;
          // If city is a shopping center/mall name, try to get the actual city from address
          if (!extractedCity || extractedCity.toLowerCase().includes('mall') || extractedCity.toLowerCase().includes('field')) {
            extractedCity = address.city || address.town || address.village || address.municipality || address.county || cityName;
          }
          
          places.push({
            id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
            name,
            type: result.type || result.class || primaryTerm || 'Place',
            rating: '4.0',
            address: formattedAddress,
            city: extractedCity || cityName,
            description: `A ${primaryTerm || 'place'} in ${cityName}. Discovered via OpenStreetMap.`,
            hours: result.tags?.opening_hours || 'Hours vary',
            price: '$$',
            phone: result.tags?.phone || '',
            website: result.tags?.website || '',
            amenities: amenities.filter(Boolean),
            photos: [
              'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop',
            ],
          });
          
          if (places.length >= 15) break;
        }
      }
    } catch (error: any) {
      if (error.response?.status === 418) {
        console.warn(`[OpenStreetMap] Rate limited (418) for "${primaryTerm}". OpenStreetMap has strict rate limits.`);
      } else {
        console.error(`[OpenStreetMap] Error searching for "${primaryTerm}":`, error.message);
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
function mapMoodToSearchTerms(mood?: string): string[] {
  const moodLower = mood?.toLowerCase() || '';
  
  const termMap: Record<string, string[]> = {
    happy: ['art gallery', 'comedy club', 'entertainment'],
    excited: ['nightclub', 'adventure park', 'escape room'],
    relaxed: ['spa', 'park', 'library'],
    creative: ['art gallery', 'museum', 'art studio'],
    adventurous: ['hiking trail', 'rock climbing', 'outdoor activities'],
    social: ['restaurant', 'cafe', 'community center'],
    peaceful: ['park', 'garden', 'meditation center'],
    energetic: ['gym', 'fitness center', 'sports complex'],
    curious: ['museum', 'science center', 'planetarium'],
    romantic: ['restaurant', 'wine bar', 'scenic overlook'],
  };

  return termMap[moodLower] || ['restaurant', 'cafe', 'park'];
}
