import axios from 'axios';
import { Place } from './aiService';

/**
 * Fetch real places from Foursquare API
 */
export async function fetchPlacesFromFoursquare(
  city: string,
  lat?: number,
  lng?: number,
  category?: string
): Promise<Place[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  const apiSecret = process.env.FOURSQUARE_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.warn('Foursquare API credentials not configured');
    return [];
  }

  try {
    // Build query based on location
    let query = city;
    let ll = '';
    
    if (lat && lng) {
      ll = `${lat},${lng}`;
      query = ''; // Use coordinates instead of city name
    }

    // Map mood to Foursquare categories
    const categoryId = mapMoodToCategory(category);

    const url = 'https://api.foursquare.com/v2/venues/search';
    const params: any = {
      client_id: apiKey,
      client_secret: apiSecret,
      v: '20240101', // API version
      limit: 50,
    };

    if (ll) {
      params.ll = ll;
      params.radius = 5000; // 5km radius
    } else {
      params.near = city;
    }

    if (categoryId) {
      params.categoryId = categoryId;
    }

    const response = await axios.get(url, { params });
    const venues = response.data.response?.venues || [];

    // Transform Foursquare venues to our Place format
    return venues.map((venue: any, index: number) => {
      const location = venue.location || {};
      const categories = venue.categories || [];
      const primaryCategory = categories[0] || {};

      return {
        id: parseInt(venue.id?.substring(0, 8) || `${index}`, 16) || index + 1000,
        name: venue.name || 'Unknown Place',
        type: primaryCategory.name || 'Venue',
        rating: venue.rating ? venue.rating.toFixed(1) : '4.0',
        address: [
          location.address,
          location.city,
          location.state,
          location.country,
        ]
          .filter(Boolean)
          .join(', ') || city,
        city: location.city || city,
        description: `${primaryCategory.name || 'A great place'} in ${city}. ${venue.description || 'Check it out!'}`,
        hours: venue.hours?.status || 'Hours vary',
        price: venue.price?.tier
          ? '$'.repeat(venue.price.tier)
          : '$$',
        phone: venue.contact?.formattedPhone || venue.contact?.phone || '',
        website: venue.url || venue.shortUrl || '',
        amenities: categories.slice(0, 3).map((cat: any) => cat.name),
        photos: venue.photos?.groups?.[0]?.items?.slice(0, 2).map((photo: any) => 
          `${photo.prefix}${photo.width}x${photo.height}${photo.suffix}`
        ) || [
          'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
          'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400',
        ],
      };
    });
  } catch (error) {
    console.error('Error fetching places from Foursquare:', error);
    return [];
  }
}

/**
 * Map mood to Foursquare category IDs
 */
function mapMoodToCategory(mood?: string): string {
  const moodLower = mood?.toLowerCase() || '';
  
  const categoryMap: Record<string, string> = {
    happy: '4d4b7105d754a06376d81259', // Arts & Entertainment
    excited: '4d4b7105d754a06378d81259', // Nightlife
    relaxed: '4bf58dd8d48988d1e2931735', // Spa
    creative: '4d4b7105d754a06376d81259', // Arts & Entertainment
    adventurous: '4d4b7105d754a06377d81259', // Outdoors & Recreation
    social: '4d4b7105d754a06374d81259', // Food
    peaceful: '4bf58dd8d48988d163941735', // Park
    energetic: '4bf58dd8d48988d175941735', // Gym / Fitness Center
    curious: '4bf58dd8d48988d181941735', // Museum
    romantic: '4d4b7105d754a06374d81259', // Food (restaurants)
  };

  return categoryMap[moodLower] || '';
}

/**
 * Fetch places from Google Places API (alternative)
 */
export async function fetchPlacesFromGoogle(
  city: string,
  lat?: number,
  lng?: number,
  type?: string
): Promise<Place[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('Google Places API key not configured');
    return [];
  }

  try {
    let location = '';
    if (lat && lng) {
      location = `${lat},${lng}`;
    } else {
      // Geocode city to get coordinates first
      const geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
      const geocodeResponse = await axios.get(geocodeUrl, {
        params: {
          address: city,
          key: apiKey,
        },
      });

      const results = geocodeResponse.data.results;
      if (results && results.length > 0) {
        const locationData = results[0].geometry.location;
        location = `${locationData.lat},${locationData.lng}`;
      } else {
        return [];
      }
    }

    // Search for places
    const placesUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    const placesResponse = await axios.get(placesUrl, {
      params: {
        location,
        radius: 5000,
        type: mapMoodToGoogleType(type),
        key: apiKey,
      },
    });

    const places = placesResponse.data.results || [];

    // Get details for each place (to get more info)
    const placesWithDetails = await Promise.all(
      places.slice(0, 20).map(async (place: any) => {
        try {
          const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
          const detailsResponse = await axios.get(detailsUrl, {
            params: {
              place_id: place.place_id,
              fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,photos,types',
              key: apiKey,
            },
          });

          const details = detailsResponse.data.result;
          return {
            ...place,
            details,
          };
        } catch (error) {
          return place;
        }
      })
    );

    // Transform to our Place format
    return placesWithDetails.map((place: any, index: number) => {
      const details = place.details || {};
      const address = details.formatted_address || place.vicinity || city;

      return {
        id: parseInt(place.place_id?.substring(0, 8) || `${index}`, 36) || index + 2000,
        name: place.name || details.name || 'Unknown Place',
        type: place.types?.[0]?.replace(/_/g, ' ') || 'Place',
        rating: place.rating ? place.rating.toFixed(1) : '4.0',
        address,
        city,
        description: `${place.types?.[0]?.replace(/_/g, ' ') || 'A great place'} in ${city}.`,
        hours: details.opening_hours?.weekday_text?.join(', ') || 'Hours vary',
        price: place.price_level ? '$'.repeat(place.price_level) : '$$',
        phone: details.formatted_phone_number || '',
        website: details.website || '',
        amenities: place.types?.slice(0, 3) || [],
        photos: details.photos?.slice(0, 2).map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`
        ) || [
          'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
          'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400',
        ],
      };
    });
  } catch (error) {
    console.error('Error fetching places from Google Places:', error);
    return [];
  }
}

/**
 * Map mood to Google Places type
 */
function mapMoodToGoogleType(mood?: string): string {
  const moodLower = mood?.toLowerCase() || '';
  
  const typeMap: Record<string, string> = {
    happy: 'art_gallery',
    excited: 'night_club',
    relaxed: 'spa',
    creative: 'art_gallery',
    adventurous: 'park',
    social: 'restaurant',
    peaceful: 'park',
    energetic: 'gym',
    curious: 'museum',
    romantic: 'restaurant',
  };

  return typeMap[moodLower] || 'establishment';
}
