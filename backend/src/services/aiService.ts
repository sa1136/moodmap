import Groq from 'groq-sdk';

/**
 * Lazy Groq client so env is read after dotenv loads. Module-level init ran before
 * `dotenv.config()` when it lived only in index.ts body (imports run first).
 */
let groqSingleton: Groq | null | undefined;

function getGroq(): Groq | null {
  if (groqSingleton !== undefined) {
    return groqSingleton;
  }
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    groqSingleton = null;
    return null;
  }
  groqSingleton = new Groq({ apiKey: key });
  return groqSingleton;
}

export interface Place {
  id: number;
  name: string;
  type: string;
  distanceKm?: number;
  distanceLabel?: string;
  address: string;
  city: string;
  description: string;
  hours: string;
  price: string;
  phone: string;
  website: string;
  /** OSM cuisine tag when present (e.g. "italian; pizza") */
  cuisine?: string;
  amenities: string[];
  photos: string[];
}

export interface UserContext {
  mood: string;
  city?: string;
  preferences?: string[];
}


/**
 * Generate personalized recommendations using RAG
 */
export async function generatePersonalizedRecommendations(
  places: Place[],
  userContext: UserContext
): Promise<Place[]> {
  try {
    // If no places available, return empty array
    if (!places || places.length === 0) {
      console.warn('[AI Service] No places available for recommendations');
      return [];
    }

    const groq = getGroq();
    if (!groq) {
      console.warn('[AI Service] Groq not available, returning places without AI ranking');
      return places;
    }

    const placesContext = places
      .slice(0, 20)
      .map(
        (place) =>
          `- ${place.name} (${place.type}): ${place.description}. Distance: ${place.distanceLabel || 'unknown'}`
      )
      .join('\n');

    const preferencesText = userContext.preferences?.join(', ') || 'general interests';
    const locationText = userContext.city ? `in ${userContext.city}` : 'nearby';

    const prompt = `You are a personalized location recommendation assistant for MoodMap. 
Based on the user's mood, preferences, and available places, recommend the most suitable locations.

User Context:
- Current Mood: ${userContext.mood}
- Location: ${locationText}
- Preferences: ${preferencesText}

Available Places:
${placesContext}

Please analyze these places and recommend the top 5-8 places that best match the user's current mood (${userContext.mood}). 
Consider:
1. How well the place matches the emotional state
2. User preferences if provided
3. Practicality (closer is usually better, all else equal)
4. Variety in recommendations

Return your response as a JSON array of place names that you recommend, in order of relevance.
Format: ["Place Name 1", "Place Name 2", ...]`;

    console.log('[AI Service] Using Groq for recommendations');
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that provides personalized location recommendations. Always respond with valid JSON in the format: {"recommendations": ["Place Name 1", "Place Name 2", ...]}',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsedResponse = JSON.parse(responseContent);

    const recommendedNames =
      parsedResponse.recommendations || 
      parsedResponse.places || 
      (Array.isArray(parsedResponse) ? parsedResponse : []) ||
      (typeof parsedResponse === 'object' ? Object.values(parsedResponse).flat() : []);

    const recommendedPlaces: Place[] = [];
    const nameMap = new Map(places.map((p) => [p.name.toLowerCase(), p]));

    for (const name of recommendedNames) {
      const place = nameMap.get(name.toLowerCase());
      if (place) {
        recommendedPlaces.push(place);
      }
    }

    if (recommendedPlaces.length < 5) {
      const remaining = places
        .filter((p) => !recommendedPlaces.some((rp) => rp.id === p.id))
        .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
        .slice(0, 8 - recommendedPlaces.length);
      recommendedPlaces.push(...remaining);
    }

    return recommendedPlaces.slice(0, 8);
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    return filterPlacesByMood(places, userContext.mood);
  }
}

/**
 * Filter places by mood - simple fallback when AI is unavailable
 */
function filterPlacesByMood(places: Place[], mood: string): Place[] {
  // Simple fallback: prioritize closer places when available
  return places
    .slice()
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
    .slice(0, 8);
}

/**
 * Generate natural language explanation for recommendations
 */
export async function generateRecommendationExplanation(
  recommendedPlaces: Place[],
  userContext: UserContext
): Promise<string> {
  try {
    // If no places, return a helpful message
    if (!recommendedPlaces || recommendedPlaces.length === 0) {
      return `No places found for your ${userContext.mood} mood in ${userContext.city || 'this location'}. Please try a different location or mood.`;
    }

    const placesSummary = recommendedPlaces
      .map((p) => `${p.name} (${p.type})`)
      .join(', ');

    const prompt = `Explain why these places are recommended for someone feeling ${userContext.mood}${userContext.city ? ` in ${userContext.city}` : ''}.
    
Recommended places: ${placesSummary}

Provide a brief, friendly explanation (2-3 sentences) about why these places match the user's mood.`;

    const groq = getGroq();
    if (!groq) {
      return `Based on your ${userContext.mood} mood, we've selected these places that we think you'll enjoy!`;
    }

    console.log('[AI Service] Using Groq for explanation');
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a friendly assistant that explains location recommendations in a warm, conversational tone.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    return completion.choices[0]?.message?.content || 'These places are recommended based on your current mood and preferences.';
  } catch (error) {
    console.error('Error generating explanation:', error);
    return `Based on your ${userContext.mood} mood, we've selected these places that we think you'll enjoy!`;
  }
}
