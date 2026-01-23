import { Router } from "express";
import { generatePersonalizedRecommendations, generateRecommendationExplanation, UserContext } from "../services/aiService";
import { fetchPlacesFromOpenStreetMap } from "../services/placesApi";
import Groq from 'groq-sdk';
import OpenAI from 'openai';

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { message, mood, city, conversationHistory = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userMessage = message.toLowerCase();
    const hasGroq = !!process.env.GROQ_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasGroq && !hasOpenAI) {
      return res.json({
        response: "I'm sorry, but AI services are not currently available. Please check your API configuration."
      });
    }

    // Initialize AI providers
    const groq = hasGroq ? new Groq({ apiKey: process.env.GROQ_API_KEY! }) : null;
    const openai = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }) : null;
    const provider = hasGroq ? groq : openai;
    const model = hasGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

    // Build context-aware prompt
    const systemPrompt = `You are a friendly and helpful assistant for MoodMap, an AI-powered location recommendation app. 
Your role is to help users find the perfect places based on their mood, preferences, and location.

Current context:
- User's mood: ${mood || 'not specified'}
- User's city: ${city || 'not specified'}

You can:
1. Help users understand how MoodMap works
2. Suggest places based on their mood
3. Answer questions about locations, activities, or recommendations
4. Provide personalized advice for finding places

Be conversational, helpful, and encouraging. If the user asks about places, you can suggest they check their dashboard or select a mood to get personalized recommendations.`;

    // Check if user is asking for recommendations
    const isRecommendationRequest = 
      userMessage.includes('place') || 
      userMessage.includes('recommend') || 
      userMessage.includes('find') || 
      userMessage.includes('where') ||
      userMessage.includes('suggest') ||
      userMessage.includes('show me') ||
      userMessage.includes('quiet') ||
      userMessage.includes('peaceful') ||
      userMessage.includes('relaxed') ||
      userMessage.includes('calm');

    let response = '';

    // Handle recommendation requests
    if (isRecommendationRequest) {
      // Determine mood from message if not set
      let searchMood = mood;
      if (!searchMood) {
        if (userMessage.includes('quiet') || userMessage.includes('peaceful') || userMessage.includes('calm')) {
          searchMood = 'Relaxed';
        } else if (userMessage.includes('active') || userMessage.includes('energetic') || userMessage.includes('workout')) {
          searchMood = 'Energetic';
        } else if (userMessage.includes('social') || userMessage.includes('party') || userMessage.includes('fun')) {
          searchMood = 'Social';
        } else if (userMessage.includes('adventure') || userMessage.includes('explore')) {
          searchMood = 'Adventurous';
        }
      }
      
      const searchCity = city || 'your location';
      
      // Try to fetch places and provide specific recommendations
      try {
        const places = await fetchPlacesFromOpenStreetMap(searchCity, undefined, undefined, searchMood || 'Relaxed');
        
        if (places.length > 0) {
          const userContext: UserContext = { mood: searchMood || 'Relaxed', city: searchCity };
          
          try {
            const recommendedPlaces = await generatePersonalizedRecommendations(places.slice(0, 10), userContext);
            
            if (recommendedPlaces.length > 0) {
              const explanation = await generateRecommendationExplanation(recommendedPlaces, userContext);
              const placeNames = recommendedPlaces.slice(0, 3).map(p => p.name).join(', ');
              
              response = `Based on your request for ${userMessage.includes('quiet') ? 'quiet' : 'places'} in ${searchCity}, I'd recommend checking out places like ${placeNames}. ${explanation} You can see all recommendations on your dashboard!`;
            } else {
              response = `I found ${places.length} places in ${searchCity} that might match what you're looking for. Check your dashboard to see the full list!`;
            }
          } catch (aiError) {
            // If AI fails, still return places
            const placeNames = places.slice(0, 3).map(p => p.name).join(', ');
            response = `I found some great places in ${searchCity}: ${placeNames}. Check your dashboard to see all ${places.length} places I found!`;
          }
        } else {
          response = `I couldn't find specific places in ${searchCity} right now. Try selecting a mood on your dashboard or try a different location!`;
        }
      } catch (error) {
        console.error('Error fetching places for chatbot:', error);
        response = `I'd love to help you find places! Make sure you've selected a mood and location on your dashboard, or try asking me again.`;
      }
    } else {
      // General conversation
      try {
        const messages = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message }
        ];

        const completion = await provider.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 200,
        });

        response = completion.choices[0]?.message?.content || "I'm here to help! Try asking me about places or check your dashboard for recommendations.";
      } catch (aiError: any) {
        console.error('Error in chatbot AI call:', aiError);
        // Provide helpful fallback response
        if (userMessage.includes('quiet') || userMessage.includes('peaceful')) {
          response = "For quiet and peaceful places, I'd suggest selecting 'Relaxed' mood on your dashboard. This will show you spas, parks, libraries, and other tranquil spots!";
        } else {
          response = "I'm here to help you find great places! Try selecting a mood on your dashboard, or ask me specific questions about what you're looking for.";
        }
      }
    }

    return res.json({ response });
  } catch (error: any) {
    console.error('Error in chatbot route:', error);
    // Provide more specific error messages
    let errorMessage = "I'm having trouble processing your request right now. Please try again in a moment!";
    
    if (error.message?.includes('model_decommissioned')) {
      errorMessage = "The AI model needs to be updated. Please contact support.";
    } else if (error.message?.includes('API key')) {
      errorMessage = "AI services are temporarily unavailable. Please check your API configuration.";
    }
    
    return res.status(500).json({
      response: errorMessage
    });
  }
});

export default router;
