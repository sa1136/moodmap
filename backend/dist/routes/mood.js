"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
// In-memory storage for demo purposes (replace with database later)
let moods = [];
// POST /api/mood - Save user mood
router.post('/', (req, res) => {
    try {
        const { mood, isCustom, timestamp } = req.body;
        // Validate required fields
        if (!mood || typeof mood !== 'string') {
            return res.status(400).json({
                error: 'Mood is required and must be a string'
            });
        }
        // Create mood object
        const moodEntry = {
            id: (0, uuid_1.v4)(),
            mood: mood.trim(),
            isCustom: Boolean(isCustom),
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        // Add to moods array
        moods.push(moodEntry);
        console.log(`New mood recorded: ${moodEntry.mood} (${moodEntry.isCustom ? 'custom' : 'preset'})`);
        res.status(201).json({
            message: 'Mood saved successfully',
            mood: {
                id: moodEntry.id,
                mood: moodEntry.mood,
                isCustom: moodEntry.isCustom,
                timestamp: moodEntry.timestamp
            }
        });
    }
    catch (error) {
        console.error('Error saving mood:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// GET /api/mood - Get recent moods (for demo)
router.get('/', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const recentMoods = moods
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limit);
        res.json({
            message: 'Moods retrieved successfully',
            moods: recentMoods,
            total: moods.length
        });
    }
    catch (error) {
        console.error('Error retrieving moods:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// GET /api/mood/current - Get the most recent mood
router.get('/current', (req, res) => {
    try {
        if (moods.length === 0) {
            return res.status(404).json({
                error: 'No moods recorded yet'
            });
        }
        const currentMood = moods
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        res.json({
            message: 'Current mood retrieved successfully',
            mood: currentMood
        });
    }
    catch (error) {
        console.error('Error retrieving current mood:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
// GET /api/mood/stats - Get mood statistics (for demo)
router.get('/stats', (req, res) => {
    try {
        const moodCounts = {};
        let customMoodCount = 0;
        let presetMoodCount = 0;
        moods.forEach(mood => {
            moodCounts[mood.mood] = (moodCounts[mood.mood] || 0) + 1;
            if (mood.isCustom) {
                customMoodCount++;
            }
            else {
                presetMoodCount++;
            }
        });
        const totalMoods = moods.length;
        const uniqueMoods = Object.keys(moodCounts).length;
        res.json({
            message: 'Mood statistics retrieved successfully',
            stats: {
                totalMoods,
                uniqueMoods,
                customMoodCount,
                presetMoodCount,
                mostCommonMoods: Object.entries(moodCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([mood, count]) => ({ mood, count }))
            }
        });
    }
    catch (error) {
        console.error('Error retrieving mood statistics:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});
exports.default = router;
