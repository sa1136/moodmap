import axios from 'axios';
import { Place } from './aiService';

/**
 * Get real images for a place using Unsplash Source API (free, no auth required)
 * Falls back to a generic image if specific search fails
 */
async function getPlaceImages(placeName: string, city: string, placeType?: string): Promise<string[]> {
  try {
    // Clean up the place name and city for better search results
    const cleanPlaceName = placeName.replace(/[^\w\s]/g, '').trim();
    const cleanCity = city.replace(/[^\w\s]/g, '').trim();
    const cleanType = placeType ? placeType.replace(/[^\w\s]/g, '').trim() : '';
    
    // Build search terms - prioritize place name + city, then city + type
    const primarySearch = `${cleanPlaceName} ${cleanCity}`.trim();
    const secondarySearch = cleanType ? `${cleanCity} ${cleanType}` : cleanCity;
    
    // Use Unsplash Source API (free, no authentication needed)
    // This provides random images based on search terms
    // We'll return 2 images with different search terms for variety
    const images: string[] = [];
    
    if (primarySearch) {
      images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(primarySearch)}`);
    }
    
    if (secondarySearch && secondarySearch !== primarySearch) {
      images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(secondarySearch)}`);
    }
    
    // If we still don't have images, add a generic city image
    if (images.length === 0 && cleanCity) {
      images.push(`https://source.unsplash.com/800x600/?${encodeURIComponent(cleanCity + ' attraction')}`);
    }
    
    return images.length > 0 ? images : [];
  } catch (error) {
    console.warn(`[Images] Could not generate image URLs for ${placeName}:`, error);
    // Return empty array if image URL generation fails
    return [];
  }
}

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

