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
const placesApi_1 = require("../services/placesApi");
const router = (0, express_1.Router)();
router.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { mood, city, lat, lng, preferences } = req.query;
        if (!mood) {
            return res.status(400).json({
                error: 'Mood parameter is required'
            });
        }
        let allPlaces = [];
        // Keep full location string for geocoding (e.g. "Boston, MA, US" vs ambiguous "Boston").
        const locationQuery = (city || '').trim() || 'your city';
        const shortCityLabel = locationQuery.includes(',')
            ? locationQuery.split(',')[0].trim()
            : locationQuery;
        // Parse preferences if provided (can be comma-separated string or array)
        let preferencesArray = [];
        if (preferences) {
            if (typeof preferences === 'string') {
                try {
                    const parsed = JSON.parse(preferences);
                    preferencesArray = Array.isArray(parsed)
                        ? parsed.map((p) => String(p)).filter((p) => p.length > 0)
                        : [String(parsed)].filter((p) => p.length > 0);
                }
                catch (_a) {
                    // If not JSON, treat as comma-separated string
                    preferencesArray = preferences.split(',').map(p => p.trim()).filter(p => p.length > 0);
                }
            }
            else if (Array.isArray(preferences)) {
                preferencesArray = preferences.map((p) => String(p)).filter((p) => p.length > 0);
            }
            else {
                preferencesArray = [String(preferences)].filter((p) => p.length > 0);
            }
        }
        console.log(`[Places API] Request - mood: ${mood}, location: ${locationQuery}, lat: ${lat}, lng: ${lng}, preferences:`, preferencesArray);
        const osmPlaces = yield (0, placesApi_1.fetchPlacesFromOpenStreetMap)(locationQuery, lat ? parseFloat(lat) : undefined, lng ? parseFloat(lng) : undefined, mood, preferencesArray);
        if (osmPlaces.length > 0) {
            allPlaces = osmPlaces;
            console.log(`✅ Successfully fetched ${allPlaces.length} places from OpenStreetMap`);
        }
        else {
            console.warn(`⚠️  No OpenStreetMap results found for "${locationQuery}" with mood "${mood}"`);
            allPlaces = [];
        }
        const userContext = {
            mood: mood,
            city: shortCityLabel,
        };
        let recommendedPlaces;
        // Check if Groq is available
        const hasGroq = !!process.env.GROQ_API_KEY;
        console.log(`[Places API] AI Provider Check - Groq: ${hasGroq ? '✅' : '❌'}`);
        if (hasGroq) {
            console.log(`[Places API] Using Groq for AI-powered recommendations`);
            // Only use AI if we have places to work with
            if (allPlaces.length > 0) {
                try {
                    recommendedPlaces = yield (0, aiService_1.generatePersonalizedRecommendations)(allPlaces, userContext);
                    const explanation = yield (0, aiService_1.generateRecommendationExplanation)(recommendedPlaces, userContext);
                    return res.json({
                        places: recommendedPlaces.length > 0 ? recommendedPlaces : allPlaces.slice(0, 8),
                        explanation,
                        aiPowered: true,
                        provider: 'groq',
                        mood: mood,
                        city: locationQuery
                    });
                }
                catch (error) {
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
            }
            else {
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
        }
        else {
            // No AI available, but still return the OpenStreetMap places (if any)
            if (allPlaces.length > 0) {
                console.warn('No GROQ_API_KEY found. Returning OpenStreetMap places without AI ranking.');
                recommendedPlaces = allPlaces.slice(0, 8); // Return top 8 places from OpenStreetMap
            }
            else {
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
    }
    catch (error) {
        console.error('Error in places route:', error);
        const { mood, city } = req.query;
        const fallbackLocation = (city || 'your city').trim();
        return res.status(500).json({
            places: [],
            explanation: `Service temporarily unavailable. Please try again later.`,
            aiPowered: false,
            error: 'Service temporarily unavailable',
            mood: mood,
            city: fallbackLocation
        });
    }
}));
exports.default = router;
