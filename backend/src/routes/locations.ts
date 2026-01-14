import { Router } from "express";
import axios from "axios";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ 
        error: 'Query parameter "q" is required and must be at least 2 characters' 
      });
    }

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: q,
        format: 'json',
        limit: 8,
        addressdetails: 1,
        extratags: 1,
        featuretype: 'city,town,village,municipality',
        'accept-language': 'en',
      },
      headers: {
        'User-Agent': 'MoodMap/1.0',
      },
    });

    res.json(response.data);
  } catch (error: any) {
    console.error('Error searching locations:', error.message);
    res.status(500).json({ 
      error: 'Failed to search locations',
      message: error.message 
    });
  }
});

export default router;
