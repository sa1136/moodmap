"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiService_1 = require("../services/aiService");
const vectorStore_1 = require("../services/vectorStore");
const placesApi_1 = require("../services/placesApi");
const router = (0, express_1.Router)();
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mood, city, lat, lng } = req.query;
        if (!mood) {
            return res.status(400).json({
                error: 'Mood parameter is required'
            });
        }
        let allPlaces = [];
        let cityName = city || 'your city';
        if (cityName.includes(',')) {
            cityName = cityName.split(',')[0].trim();
        }
        console.log(`[Places API] Request - mood: ${mood}, city: ${cityName}, lat: ${lat}, lng: ${lng}`);
        const osmPlaces = yield (0, placesApi_1.fetchPlacesFromOpenStreetMap)(cityName, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, mood);
        if (osmPlaces.length > 0) {
            allPlaces = osmPlaces;
            console.log(`✅ Successfully fetched ${allPlaces.length} places from OpenStreetMap`);
        }
        else {
            console.warn(`⚠️  No OpenStreetMap results found for "${cityName}" with mood "${mood}"`);
            allPlaces = [];
        }
        if (!vectorStore_1.vectorStore.getStats().initialized) {
            yield vectorStore_1.vectorStore.initialize(allPlaces, mood);
        }
        const userContext = {
            mood: mood,
            city: cityName,
        };
        let recommendedPlaces;
        // Check if any AI provider is available (Groq or OpenAI)
        const hasGroq = !!process.env.GROQ_API_KEY;
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        console.log(`[Places API] AI Provider Check - Groq: ${hasGroq ? '✅' : '❌'}, OpenAI: ${hasOpenAI ? '✅' : '❌'}`);
        if (hasGroq || hasOpenAI) {
            const provider = hasGroq ? 'Groq' : 'OpenAI';
            console.log(`[Places API] Using ${provider} for AI-powered recommendations`);
            recommendedPlaces = yield (0, aiService_1.generatePersonalizedRecommendations)(allPlaces, userContext);
            const explanation = yield (0, aiService_1.generateRecommendationExplanation)(recommendedPlaces, userContext);
            return res.json({
                places: recommendedPlaces,
                explanation,
                aiPowered: true,
                provider: provider.toLowerCase(),
                mood: mood,
                city: city || 'your location'
            });
        }
        else {
            // No AI available, but still return the OpenStreetMap places (if any)
            if (allPlaces.length > 0) {
                console.warn('No AI API key found (GROQ_API_KEY or OPENAI_API_KEY). Returning OpenStreetMap places without AI ranking.');
                recommendedPlaces = allPlaces.slice(0, 8); // Return top 8 places from OpenStreetMap
            }
            else {
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
    }
    catch (error) {
        console.error('Error in places route:', error);
        const { mood, city } = req.query;
        let fallbackCityName = city || 'your city';
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
}));
exports.default = router;
