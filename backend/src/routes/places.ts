import { Router } from "express";
import { generatePersonalizedRecommendations, generateRecommendationExplanation, Place, UserContext } from "../services/aiService";
import { vectorStore } from "../services/vectorStore";
import { fetchPlacesFromOpenStreetMap } from "../services/placesApi";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const { mood, city, lat, lng } = req.query;
    
    if (!mood) {
      return res.status(400).json({ 
        error: 'Mood parameter is required' 
      });
    }

    let allPlaces: Place[] = [];
    
    let cityName = (city as string) || 'your city';
    if (cityName.includes(',')) {
      cityName = cityName.split(',')[0].trim();
    }
    console.log(`[Places API] Request - mood: ${mood}, city: ${cityName}, lat: ${lat}, lng: ${lng}`);
    
    const osmPlaces = await fetchPlacesFromOpenStreetMap(
      cityName,
      lat ? parseFloat(lat as string) : undefined,
      lng ? parseFloat(lng as string) : undefined,
      mood as string
    );
    
    if (osmPlaces.length > 0) {
      allPlaces = osmPlaces;
      console.log(`✅ Successfully fetched ${allPlaces.length} places from OpenStreetMap`);
    } else {
      console.warn(`⚠️  No OpenStreetMap results found for "${cityName}" with mood "${mood}", using mock data`);
      allPlaces = getAllMockPlaces(cityName);
    }
    
    if (!vectorStore.getStats().initialized) {
      await vectorStore.initialize(allPlaces, mood as string);
    }

    const userContext: UserContext = {
      mood: mood as string,
      city: cityName,
    };

    let recommendedPlaces: Place[];
    
    if (process.env.OPENAI_API_KEY) {
      recommendedPlaces = await generatePersonalizedRecommendations(allPlaces, userContext);
      const explanation = await generateRecommendationExplanation(recommendedPlaces, userContext);
      
      return res.json({
        places: recommendedPlaces,
        explanation,
        aiPowered: true,
        mood: mood,
        city: city || 'your location'
      });
    } else {
      console.warn('OPENAI_API_KEY not found. Using fallback mock data.');
      recommendedPlaces = getMockPlaces(mood as string, cityName);
      
      return res.json({
        places: recommendedPlaces,
        explanation: `Based on your ${mood} mood, here are some places we think you'll enjoy in ${cityName}!`,
        aiPowered: false,
        mood: mood,
        city: cityName
      });
    }
  } catch (error) {
    console.error('Error in places route:', error);
    
    const { mood, city } = req.query;
    let fallbackCityName = (city as string) || 'your city';
    if (fallbackCityName.includes(',')) {
      fallbackCityName = fallbackCityName.split(',')[0].trim();
    }
    const fallbackPlaces = getMockPlaces(mood as string, fallbackCityName);
    
    return res.json({
      places: fallbackPlaces,
      explanation: `Based on your ${mood || 'current'} mood, here are some places we think you'll enjoy in ${fallbackCityName}!`,
      aiPowered: false,
      error: 'Service temporarily unavailable, showing fallback recommendations',
      mood: mood,
      city: fallbackCityName
    });
  }
});

/**
 * Get all mock places (used for AI processing)
 */
function getAllMockPlaces(city?: string): Place[] {
  const cityName = city || "your city";
  const allPlaces: Place[] = [];
  
  const moodCategories = ['happy', 'excited', 'relaxed', 'creative', 'adventurous', 'social', 'peaceful', 'energetic', 'curious', 'romantic'];
  
  moodCategories.forEach(mood => {
    const places = getMockPlacesByMood(mood, cityName);
    allPlaces.push(...places);
  });
  
  const uniquePlaces = Array.from(
    new Map(allPlaces.map(place => [place.id, place])).values()
  );
  
  return uniquePlaces;
}

/**
 * Get mock places for a specific mood (fallback function)
 */
