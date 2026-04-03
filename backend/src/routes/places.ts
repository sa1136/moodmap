import { Router } from "express";
import { generatePersonalizedRecommendations, generateRecommendationExplanation, Place, UserContext } from "../services/aiService";
import { fetchPlacesFromOpenStreetMap } from "../services/placesApi";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { mood, city, lat, lng, preferences } = req.query;
    
    if (!mood) {
      return res.status(400).json({ 
        error: 'Mood parameter is required' 
      });
    }

    let allPlaces: Place[] = [];
    
    // Keep full location string for geocoding (e.g. "Boston, MA, US" vs ambiguous "Boston").
    const locationQuery = ((city as string) || '').trim() || 'your city';
    const shortCityLabel = locationQuery.includes(',')
      ? locationQuery.split(',')[0].trim()
      : locationQuery;

    // Parse preferences if provided (can be comma-separated string or array)
    let preferencesArray: string[] = [];
    if (preferences) {
      if (typeof preferences === 'string') {
        try {
          const parsed = JSON.parse(preferences);
          preferencesArray = Array.isArray(parsed) 
            ? parsed.map((p: any) => String(p)).filter((p: string) => p.length > 0)
            : [String(parsed)].filter((p: string) => p.length > 0);
        } catch {
          // If not JSON, treat as comma-separated string
          preferencesArray = preferences.split(',').map(p => p.trim()).filter(p => p.length > 0);
        }
      } else if (Array.isArray(preferences)) {
        preferencesArray = preferences.map((p: any) => String(p)).filter((p: string) => p.length > 0);
      } else {
        preferencesArray = [String(preferences)].filter((p: string) => p.length > 0);
      }
    }
    
    console.log(`[Places API] Request - mood: ${mood}, location: ${locationQuery}, lat: ${lat}, lng: ${lng}, preferences:`, preferencesArray);
    
    const osmPlaces = await fetchPlacesFromOpenStreetMap(
      locationQuery,
      lat ? parseFloat(lat as string) : undefined,
      lng ? parseFloat(lng as string) : undefined,
      mood as string,
      preferencesArray
    );
    
    if (osmPlaces.length > 0) {
      allPlaces = osmPlaces;
      console.log(`✅ Successfully fetched ${allPlaces.length} places from OpenStreetMap`);
    } else {
      console.warn(`⚠️  No OpenStreetMap results found for "${locationQuery}" with mood "${mood}"`);
      allPlaces = [];
    }

    const userContext: UserContext = {
      mood: mood as string,
      city: shortCityLabel,
    };

    let recommendedPlaces: Place[];
    
    // Check if Groq is available
    const hasGroq = !!process.env.GROQ_API_KEY;
    
    console.log(`[Places API] AI Provider Check - Groq: ${hasGroq ? '✅' : '❌'}`);
    
    if (hasGroq) {
      console.log(`[Places API] Using Groq for AI-powered recommendations`);
      
      // Only use AI if we have places to work with
      if (allPlaces.length > 0) {
        try {
          recommendedPlaces = await generatePersonalizedRecommendations(allPlaces, userContext);
          const explanation = await generateRecommendationExplanation(recommendedPlaces, userContext);
          
          return res.json({
            places: recommendedPlaces.length > 0 ? recommendedPlaces : allPlaces.slice(0, 8),
            explanation,
            aiPowered: true,
            provider: 'groq',
            mood: mood,
            city: locationQuery
          });
        } catch (error) {
          console.error('[Places API] AI error, returning places without AI ranking:', error);
          // If AI fails, still return the places
          return res.json({
            places: allPlaces.slice(0, 8),
            explanation: `Based on your ${mood} mood, here are some places in ${shortCityLabel}!`,
            aiPowered: false,
            mood: mood,
            city: locationQuery
          });
        }
      } else {
        // No places found, but AI is available - return empty with helpful message
        console.warn(`[Places API] AI available but no places found from OpenStreetMap`);
        return res.json({
          places: [],
          explanation: `No places found for "${shortCityLabel}" with mood "${mood}". Please try a different location or mood.`,
          aiPowered: true,
          provider: 'groq',
          mood: mood,
          city: locationQuery
        });
      }
    } else {
      // No AI available, but still return the OpenStreetMap places (if any)
      if (allPlaces.length > 0) {
        console.warn('No GROQ_API_KEY found. Returning OpenStreetMap places without AI ranking.');
        recommendedPlaces = allPlaces.slice(0, 8); // Return top 8 places from OpenStreetMap
      } else {
        console.warn('No GROQ_API_KEY found and no OpenStreetMap results. Returning empty results.');
        recommendedPlaces = [];
      }
      
      return res.json({
        places: recommendedPlaces,
        explanation: recommendedPlaces.length > 0 
          ? `Based on your ${mood} mood, here are some places we think you'll enjoy in ${shortCityLabel}!`
          : `No places found for "${shortCityLabel}" with mood "${mood}". Please try a different location or mood.`,
        aiPowered: false,
        mood: mood,
        city: locationQuery
      });
    }
  } catch (error) {
    console.error('Error in places route:', error);
    
    const { mood, city } = req.query;
    const fallbackLocation = ((city as string) || 'your city').trim();

    return res.status(500).json({
      places: [],
      explanation: `Service temporarily unavailable. Please try again later.`,
      aiPowered: false,
      error: 'Service temporarily unavailable',
      mood: mood,
      city: fallbackLocation
    });
  }
});


export default router;
