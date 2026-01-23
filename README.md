# MoodMap: AI-Powered Personalized Location Explorer

MoodMap is a web application that provides personalized location recommendations based on a user's preferences, context, and current mood. Unlike traditional location apps, MoodMap tailors suggestions to the user's emotional and activity state — helping them find the perfect place to visit, whether it's a quiet cafe, an energetic gym, or a lively event.

---

## 🚀 Features

- **AI-Powered Personalized Recommendations**  
  - Uses RAG (Retrieval-Augmented Generation) with **Groq** (ultra-fast inference) or **OpenAI GPT-4o-mini** for intelligent recommendations  
  - Semantic search using text embeddings to match places with user mood  
  - Suggests nearby points of interest based on user preferences and location  
  - Provides natural-language explanations for recommendations  
  - Falls back to rule-based matching if AI service is unavailable  

- **Smart Mood-Based Filtering**  
  - Filters places based on user's current mood  
  - Provides personalized recommendations tailored to emotional state  

- **Mood Analyzer**  
  - User selects mood: Relaxed, Energetic, Adventurous, or Social  
  - AI dynamically updates suggestions based on emotional state  

---

## 🧠 Tech Stack

**Frontend:** React.js + TypeScript + Tailwind CSS  
**Backend:** Node.js + Express.js + TypeScript  
**AI/ML:** Groq (Llama 3.1 70B) or OpenAI GPT-4o-mini, Text Embeddings (text-embedding-3-small), RAG (Retrieval-Augmented Generation)  
**APIs:** OpenStreetMap/Nominatim (100% FREE, no API key required)  
**Location Services:** Browser Geolocation API  
**Vector Storage:** In-memory vector store (production-ready for Pinecone/Weaviate integration)  

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- **Groq API key** (recommended - for ultra-fast AI inference) **OR** OpenAI API key (optional - for AI-powered recommendations)

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

4. **Add your API keys to `.env` (optional):**
   ```env
   # Groq API (recommended - for ultra-fast AI inference)
   # Get your API key from: https://console.groq.com/keys
   GROQ_API_KEY=your_groq_api_key_here
   
   # OpenAI API (optional - for AI-powered recommendations and embeddings)
   # Get your API key from: https://platform.openai.com/api-keys
   # Note: OpenAI is required for text embeddings (semantic search)
   OPENAI_API_KEY=your_openai_api_key_here
   
   PORT=5001
   NODE_ENV=development
   ```
   
   **Note:** 
   - The app works without API keys, but will use rule-based matching instead of AI recommendations
   - **Groq** is recommended for chat completions (faster inference, lower latency)
   - **OpenAI** is required for text embeddings (used in semantic search)
   - You can use both: Groq for recommendations + OpenAI for embeddings

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

### Groq API (Recommended for Fast AI Inference)
1. Visit [Groq Console](https://console.groq.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://console.groq.com/keys)
4. Create a new API key
5. Add it to your `.env` file as `GROQ_API_KEY`
6. **Benefits:** Ultra-fast inference, lower latency, cost-effective
7. **Note:** Groq is used for chat completions (recommendations and explanations). For embeddings, OpenAI is still required.

### OpenAI API (Required for Embeddings, Optional for Chat)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Create a new API key
5. Add it to your `.env` file as `OPENAI_API_KEY`
6. **Note:** 
   - OpenAI is **required** for text embeddings (semantic search functionality)
   - If you have both Groq and OpenAI keys, Groq will be used for chat completions (faster), and OpenAI for embeddings
   - The app will work without OpenAI but semantic search features will be disabled

### Places Data Source
The app uses **OpenStreetMap/Nominatim** to fetch real places:
- **100% FREE** - No API key required!
- **Works immediately** - No setup or registration needed
- **No limits** - OpenStreetMap is completely free and open source
- **Mock Data** (fallback) - Hardcoded sample places if OpenStreetMap doesn't return results

**🎉 Good News:** The app automatically uses OpenStreetMap to fetch real places - just run it and it works!

---

## 🚨 Security Notice

**Never commit your `.env` file to version control!** The `.env` file contains sensitive API keys and is already excluded from git tracking. Use `.env.example` as a template for setting up your environment variables.

---


