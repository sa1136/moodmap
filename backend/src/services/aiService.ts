import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface Place {
  id: number;
  name: string;
  type: string;
  rating: string;
  address: string;
  city: string;
  description: string;
  hours: string;
  price: string;
  phone: string;
  website: string;
  amenities: string[];
  photos: string[];
}

export interface UserContext {
  mood: string;
  city?: string;
  preferences?: string[];
  lat?: number;
  lng?: number;
}

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate personalized recommendations using RAG
 */
export async function generatePersonalizedRecommendations(
  places: Place[],
  userContext: UserContext
): Promise<Place[]> {
  try {
    // Create context string from available places
    const placesContext = places
      .slice(0, 20) // Limit to top 20 for context
      .map(
        (place) =>
          `- ${place.name} (${place.type}): ${place.description}. Rating: ${place.rating}, Price: ${place.price}`
      )
      .join('\n');

    // Build user context string
    const preferencesText = userContext.preferences?.join(', ') || 'general interests';
    const locationText = userContext.city ? `in ${userContext.city}` : 'nearby';

    // Create prompt for LLM
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
3. Place quality (rating)
4. Variety in recommendations

Return your response as a JSON array of place names that you recommend, in order of relevance.
Format: ["Place Name 1", "Place Name 2", ...]`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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

    // Extract recommended place names
    const recommendedNames =
      parsedResponse.recommendations || 
      parsedResponse.places || 
      (Array.isArray(parsedResponse) ? parsedResponse : []) ||
      (typeof parsedResponse === 'object' ? Object.values(parsedResponse).flat() : []);

    // Map recommended names back to place objects
    const recommendedPlaces: Place[] = [];
    const nameMap = new Map(places.map((p) => [p.name.toLowerCase(), p]));

    for (const name of recommendedNames) {
      const place = nameMap.get(name.toLowerCase());
      if (place) {
        recommendedPlaces.push(place);
      }
    }

    // If LLM didn't return enough recommendations, fill with top-rated places
    if (recommendedPlaces.length < 5) {
      const remaining = places
        .filter((p) => !recommendedPlaces.some((rp) => rp.id === p.id))
        .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
        .slice(0, 8 - recommendedPlaces.length);
      recommendedPlaces.push(...remaining);
    }

    return recommendedPlaces.slice(0, 8);
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    // Fallback to simple filtering by mood
    return filterPlacesByMood(places, userContext.mood);
  }
}

/**
 * Filter places by mood using semantic matching
 */
async function filterPlacesByMood(places: Place[], mood: string): Promise<Place[]> {
  try {
    // Generate embedding for mood
    const moodEmbedding = await generateEmbedding(
      `I'm feeling ${mood}. I want to visit places that match this mood.`
    );

    // Generate embeddings for all places and calculate similarity
    const placeScores = await Promise.all(
      places.map(async (place) => {
        const placeText = `${place.name} ${place.type} ${place.description}`;
        const placeEmbedding = await generateEmbedding(placeText);
        const similarity = cosineSimilarity(moodEmbedding, placeEmbedding);
        return { place, similarity };
      })
    );

    // Sort by similarity and return top matches
    return placeScores
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 8)
      .map((item) => item.place);
  } catch (error) {
    console.error('Error in semantic filtering:', error);
    // Ultimate fallback: return places sorted by rating
    return places.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating)).slice(0, 8);
  }
}

/**
 * Generate natural language explanation for recommendations
 */
export async function generateRecommendationExplanation(
  recommendedPlaces: Place[],
  userContext: UserContext
): Promise<string> {
  try {
    const placesSummary = recommendedPlaces
      .map((p) => `${p.name} (${p.type})`)
      .join(', ');

    const prompt = `Explain why these places are recommended for someone feeling ${userContext.mood}${userContext.city ? ` in ${userContext.city}` : ''}.
    
Recommended places: ${placesSummary}

Provide a brief, friendly explanation (2-3 sentences) about why these places match the user's mood.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
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
