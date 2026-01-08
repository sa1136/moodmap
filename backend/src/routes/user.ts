import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// In-memory storage for demo purposes (replace with database later)
let users: any[] = [];

// POST /api/user - Save user preferences
router.post('/', (req, res) => {
  try {
    const { name, city, preferences } = req.body;

    // Validate required fields
    if (!name || !city) {
      return res.status(400).json({ 
        error: 'Name and city are required' 
      });
    }

    // Create user object
    const user = {
      id: uuidv4(),
      name: name.trim(),
      city: city.trim(),
      preferences: preferences || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // For demo purposes, we'll replace any existing user with same name/city
    // In production, you'd check authentication and update existing user
    const existingUserIndex = users.findIndex(u => 
      u.name.toLowerCase() === user.name.toLowerCase() && 
      u.city.toLowerCase() === user.city.toLowerCase()
    );

    if (existingUserIndex >= 0) {
      users[existingUserIndex] = { ...user, id: users[existingUserIndex].id };
    } else {
      users.push(user);
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
