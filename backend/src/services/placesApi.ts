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
        const geocodeResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
          params: {
            q: cityName,
            format: 'json',
            limit: 1,
          },
          headers: {
            'User-Agent': 'MoodMap/1.0',
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
        
        const searchResponse = await axios.get(searchUrl, {
          params: searchParams,
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
            amenities.push(result.type || result.class || searchTerm || 'place');
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
            photos: [
              'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop',
            ],
          });
          
          if (places.length >= 15) break;
          }
        } else {
          console.log(`[OpenStreetMap] No results for "${query}", trying next search term...`);
        }
      } catch (error: any) {
        if (error.response?.status === 418) {
          console.warn(`[OpenStreetMap] Rate limited (418) for "${searchTerm}". Waiting...`);
          await delay(5000);
          break; // Stop trying if rate limited
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
            const searchResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
              params: {
                q: `${beachQuery}, Los Angeles`,
                format: 'json',
                limit: 3,
                addressdetails: 1,
              },
              headers: { 'User-Agent': 'MoodMap/1.0' },
              timeout: 10000,
            });
            
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
                if (amenities.length === 0) amenities.push('beach' || 'pier' || 'attraction');
                
                places.push({
                  id: parseInt(result.place_id || `${Math.random() * 1000000}`, 10),
                  name,
                  type: 'Beach' || 'Pier' || result.type || 'Place',
                  rating: '4.5',
                  address: formattedAddress,
                  city: address.city || address.town || 'Los Angeles',
                  description: `${name} in Los Angeles. A popular beach destination.`,
                  hours: result.tags?.opening_hours || 'Open 24/7',
                  price: 'Free',
                  phone: result.tags?.phone || '',
                  website: result.tags?.website || '',
                  amenities: amenities.filter(Boolean),
                  photos: [
                    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop',
                    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop',
                  ],
                });
              }
            }
          } catch (error: any) {
            console.error(`[OpenStreetMap] Error searching for ${beachQuery}:`, error.message);
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
        
        const generalResponse = await axios.get(searchUrl, {
          params: searchParams,
          headers: { 'User-Agent': 'MoodMap/1.0' },
          timeout: 10000,
        });
        
        const generalResults = generalResponse.data || [];
        console.log(`[OpenStreetMap] Found ${generalResults.length} general results`);
        
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
            photos: [
              'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop',
              'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&h=600&fit=crop',
            ],
          });
        }
      } catch (error: any) {
        console.error('[OpenStreetMap] Error in general search:', error.message);
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
