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
    
    let cityName = (city as string) || 'your city';
    if (cityName.includes(',')) {
      cityName = cityName.split(',')[0].trim();
    }
    
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
    
    console.log(`[Places API] Request - mood: ${mood}, city: ${cityName}, lat: ${lat}, lng: ${lng}, preferences:`, preferencesArray);
    
    const osmPlaces = await fetchPlacesFromOpenStreetMap(
      cityName,
      lat ? parseFloat(lat as string) : undefined,
      lng ? parseFloat(lng as string) : undefined,
      mood as string,
      preferencesArray
    );
    
    if (osmPlaces.length > 0) {
      allPlaces = osmPlaces;
      console.log(`✅ Successfully fetched ${allPlaces.length} places from OpenStreetMap`);
    } else {
      console.warn(`⚠️  No OpenStreetMap results found for "${cityName}" with mood "${mood}"`);
      allPlaces = [];
    }

    const userContext: UserContext = {
      mood: mood as string,
      city: cityName,
    };

    let recommendedPlaces: Place[];
    
    // Check if any AI provider is available (Groq or OpenAI)
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    
    console.log(`[Places API] AI Provider Check - Groq: ${hasGroq ? '✅' : '❌'}, OpenAI: ${hasOpenAI ? '✅' : '❌'}`);
    
    if (hasGroq || hasOpenAI) {
      const provider = hasGroq ? 'Groq' : 'OpenAI';
      console.log(`[Places API] Using ${provider} for AI-powered recommendations`);
      
      // Only use AI if we have places to work with
      if (allPlaces.length > 0) {
        try {
          recommendedPlaces = await generatePersonalizedRecommendations(allPlaces, userContext);
          const explanation = await generateRecommendationExplanation(recommendedPlaces, userContext);
          
          return res.json({
            places: recommendedPlaces.length > 0 ? recommendedPlaces : allPlaces.slice(0, 8),
            explanation,
            aiPowered: true,
            provider: provider.toLowerCase(),
            mood: mood,
            city: city || 'your location'
          });
        } catch (error) {
          console.error('[Places API] AI error, returning places without AI ranking:', error);
          // If AI fails, still return the places
          return res.json({
            places: allPlaces.slice(0, 8),
            explanation: `Based on your ${mood} mood, here are some places in ${cityName}!`,
            aiPowered: false,
            mood: mood,
            city: cityName
          });
        }
      } else {
        // No places found, but AI is available - return empty with helpful message
        console.warn(`[Places API] AI available but no places found from OpenStreetMap`);
        return res.json({
          places: [],
          explanation: `No places found for "${cityName}" with mood "${mood}". Please try a different location or mood.`,
          aiPowered: true,
          provider: provider.toLowerCase(),
          mood: mood,
          city: cityName
        });
      }
    } else {
      // No AI available, but still return the OpenStreetMap places (if any)
      if (allPlaces.length > 0) {
        console.warn('No AI API key found (GROQ_API_KEY or OPENAI_API_KEY). Returning OpenStreetMap places without AI ranking.');
        recommendedPlaces = allPlaces.slice(0, 8); // Return top 8 places from OpenStreetMap
      } else {
        console.warn('No AI API key found and no OpenStreetMap results. Returning empty results.');
        recommendedPlaces = [];
      }
      
      return res.json({
        places: recommendedPlaces,
        explanation: recommendedPlaces.length > 0 
          ? `Based on your ${mood} mood, here are some places we think you'll enjoy in ${cityName}!`
          : `No places found for "${cityName}" with mood "${mood}". Please try a different location or mood.`,
        aiPowered: false,
        mood: mood,
        city: cityName
      });
    }
  } catch (error) {
    console.error('Error in places route:', error);
    
    const { mood, city } = req.query;
    let fallbackCityName = (city as string) || 'your city';
    if (fallbackCityName.includes(',')) {
      fallbackCityName = fallbackCityName.split(',')[0].trim();
    }
    
    return res.status(500).json({
      places: [],
      explanation: `Service temporarily unavailable. Please try again later.`,
      aiPowered: false,
      error: 'Service temporarily unavailable',
      mood: mood,
      city: fallbackCityName
    });
  }
});


export default router;
