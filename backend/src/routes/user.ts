import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

let users: any[] = [];

router.post('/', (req, res) => {
  try {
    const { name, city, preferences } = req.body;

    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({
        error: 'City is required',
      });
    }

    const displayName =
      typeof name === 'string' && name.trim().length > 0 ? name.trim() : 'Guest';

    const user = {
      id: uuidv4(),
      name: displayName,
      city: String(city).trim(),
      preferences: preferences || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store user data (for potential future use like analytics)
    const existingUserIndex = users.findIndex(u => 
      u.name.toLowerCase() === user.name.toLowerCase() && 
      u.city.toLowerCase() === user.city.toLowerCase()
    );

    if (existingUserIndex >= 0) {
      users[existingUserIndex] = { ...user, id: users[existingUserIndex].id };
    } else {
      users.push(user);
    }
    
    // Keep only last 100 users to prevent memory issues
    if (users.length > 100) {
      users = users.slice(-100);
    }

    res.status(201).json({
      message: 'User preferences saved successfully',
      user: {
        id: user.id,
        name: user.name,
        city: user.city,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Error saving user preferences:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});


export default router;
