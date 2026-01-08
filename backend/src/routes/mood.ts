import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage for demo purposes (replace with database later)
let moods: any[] = [];

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
      id: uuidv4(),
      mood: mood.trim(),
      isCustom: Boolean(isCustom),
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Add to moods array
    moods.push(moodEntry);

    res.status(201).json({
      message: 'Mood saved successfully',
      mood: {
        id: moodEntry.id,
        mood: moodEntry.mood,
        isCustom: moodEntry.isCustom,
        timestamp: moodEntry.timestamp
      }
    });

  } catch (error) {
    console.error('Error saving mood:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});


export default router;