export async function fetchPlacesFromOpenStreetMap(
  city: string,
  lat?: number,
  lng?: number,
  mood?: string,
  preferences?: string[]
): Promise<Place[]> {
  try {
    const cityName = extractCityName(city);
    console.log(`[OpenStreetMap] Fetching places for city: ${cityName}, mood: ${mood}`);
    
    console.log(`[OpenStreetMap] Fetching places for city: ${cityName}`);
    
    // Use provided lat/lng if available, otherwise geocode the city
    let searchLat = lat;
    let searchLng = lng;
    
    if (!searchLat || !searchLng) {
      console.log(`[OpenStreetMap] Geocoding city: ${cityName}`);
      await delay(2000);
      
      try {
        const geocodeResponse = await retryWithBackoff(async () => {
          return await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
              q: cityName,
              format: 'json',
              limit: 1,
            },
            headers: {
              'User-Agent': 'MoodMap/1.0',
            },
            timeout: 30000, // Increased to 30 seconds
          });
        });
        
        if (!geocodeResponse) {
          console.warn(`[OpenStreetMap] Could not geocode city: ${cityName} (request failed)`);
          return [];
        }

        if (geocodeResponse.data && geocodeResponse.data.length > 0) {
          searchLat = parseFloat(geocodeResponse.data[0].lat);
          searchLng = parseFloat(geocodeResponse.data[0].lon);
          console.log(`[OpenStreetMap] Geocoded "${cityName}" to: ${searchLat}, ${searchLng}`);
        } else {
          console.warn(`[OpenStreetMap] Could not geocode city: ${cityName} (no results)`);
          return [];
        }
      } catch (error: any) {
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
        const isRateLimit = error.response?.status === 418 || error.response?.status === 429;
        
        if (isRateLimit) {
          console.warn(`[OpenStreetMap] Rate limited during geocoding. Waiting longer...`);
          await delay(10000);
          return [];
        } else if (isTimeout) {
          console.warn(`[OpenStreetMap] Timeout during geocoding for: ${cityName}`);
          return [];
        }
        console.error(`[OpenStreetMap] Error geocoding city: ${cityName}`, error.message);
        return [];
      }
    }

    const searchTerms = mapMoodToSearchTerms(mood, preferences);
    console.log(`[OpenStreetMap] Search terms for mood "${mood}" with preferences:`, preferences, '→', searchTerms);
    
    const places: Place[] = [];
    
    // Try multiple search terms if the first one doesn't return results
    for (const searchTerm of searchTerms) {
      if (places.length >= 15) break;
      
      try {
        await delay(2000);
        
        const query = `${searchTerm} in ${cityName}`;
        console.log(`[OpenStreetMap] Searching for: ${query}`);
        
        const searchUrl = 'https://nominatim.openstreetmap.org/search';
        const searchParams: any = {
          q: query,
          format: 'json',
          limit: 15,
          addressdetails: 1,
        };
        
        // Use coordinates if available for better results
        if (searchLat && searchLng) {
          searchParams.lat = searchLat;
          searchParams.lon = searchLng;
          searchParams.radius = 5000; // 5km radius
        }
        
        const searchResponse = await retryWithBackoff(async () => {
          return await axios.get(searchUrl, {
            params: searchParams,
            headers: {
              'User-Agent': 'MoodMap/1.0',
            },
            timeout: 30000, // Increased to 30 seconds
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
            amenities.push(result.type || result.class || searchTerm || 'place');
          }
          
          // Extract city more accurately (prefer actual city over mall/shopping center names)
          let extractedCity = address.city || address.town || address.village || address.municipality;
          // If city is a shopping center/mall name, try to get the actual city from address
          if (!extractedCity || extractedCity.toLowerCase().includes('mall') || extractedCity.toLowerCase().includes('field')) {
            extractedCity = address.city || address.town || address.village || address.municipality || address.county || cityName;
          }
          
          const placeImages = await getPlaceImages(name, extractedCity || cityName, result.type || result.class || searchTerm);
          
          places.push({
            id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
            name,
            type: result.type || result.class || searchTerm || 'Place',
            rating: '4.0',
            address: formattedAddress,
            city: extractedCity || cityName,
            description: `A ${searchTerm || 'place'} in ${cityName}. Discovered via OpenStreetMap.`,
            hours: result.tags?.opening_hours || 'Hours vary',
            price: '$$',
            phone: result.tags?.phone || '',
            website: result.tags?.website || '',
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
                  q: `${beachQuery}, Los Angeles`,
                  format: 'json',
                  limit: 3,
                  addressdetails: 1,
                },
                headers: { 'User-Agent': 'MoodMap/1.0' },
                timeout: 30000, // Increased to 30 seconds
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
                
                const amenities: string[] = [];
                if (result.tags) {
                  if (result.tags.amenity) amenities.push(result.tags.amenity);
                  if (result.tags.leisure) amenities.push(result.tags.leisure);
                  if (result.tags.tourism) amenities.push(result.tags.tourism);
                }
                if (amenities.length === 0) {
                  // Determine type based on query
                  if (beachQuery.toLowerCase().includes('pier')) {
                    amenities.push('pier');
                  } else if (beachQuery.toLowerCase().includes('canal')) {
                    amenities.push('canal');
                  } else {
                    amenities.push('beach');
                  }
                }
                
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
                
                // Get images dynamically based on place name, city, and type
                const placeImages = await getPlaceImages(name, extractedCity, placeType);
                
                places.push({
                  id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
                  name,
                  type: placeType,
                  rating: '4.5',
                  address: formattedAddress,
                  city: extractedCity,
                  description: `${name} in ${extractedCity}. A popular beach destination.`,
                  hours: result.tags?.opening_hours || 'Open 24/7',
                  price: 'Free',
                  phone: result.tags?.phone || '',
                  website: result.tags?.website || '',
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
        const generalQuery = `attractions in ${cityName}`;
        const searchUrl = 'https://nominatim.openstreetmap.org/search';
        const searchParams: any = {
          q: generalQuery,
          format: 'json',
          limit: 10,
          addressdetails: 1,
        };
        
        if (searchLat && searchLng) {
          searchParams.lat = searchLat;
          searchParams.lon = searchLng;
          searchParams.radius = 5000;
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
          
          const amenities: string[] = [];
          if (result.tags) {
            if (result.tags.amenity) amenities.push(result.tags.amenity);
            if (result.tags.shop) amenities.push(result.tags.shop);
            if (result.tags.leisure) amenities.push(result.tags.leisure);
            if (result.tags.tourism) amenities.push(result.tags.tourism);
          }
          if (amenities.length === 0) {
            amenities.push(result.type || result.class || 'place');
          }
          
          let extractedCity = address.city || address.town || address.village || address.municipality;
          if (!extractedCity || extractedCity.toLowerCase().includes('mall') || extractedCity.toLowerCase().includes('field')) {
            extractedCity = address.city || address.town || address.village || address.municipality || address.county || cityName;
          }
          
          const generalImages = await getPlaceImages(name, extractedCity || cityName, result.type || result.class);
          
          places.push({
            id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
            name,
            type: result.type || result.class || 'Place',
            rating: '4.0',
            address: formattedAddress,
            city: extractedCity || cityName,
            description: `A place in ${cityName}. Discovered via OpenStreetMap.`,
            hours: result.tags?.opening_hours || 'Hours vary',
            price: '$$',
            phone: result.tags?.phone || '',
            website: result.tags?.website || '',
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
  
  const termMap: Record<string, string[]> = {
    happy: ['art gallery', 'comedy club', 'entertainment'],
    excited: ['nightclub', 'adventure park', 'escape room'],
    relaxed: hasBeachPreference 
      ? ['beach', 'pier', 'beachfront', 'waterfront', 'coastal', 'marina', 'beach walk', 'oceanfront', 'canal']
      : ['spa', 'park', 'library', 'beach', 'pier'],
    creative: ['art gallery', 'museum', 'art studio'],
    adventurous: ['hiking trail', 'rock climbing', 'outdoor activities'],
    social: ['restaurant', 'cafe', 'community center'],
    peaceful: ['park', 'garden', 'meditation center'],
    energetic: hasBeachPreference
      ? ['beach volleyball', 'beach sports', 'surfing', 'beach activities', 'water sports', 'beach fitness', 'pier', 'beachfront', 'beach', 'canal']
      : ['gym', 'fitness', 'sports', 'fitness center', 'sports complex', 'athletic', 'beach', 'pier'],
    curious: ['museum', 'science center', 'planetarium'],
    romantic: ['restaurant', 'wine bar', 'scenic overlook'],
  };

  return termMap[moodLower] || ['restaurant', 'cafe', 'park'];
}
