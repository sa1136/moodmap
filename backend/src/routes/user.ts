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
      console.log(`Updated user: ${user.name} from ${user.city}`);
    } else {
      users.push(user);
      console.log(`Created new user: ${user.name} from ${user.city}`);
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

// GET /api/user - Get user preferences (for demo)
router.get('/', (req, res) => {
  try {
    res.json({
      message: 'Users retrieved successfully',
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        city: u.city,
        preferences: u.preferences,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    console.error('Error retrieving users:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

// GET /api/user/:id - Get specific user
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = users.find(u => u.id === id);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    res.json({
      message: 'User retrieved successfully',
      user: {
        id: user.id,
        name: user.name,
        city: user.city,
        preferences: user.preferences,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error retrieving user:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});

export default router;
