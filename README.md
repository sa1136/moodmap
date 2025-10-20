# MoodMap: AI-Powered Personalized Location Explorer

MoodMap is a web application that provides personalized location recommendations based on a user's preferences, context, and current mood. Unlike traditional location apps, MoodMap tailors suggestions to the user's emotional and activity state — helping them find the perfect place to visit, whether it's a quiet cafe, an energetic gym, or a lively event.

---

## 🚀 Features

- **AI-Powered Personalized Recommendations**  
  - Suggests nearby points of interest based on user preferences and location  
  - Combines content-based and collaborative filtering  
  - Provides natural-language explanations for recommendations  

- **Smart Filters & Context Awareness**  
  - Filters by distance, rating, cost, and activity type  
  - Adjusts suggestions in real time based on weather, time of day, and crowd level  

- **Mood Analyzer**  
  - User selects mood: Relaxed, Energetic, Adventurous, or Social  
  - AI dynamically updates suggestions based on emotional state  

---

## 🧠 Tech Stack

**Frontend:** React.js + TypeScript + Tailwind CSS  
**Backend:** Node.js + Express.js + TypeScript  
**APIs:** Foursquare Places API, OpenWeatherMap, Nominatim  
**Location Services:** Geolocation API, BigDataCloud Reverse Geocoding  

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- API keys for Foursquare and OpenWeatherMap

### Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sa1136/moodmap.git
   cd moodmap
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Add your API keys to `.env`:**
   ```env
   # Get your API keys from:
   # Foursquare: https://developer.foursquare.com/
   # OpenWeatherMap: https://openweathermap.org/api
   
   FOURSQUARE_API_KEY=your_foursquare_api_key_here
   FOURSQUARE_API_SECRET=your_foursquare_api_secret_here
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   
   PORT=5001
   NODE_ENV=development
   ```

5. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

---

## 🔑 API Keys Setup

### Foursquare Places API
1. Visit [Foursquare Developer Console](https://developer.foursquare.com/)
2. Create a new project
3. Get your API Key and Client Secret
4. Add them to your `.env` file

### OpenWeatherMap API
1. Visit [OpenWeatherMap API](https://openweathermap.org/api)
2. Sign up for a free account
3. Get your API key
4. Add it to your `.env` file

---

## 🚨 Security Notice

**Never commit your `.env` file to version control!** The `.env` file contains sensitive API keys and is already excluded from git tracking. Use `.env.example` as a template for setting up your environment variables.

---