function getMockPlaces(mood?: string, city?: string): Place[] {
  const cityName = city || "your city";
  let normalizedMood = mood?.toLowerCase().trim() || '';
  
  const moodMap: Record<string, string> = {
    'relaxed': 'relaxed',
    'energetic': 'energetic',
    'adventurous': 'adventurous',
    'social': 'social',
    'creative': 'creative',
    'focused': 'relaxed', // Map focused to relaxed (library, quiet spaces)
    'happy': 'happy',
    'excited': 'excited',
    'peaceful': 'peaceful',
    'curious': 'curious',
    'romantic': 'romantic',
  };
  
  normalizedMood = moodMap[normalizedMood] || normalizedMood;
  console.log(`[Mock Data] Looking for mood: "${mood}" -> normalized: "${normalizedMood}"`);
  
  const places = getMockPlacesByMood(normalizedMood, cityName);
  
  if (places.length > 0) {
    console.log(`[Mock Data] Found ${places.length} places for mood "${normalizedMood}"`);
    return places;
  } else {
    console.log(`[Mock Data] No places found for mood "${normalizedMood}", using default fallback`);
    return [
      { 
        id: 31, 
        name: "Local Cafe", 
        type: "Cafe", 
        rating: "4.2", 
        address: `123 Main Street, ${cityName}`, 
        city: cityName,
        description: "Cozy neighborhood cafe serving fresh coffee, pastries, and light meals. A perfect spot to relax and enjoy good company.",
        hours: "Daily: 6AM-8PM",
        price: "$",
        phone: "+1 (555) 111-2222",
        website: "www.localcafe.com",
        amenities: ["Free WiFi", "Outdoor Seating", "Pastries", "Laptop Friendly"],
        photos: ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400", "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"]
      },
      { 
        id: 32, 
        name: "City Park", 
        type: "Park", 
        rating: "4.1", 
        address: `456 Park Avenue, ${cityName}`, 
        city: cityName,
        description: "Beautiful urban park with walking paths, playground, and green spaces. Great for outdoor activities and family fun.",
        hours: "Daily: 6AM-10PM",
        price: "Free",
        phone: "+1 (555) 222-3333",
        website: "www.citypark.com",
        amenities: ["Walking Paths", "Playground", "Picnic Areas", "Public Restrooms"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 33, 
        name: "Shopping Mall", 
        type: "Shopping", 
        rating: "4.0", 
        address: `789 Commerce Blvd, ${cityName}`, 
        city: cityName,
        description: "Modern shopping center with diverse retail stores, restaurants, and entertainment options. One-stop destination for shopping and dining.",
        hours: "Mon-Sat: 10AM-9PM, Sun: 11AM-7PM",
        price: "$$",
        phone: "+1 (555) 333-4444",
        website: "www.shoppingmall.com",
        amenities: ["Multiple Stores", "Food Court", "Parking", "Entertainment"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400"]
      }
    ];
  }
}

/**
 * Get mock places by specific mood category
 */
function getMockPlacesByMood(mood?: string, city?: string): Place[] {
  const cityName = city || "your city";
  
  const normalizedMood = mood?.toLowerCase();
  
  const mockPlaces = {
    happy: [
      { 
        id: 1, 
        name: "Joyful Art Gallery", 
        type: "Art Gallery", 
        rating: "4.5", 
        address: `123 Art Street, ${cityName}`, 
        city: cityName,
        description: "A vibrant contemporary art gallery featuring local and international artists. Perfect for uplifting your spirits with colorful exhibitions and interactive installations.",
        hours: "Mon-Sat: 10AM-8PM, Sun: 12PM-6PM",
        price: "$$",
        phone: "+1 (555) 123-4567",
        website: "www.joyfulartgallery.com",
        amenities: ["Free WiFi", "Wheelchair Accessible", "Gift Shop", "Art Classes"],
        photos: ["https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400", "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"]
      },
      { 
        id: 2, 
        name: "Happy Hour Bar", 
        type: "Bar", 
        rating: "4.2", 
        address: `456 Fun Avenue, ${cityName}`, 
        city: cityName,
        description: "A lively bar with an upbeat atmosphere, craft cocktails, and live music. Great place to unwind and meet new people.",
        hours: "Mon-Thu: 4PM-12AM, Fri-Sat: 4PM-2AM, Sun: 5PM-11PM",
        price: "$$",
        phone: "+1 (555) 234-5678",
        website: "www.happyhourbar.com",
        amenities: ["Live Music", "Outdoor Seating", "Happy Hour Specials", "Pool Table"],
        photos: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400", "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400"]
      },
      { 
        id: 3, 
        name: "Comedy Club", 
        type: "Entertainment", 
        rating: "4.7", 
        address: `789 Laugh Lane, ${cityName}`, 
        city: cityName,
        description: "Premier comedy venue featuring stand-up shows, improv performances, and open mic nights. Guaranteed to make you laugh!",
        hours: "Wed-Sat: 7PM-11PM, Sun: 6PM-10PM",
        price: "$$$",
        phone: "+1 (555) 345-6789",
        website: "www.comedyclub.com",
        amenities: ["Full Bar", "Food Menu", "VIP Seating", "Group Discounts"],
        photos: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]
      }
    ],
    excited: [
      { 
        id: 4, 
        name: "Adventure Park", 
        type: "Amusement Park", 
        rating: "4.3", 
        address: `321 Thrill Road, ${cityName}`, 
        city: cityName,
        description: "High-energy amusement park with roller coasters, zip lines, and adventure courses. Perfect for adrenaline junkies!",
        hours: "Daily: 9AM-9PM (Seasonal)",
        price: "$$$",
        phone: "+1 (555) 456-7890",
        website: "www.adventurepark.com",
        amenities: ["Roller Coasters", "Zip Lines", "Food Court", "Parking"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"]
      },
      { 
        id: 5, 
        name: "Night Club", 
        type: "Nightlife", 
        rating: "4.1", 
        address: `654 Party Street, ${cityName}`, 
        city: cityName,
        description: "Trendy nightclub with state-of-the-art sound system, DJ performances, and vibrant dance floor. The ultimate party destination.",
        hours: "Thu-Sat: 9PM-3AM",
        price: "$$$",
        phone: "+1 (555) 567-8901",
        website: "www.nightclub.com",
        amenities: ["VIP Bottle Service", "Dress Code", "Coat Check", "Multiple Bars"],
        photos: ["https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]
      },
      { 
        id: 6, 
        name: "Escape Room", 
        type: "Entertainment", 
        rating: "4.6", 
        address: `987 Puzzle Place, ${cityName}`, 
        city: cityName,
        description: "Immersive escape room experiences with themed puzzles and challenges. Perfect for team building and brain teasers.",
        hours: "Daily: 10AM-10PM",
        price: "$$",
        phone: "+1 (555) 678-9012",
        website: "www.escaperoom.com",
        amenities: ["Multiple Themes", "Group Bookings", "Private Rooms", "Difficulty Levels"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400"]
      }
    ],
    relaxed: [
      { 
        id: 7, 
        name: "Serene Spa", 
        type: "Spa", 
        rating: "4.8", 
        address: `147 Zen Way, ${cityName}`, 
        city: cityName,
        description: "Luxury spa offering massages, facials, and wellness treatments in a tranquil environment. Perfect for relaxation and rejuvenation.",
        hours: "Daily: 9AM-9PM",
        price: "$$$",
        phone: "+1 (555) 789-0123",
        website: "www.serenespa.com",
        amenities: ["Massage Therapy", "Sauna", "Steam Room", "Wellness Packages"],
        photos: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]
      },
      { 
        id: 8, 
        name: "Peaceful Park", 
        type: "Park", 
        rating: "4.4", 
        address: `258 Nature Trail, ${cityName}`, 
        city: cityName,
        description: "Beautiful urban park with walking trails, gardens, and peaceful seating areas. Ideal for quiet reflection and nature connection.",
        hours: "Daily: 6AM-10PM",
        price: "Free",
        phone: "+1 (555) 890-1234",
        website: "www.peacefulpark.com",
        amenities: ["Walking Trails", "Picnic Areas", "Playground", "Public Restrooms"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 9, 
        name: "Quiet Library", 
        type: "Library", 
        rating: "4.5", 
        address: `369 Book Street, ${cityName}`, 
        city: cityName,
        description: "Modern public library with extensive book collections, quiet study areas, and community programs. A haven for book lovers.",
        hours: "Mon-Thu: 9AM-9PM, Fri-Sat: 9AM-6PM, Sun: 1PM-5PM",
        price: "Free",
        phone: "+1 (555) 901-2345",
        website: "www.quietlibrary.com",
        amenities: ["Free WiFi", "Study Rooms", "Computer Access", "Book Clubs"],
        photos: ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"]
      }
    ],
    creative: [
      { 
        id: 10, 
        name: "Art Studio", 
        type: "Art Studio", 
        rating: "4.6", 
        address: `741 Creative Corner, ${cityName}`, 
        city: cityName,
        description: "Inspiring art studio offering classes, workshops, and open studio time for artists of all levels. Unleash your creativity!",
        hours: "Mon-Sat: 10AM-8PM, Sun: 12PM-6PM",
        price: "$$",
        phone: "+1 (555) 012-3456",
        website: "www.artstudio.com",
        amenities: ["Art Classes", "Open Studio", "Art Supplies", "Exhibition Space"],
        photos: ["https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400", "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"]
      },
      { 
        id: 11, 
        name: "Museum of Modern Art", 
        type: "Museum", 
        rating: "4.7", 
        address: `852 Culture Avenue, ${cityName}`, 
        city: cityName,
        description: "Contemporary art museum featuring rotating exhibitions, installations, and educational programs. A cultural gem in the city.",
        hours: "Tue-Sun: 10AM-6PM, Thu: 10AM-9PM",
        price: "$$",
        phone: "+1 (555) 123-4567",
        website: "www.moma.com",
        amenities: ["Guided Tours", "Gift Shop", "Cafe", "Wheelchair Accessible"],
        photos: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400"]
      },
      { 
        id: 12, 
        name: "Pottery Workshop", 
        type: "Workshop", 
        rating: "4.3", 
        address: `963 Craft Lane, ${cityName}`, 
        city: cityName,
        description: "Hands-on pottery studio where you can learn wheel throwing, glazing, and ceramic techniques. Create your own masterpiece!",
        hours: "Mon-Sat: 10AM-8PM, Sun: 12PM-6PM",
        price: "$$",
        phone: "+1 (555) 234-5678",
        website: "www.potteryworkshop.com",
        amenities: ["Wheel Throwing", "Glazing Classes", "Kiln Firing", "Take Home Creations"],
        photos: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400"]
      }
    ],
    adventurous: [
      { 
        id: 13, 
        name: "Rock Climbing Gym", 
        type: "Gym", 
        rating: "4.5", 
        address: `159 Adventure Alley, ${cityName}`, 
        city: cityName,
        description: "Indoor rock climbing facility with various difficulty levels, bouldering areas, and professional instruction. Challenge yourself!",
        hours: "Mon-Fri: 6AM-10PM, Sat-Sun: 8AM-8PM",
        price: "$$",
        phone: "+1 (555) 345-6789",
        website: "www.rockclimbinggym.com",
        amenities: ["Equipment Rental", "Climbing Lessons", "Bouldering", "Fitness Area"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400"]
      },
      { 
        id: 14, 
        name: "Hiking Trail", 
        type: "Trail", 
        rating: "4.6", 
        address: `357 Mountain View, ${cityName}`, 
        city: cityName,
        description: "Scenic hiking trail with varying difficulty levels, beautiful views, and natural landmarks. Perfect for outdoor enthusiasts.",
        hours: "Daily: Sunrise to Sunset",
        price: "Free",
        phone: "+1 (555) 456-7890",
        website: "www.hikingtrail.com",
        amenities: ["Trail Maps", "Parking", "Rest Areas", "Scenic Overlooks"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 15, 
        name: "Kayaking Center", 
        type: "Water Sports", 
        rating: "4.4", 
        address: `753 River Road, ${cityName}`, 
        city: cityName,
        description: "Water sports center offering kayak rentals, guided tours, and lessons. Explore the waterways and enjoy nature from a different perspective.",
        hours: "Daily: 8AM-6PM (Seasonal)",
        price: "$$",
        phone: "+1 (555) 567-8901",
        website: "www.kayakingcenter.com",
        amenities: ["Kayak Rental", "Guided Tours", "Safety Equipment", "Lessons"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      }
    ],
    social: [
      { 
        id: 16, 
        name: "Local Bistro", 
        type: "Restaurant", 
        rating: "4.3", 
        address: `123 Main Street, ${cityName}`, 
        city: cityName,
        description: "Cozy neighborhood bistro serving fresh, locally-sourced cuisine in a warm, welcoming atmosphere. Perfect for social dining.",
        hours: "Mon-Sat: 11AM-10PM, Sun: 10AM-9PM",
        price: "$$",
        phone: "+1 (555) 678-9012",
        website: "www.localbistro.com",
        amenities: ["Outdoor Seating", "Full Bar", "Reservations", "Takeout"],
        photos: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400", "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400"]
      },
      { 
        id: 17, 
        name: "Community Center", 
        type: "Community", 
        rating: "4.2", 
        address: `456 Community Ave, ${cityName}`, 
        city: cityName,
        description: "Vibrant community hub offering classes, events, and social activities for all ages. Connect with your neighbors and make new friends.",
        hours: "Mon-Fri: 8AM-9PM, Sat: 9AM-5PM, Sun: 10AM-4PM",
        price: "Free-$",
        phone: "+1 (555) 789-0123",
        website: "www.communitycenter.com",
        amenities: ["Event Space", "Fitness Classes", "Meeting Rooms", "Youth Programs"],
        photos: ["https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"]
      },
      { 
        id: 18, 
        name: "Coffee Shop", 
        type: "Cafe", 
        rating: "4.4", 
        address: `789 Coffee Lane, ${cityName}`, 
        city: cityName,
        description: "Charming coffee shop with artisanal brews, light meals, and a friendly atmosphere. Great place to work, study, or catch up with friends.",
        hours: "Daily: 6AM-8PM",
        price: "$",
        phone: "+1 (555) 890-1234",
        website: "www.coffeeshop.com",
        amenities: ["Free WiFi", "Outdoor Seating", "Pastries", "Laptop Friendly"],
        photos: ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400", "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"]
      }
    ],
    peaceful: [
      { 
        id: 19, 
        name: "Zen Garden", 
        type: "Garden", 
        rating: "4.7", 
        address: `147 Peaceful Way, ${cityName}`, 
        city: cityName,
        description: "Tranquil Japanese-style garden with meditation areas, koi ponds, and carefully designed landscapes. A sanctuary for inner peace.",
        hours: "Daily: 8AM-6PM",
        price: "$",
        phone: "+1 (555) 901-2345",
        website: "www.zengarden.com",
        amenities: ["Meditation Areas", "Koi Ponds", "Walking Paths", "Gift Shop"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 20, 
        name: "Meditation Center", 
        type: "Wellness", 
        rating: "4.6", 
        address: `258 Serenity St, ${cityName}`, 
        city: cityName,
        description: "Dedicated meditation and wellness center offering classes, workshops, and quiet spaces for mindfulness and spiritual growth.",
        hours: "Mon-Sat: 7AM-9PM, Sun: 8AM-7PM",
        price: "$$",
        phone: "+1 (555) 012-3456",
        website: "www.meditationcenter.com",
        amenities: ["Meditation Classes", "Quiet Rooms", "Wellness Workshops", "Yoga"],
        photos: ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]
      },
      { 
        id: 21, 
        name: "Botanical Garden", 
        type: "Garden", 
        rating: "4.5", 
        address: `369 Nature Blvd, ${cityName}`, 
        city: cityName,
        description: "Beautiful botanical garden featuring diverse plant collections, themed gardens, and educational exhibits. A peaceful escape in nature.",
        hours: "Daily: 9AM-5PM",
        price: "$$",
        phone: "+1 (555) 123-4567",
        website: "www.botanicalgarden.com",
        amenities: ["Greenhouse", "Gift Shop", "Educational Programs", "Cafe"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      }
    ],
    energetic: [
      { 
        id: 22, 
        name: "Fitness Center", 
        type: "Gym", 
        rating: "4.3", 
        address: `741 Energy Ave, ${cityName}`, 
        city: cityName,
        description: "Full-service fitness center with modern equipment, group classes, and personal training. Get your energy flowing!",
        hours: "Daily: 5AM-11PM",
        price: "$$",
        phone: "+1 (555) 234-5678",
        website: "www.fitnesscenter.com",
        amenities: ["Cardio Equipment", "Weight Training", "Group Classes", "Personal Training"],
        photos: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400", "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400"]
      },
      { 
        id: 23, 
        name: "Dance Studio", 
        type: "Studio", 
        rating: "4.4", 
        address: `852 Rhythm St, ${cityName}`, 
        city: cityName,
        description: "Dynamic dance studio offering classes in various styles from hip-hop to ballet. Express yourself through movement!",
        hours: "Mon-Fri: 4PM-10PM, Sat: 9AM-6PM, Sun: 10AM-4PM",
        price: "$$",
        phone: "+1 (555) 345-6789",
        website: "www.dancestudio.com",
        amenities: ["Multiple Dance Styles", "Performance Opportunities", "Private Lessons", "Recitals"],
        photos: ["https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"]
      },
      { 
        id: 24, 
        name: "Sports Complex", 
        type: "Sports", 
        rating: "4.2", 
        address: `963 Active Lane, ${cityName}`, 
        city: cityName,
        description: "Multi-sport facility with courts, fields, and recreational activities. Perfect for team sports and active recreation.",
        hours: "Daily: 6AM-10PM",
        price: "$$",
        phone: "+1 (555) 456-7890",
        website: "www.sportscomplex.com",
        amenities: ["Basketball Courts", "Tennis Courts", "Soccer Fields", "Equipment Rental"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400"]
      }
    ],
    curious: [
      { 
        id: 25, 
        name: "Science Museum", 
        type: "Museum", 
        rating: "4.6", 
        address: `159 Discovery Ave, ${cityName}`, 
        city: cityName,
        description: "Interactive science museum with hands-on exhibits, planetarium shows, and educational programs. Feed your curiosity!",
        hours: "Tue-Sun: 9AM-5PM, Mon: Closed",
        price: "$$",
        phone: "+1 (555) 567-8901",
        website: "www.sciencemuseum.com",
        amenities: ["Interactive Exhibits", "Planetarium", "Gift Shop", "Educational Programs"],
        photos: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400"]
      },
      { 
        id: 26, 
        name: "Historical Site", 
        type: "Historic", 
        rating: "4.4", 
        address: `357 Heritage St, ${cityName}`, 
        city: cityName,
        description: "Well-preserved historical landmark with guided tours, artifacts, and educational exhibits about local history and culture.",
        hours: "Wed-Sun: 10AM-4PM, Mon-Tue: Closed",
        price: "$",
        phone: "+1 (555) 678-9012",
        website: "www.historicalsite.com",
        amenities: ["Guided Tours", "Historical Artifacts", "Educational Programs", "Gift Shop"],
        photos: ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"]
      },
      { 
        id: 27, 
        name: "Planetarium", 
        type: "Museum", 
        rating: "4.5", 
        address: `753 Star Lane, ${cityName}`, 
        city: cityName,
        description: "State-of-the-art planetarium offering immersive astronomy shows, stargazing programs, and educational presentations about the cosmos.",
        hours: "Tue-Sun: 10AM-8PM, Mon: Closed",
        price: "$$",
        phone: "+1 (555) 789-0123",
        website: "www.planetarium.com",
        amenities: ["Dome Shows", "Stargazing Programs", "Gift Shop", "Educational Tours"],
        photos: ["https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400", "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400"]
      }
    ],
    romantic: [
      { 
        id: 28, 
        name: "Fine Dining Restaurant", 
        type: "Restaurant", 
        rating: "4.7", 
        address: `147 Romance Ave, ${cityName}`, 
        city: cityName,
        description: "Elegant fine dining establishment with intimate atmosphere, gourmet cuisine, and exceptional service. Perfect for special occasions.",
        hours: "Tue-Sat: 6PM-10PM, Sun: 5PM-9PM, Mon: Closed",
        price: "$$$",
        phone: "+1 (555) 890-1234",
        website: "www.finedining.com",
        amenities: ["Wine List", "Private Dining", "Valet Parking", "Reservations Required"],
        photos: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400", "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400"]
      },
      { 
        id: 29, 
        name: "Scenic Overlook", 
        type: "Viewpoint", 
        rating: "4.5", 
        address: `258 Love Lane, ${cityName}`, 
        city: cityName,
        description: "Breathtaking scenic viewpoint offering panoramic views of the city and surrounding landscape. Ideal for romantic moments and photography.",
        hours: "Daily: 24/7",
        price: "Free",
        phone: "+1 (555) 901-2345",
        website: "www.scenicoverlook.com",
        amenities: ["Panoramic Views", "Parking", "Benches", "Photography Spots"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 30, 
        name: "Wine Bar", 
        type: "Bar", 
        rating: "4.4", 
        address: `369 Intimate St, ${cityName}`, 
        city: cityName,
        description: "Cozy wine bar featuring curated wine selections, artisanal cheeses, and intimate atmosphere. Perfect for romantic conversations.",
        hours: "Mon-Thu: 4PM-11PM, Fri-Sat: 4PM-12AM, Sun: 3PM-10PM",
        price: "$$",
        phone: "+1 (555) 012-3456",
        website: "www.winebar.com",
        amenities: ["Wine Tastings", "Cheese Platters", "Intimate Seating", "Live Music"],
        photos: ["https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400", "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400"]
      }
    ]
  };

  const selectedPlaces = mockPlaces[normalizedMood as keyof typeof mockPlaces];
  
  if (selectedPlaces) {
    return selectedPlaces;
      } else {
        return [
      { 
        id: 31, 
        name: "Local Cafe", 
        type: "Cafe", 
        rating: "4.2", 
        address: `123 Main Street, ${cityName}`, 
        city: cityName,
        description: "Cozy neighborhood cafe serving fresh coffee, pastries, and light meals. A perfect spot to relax and enjoy good company.",
        hours: "Daily: 6AM-8PM",
        price: "$",
        phone: "+1 (555) 111-2222",
        website: "www.localcafe.com",
        amenities: ["Free WiFi", "Outdoor Seating", "Pastries", "Laptop Friendly"],
        photos: ["https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400", "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400"]
      },
      { 
        id: 32, 
        name: "City Park", 
        type: "Park", 
        rating: "4.1", 
        address: `456 Park Avenue, ${cityName}`, 
        city: cityName,
        description: "Beautiful urban park with walking paths, playground, and green spaces. Great for outdoor activities and family fun.",
        hours: "Daily: 6AM-10PM",
        price: "Free",
        phone: "+1 (555) 222-3333",
        website: "www.citypark.com",
        amenities: ["Walking Paths", "Playground", "Picnic Areas", "Public Restrooms"],
        photos: ["https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400", "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400"]
      },
      { 
        id: 33, 
        name: "Shopping Mall", 
        type: "Shopping", 
        rating: "4.0", 
        address: `789 Commerce Blvd, ${cityName}`, 
        city: cityName,
        description: "Modern shopping center with diverse retail stores, restaurants, and entertainment options. One-stop destination for shopping and dining.",
        hours: "Mon-Sat: 10AM-9PM, Sun: 11AM-7PM",
        price: "$$",
        phone: "+1 (555) 333-4444",
        website: "www.shoppingmall.com",
        amenities: ["Multiple Stores", "Food Court", "Parking", "Entertainment"],
        photos: ["https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400", "https://images.unsplash.com/photo-1571266028243-e68f8574c9b2?w=400"]
      }
    ];
  }
}

export default router;
