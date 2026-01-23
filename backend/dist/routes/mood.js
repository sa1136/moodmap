"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const router = express_1.default.Router();
let moods = [];
router.post('/', (req, res) => {
    try {
        const { mood, isCustom, timestamp } = req.body;
        if (!mood || typeof mood !== 'string') {
            return res.status(400).json({
                error: 'Mood is required and must be a string'
            });
        }
        const moodEntry = {
            id: (0, uuid_1.v4)(),
            mood: mood.trim(),
            isCustom: Boolean(isCustom),
            timestamp: timestamp || new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        moods.push(moodEntry);
        // Keep only last 100 moods to prevent memory issues
        if (moods.length > 100) {
            moods = moods.slice(-100);
        }
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
exports.default = router;
