import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Chatbot from "../components/Chatbot";
import Filters, { FilterState } from "../components/Filters";
import MoodIndicator from "../components/MoodIndicator";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<any[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [aiPowered, setAiPowered] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [currentCity, setCurrentCity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>({
    rating: '',
    price: '',
    activityType: ''
  });

  useEffect(() => {
    const savedMood = localStorage.getItem('currentMood');
    const userCity = localStorage.getItem('userCity');
    const userLat = localStorage.getItem('userLat');
    const userLng = localStorage.getItem('userLng');
    
    // Get user preferences from localStorage (stored during onboarding)
    let userPreferences: string[] = [];
    try {
      const savedUser = localStorage.getItem('userPreferences');
      if (savedUser) {
        userPreferences = JSON.parse(savedUser);
      }
    } catch (e) {
      console.warn('Could not parse user preferences from localStorage');
    }
    
    setCurrentMood(savedMood || '');
    setCurrentCity(userCity || '');
    
    const params = new URLSearchParams();
    if (savedMood) params.append('mood', savedMood);
    if (userCity) params.append('city', userCity);
    if (userLat && userLng) {
      params.append('lat', userLat);
      params.append('lng', userLng);
    }
    if (userPreferences.length > 0) {
      params.append('preferences', JSON.stringify(userPreferences));
    }
    
    const apiUrl = `http://localhost:5001/api/places${params.toString() ? `?${params.toString()}` : ''}`;
    
    console.log('[Dashboard] Fetching places from:', apiUrl);
    axios.get(apiUrl)
      .then(res => {
        console.log('[Dashboard] Received response:', res.data);
        if (res.data.places && Array.isArray(res.data.places)) {
          console.log(`[Dashboard] Found ${res.data.places.length} places in response`);
          setPlaces(res.data.places);
          setFilteredPlaces(res.data.places);
          setExplanation(res.data.explanation || '');
          setAiPowered(res.data.aiPowered || false);
        } else if (Array.isArray(res.data)) {
          console.log(`[Dashboard] Legacy format - Found ${res.data.length} places`);
          setPlaces(res.data);
          setFilteredPlaces(res.data);
          setExplanation('');
          setAiPowered(false);
        } else {
          console.warn('[Dashboard] Unexpected response format:', res.data);
          setPlaces([]);
          setFilteredPlaces([]);
          setExplanation('');
          setAiPowered(false);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching places:', err);
        setPlaces([]);
        setFilteredPlaces([]);
        setExplanation('');
        setAiPowered(false);
        setIsLoading(false);
      });
  }, []);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...places];

    if (filters.rating) {
      const minRating = parseFloat(filters.rating);
      filtered = filtered.filter(p => parseFloat(p.rating) >= minRating);
    }

    if (filters.price) {
      filtered = filtered.filter(p => {
        if (filters.price === 'Free') return p.price === 'Free';
        return p.price === filters.price;
      });
    }

    if (filters.activityType) {
      filtered = filtered.filter(p => 
        p.type?.toLowerCase().includes(filters.activityType.toLowerCase())
      );
    }

    setFilteredPlaces(filtered);
  }, [filters, places]);

  const handleShowDetails = (place: any) => {
    setSelectedPlace(place);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedPlace(null);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen relative" style={{ fontFamily: "'Kalam', cursive" }}>
      {/* Doodle background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 text-6xl opacity-10 transform rotate-12 animate-float" style={{ fontFamily: "'Caveat', cursive" }}>✨</div>
        <div className="absolute top-40 right-20 text-5xl opacity-10 transform -rotate-12 animate-bounce-gentle" style={{ fontFamily: "'Caveat', cursive" }}>🎨</div>
        <div className="absolute bottom-40 left-20 text-4xl opacity-10 transform rotate-6 animate-pulse-doodle" style={{ fontFamily: "'Caveat', cursive" }}>🌟</div>
        <div className="absolute bottom-20 right-10 text-5xl opacity-10 transform -rotate-6 animate-float" style={{ fontFamily: "'Caveat', cursive" }}>💫</div>
      </div>

      {/* Enhanced Header */}
      <header className="bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 doodle-border text-white" style={{ borderRadius: '0 0 25px 10px', borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-4xl font-bold text-gradient" style={{ fontFamily: "'Poppins', sans-serif" }}>
                MoodMap
              </h1>
              {currentMood && (
                <div>
                  <MoodIndicator mood={currentMood} size="sm" />
                </div>
              )}
            </div>
            <nav className="flex space-x-3">
              <button 
                onClick={() => navigate('/mood')}
                className="doodle-button px-5 py-2 bg-gradient-to-r from-blue-800 via-purple-800 to-teal-800 text-white font-semibold text-base"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                🎭 New Mood
              </button>
              <button 
                onClick={() => navigate('/onboarding')}
                className="doodle-button px-5 py-2 bg-slate-700 text-white font-semibold border-3 border-slate-900"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                ⚙️ Preferences
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section with Mood & AI Badge */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
                <h2 className="text-4xl font-bold mb-2 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {currentMood ? `Places for Your ${currentMood} Mood` : 'Recommended Places'}
              </h2>
              {currentCity && (
                <p className="text-gray-300 flex items-center text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <span className="text-2xl mr-2">📍</span>
                  {currentCity}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-wrap">
              {aiPowered && (
                <span className="doodle-button bg-gradient-to-r from-blue-800 to-purple-800 text-white text-sm font-semibold px-4 py-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                  ✨ AI-Powered
                </span>
              )}
              {/* View Toggle */}
              <div className="doodle-border flex overflow-hidden" style={{ borderRadius: '12px 4px 10px 6px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 font-bold transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-blue-800 to-purple-800 text-white' : 'bg-slate-700 text-white'}`}
                  style={{ fontFamily: "'Kalam', cursive" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 font-bold transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-blue-800 to-purple-800 text-white' : 'bg-slate-700 text-white'}`}
                  style={{ fontFamily: "'Kalam', cursive" }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          {explanation && (
            <div className="doodle-card bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 p-6 mb-6 text-white">
              <div className="flex items-start">
                <div className="flex-shrink-0 text-4xl animate-bounce-gentle">💡</div>
                <div className="ml-4">
                  <p className="text-gray-800 text-base leading-relaxed font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <span className="text-2xl">✨</span> <span className="doodle-underline">Why these places?</span> {explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        {places.length > 0 && (
          <Filters onFilterChange={handleFilterChange} currentFilters={filters} />
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="text-6xl mb-4 animate-bounce-gentle">🔍</div>
            <p className="text-gray-300 font-semibold text-xl" style={{ fontFamily: "'Inter', sans-serif" }}>Finding perfect places for you...</p>
            <div className="mt-4 flex space-x-2">
              <div className="w-3 h-3 bg-blue-700 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-purple-700 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-teal-700 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            {filteredPlaces.length > 0 && (
              <div className="mb-4 text-sm text-gray-600">
                Showing <span className="font-semibold text-purple-600">{filteredPlaces.length}</span> of <span className="font-semibold">{places.length}</span> places
              </div>
            )}

            {/* Places Grid/List */}
            {filteredPlaces.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
                : "space-y-4"
              }>
                {filteredPlaces.map((place, index) => (
                  <div 
                    key={place.id} 
                    className={`doodle-card overflow-hidden bg-slate-800 ${
                      viewMode === 'list' ? 'flex' : ''
                    }`}
                  >
                    {/* Place Image */}
                    {place.photos && place.photos.length > 0 && (
                      <div className={`${viewMode === 'list' ? 'w-48 h-full' : 'w-full h-48'} overflow-hidden`}>
                        <img
                          src={place.photos[0]}
                          alt={place.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    {/* Place Content */}
                    <div className={`p-5 ${viewMode === 'list' ? 'flex-1' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-2xl font-bold text-white mb-1 flex-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{place.name}</h3>
                        <span className="doodle-button text-xs bg-gradient-to-r from-blue-800 to-purple-800 text-white px-3 py-1 font-semibold">
                          {place.type}
                        </span>
                      </div>
                      
                      <p className="text-base text-gray-300 mb-3 flex items-center font-medium">
                        <span className="text-xl mr-2">📍</span>
                        {place.city}
                      </p>

                      {place.description && (
                        <p className="text-sm text-gray-400 mb-4 line-clamp-2">{place.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-yellow-400 text-lg">⭐</span>
                            <span className="ml-1 text-sm font-semibold text-white">{place.rating}</span>
                          </div>
                          {place.price && (
                            <span className="text-sm font-medium text-gray-300">{place.price}</span>
                          )}
                        </div>
                      </div>

                      {/* Amenities Preview */}
                      {place.amenities && place.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {place.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                          {place.amenities.length > 3 && (
                            <span className="text-xs text-gray-500 px-2 py-1">+{place.amenities.length - 3}</span>
                          )}
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleShowDetails(place)}
                          className="doodle-button flex-1 px-4 py-2 bg-gradient-to-r from-blue-800 to-purple-800 text-white font-semibold text-sm"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          👀 View Details
                        </button>
                        <button className="doodle-button px-4 py-2 bg-slate-700 border-3 border-slate-900 text-white font-semibold hover:bg-slate-600" style={{ fontFamily: "'Inter', sans-serif" }}>
                          <span className="text-lg">💾</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-full text-center py-16">
                <div className="text-8xl mb-6 animate-bounce-gentle">🗺️</div>
                <h3 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>No places found</h3>
                <p className="text-gray-300 mb-6 max-w-md mx-auto text-lg font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {places.length === 0 
                    ? "Try selecting a mood to get personalized recommendations! 🎨"
                    : "No places match your current filters. Try adjusting them! 🔍"}
                </p>
                {places.length === 0 && (
                  <button 
                    onClick={() => navigate('/mood')}
                    className="doodle-button px-8 py-4 bg-gradient-to-r from-blue-800 via-purple-800 to-teal-800 text-white font-semibold text-lg"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    🚀 Start Exploring
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Place Details Modal */}
      {showDetails && selectedPlace && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="doodle-card max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-slate-800 text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">{selectedPlace.name}</h2>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedPlace.city}
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                      {selectedPlace.type}
                    </span>
                    <div className="flex items-center">
                      <span className="text-yellow-400 text-lg">⭐</span>
                      <span className="ml-1 font-semibold">{selectedPlace.rating}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600 text-3xl font-bold transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Photos */}
              {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPlace.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedPlace.name} photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-xl shadow-md"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedPlace.description && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">About</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedPlace.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {selectedPlace.hours && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                      🕒 Hours
                    </h3>
                    <p className="text-gray-600">{selectedPlace.hours}</p>
                  </div>
                )}

                {selectedPlace.price && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                      💰 Price Range
                    </h3>
                    <p className="text-gray-600 font-medium">{selectedPlace.price}</p>
                  </div>
                )}

                {selectedPlace.phone && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                      📞 Phone
                    </h3>
                    <a href={`tel:${selectedPlace.phone}`} className="text-purple-600 hover:text-purple-700">
                      {selectedPlace.phone}
                    </a>
                  </div>
                )}

                {selectedPlace.website && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                      🌐 Website
                    </h3>
                    <a 
                      href={`https://${selectedPlace.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-700 underline"
                    >
                      {selectedPlace.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Address */}
              {selectedPlace.address && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                    📍 Address
                  </h3>
                  <p className="text-gray-600">{selectedPlace.address}</p>
                </div>
              )}

              {/* Amenities */}
              {selectedPlace.amenities && selectedPlace.amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">✨ Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.amenities.map((amenity: string, index: number) => (
                      <span
                        key={index}
                        className="bg-gradient-to-r from-purple-800 to-blue-800 text-white px-4 py-2 rounded-full text-sm font-medium"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-800 to-blue-800 text-white rounded-lg hover:from-purple-900 hover:to-blue-900 transition-all duration-200 font-semibold shadow-md hover:shadow-lg">
                  💾 Save Place
                </button>
                <button 
                  onClick={handleCloseDetails}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chatbot */}
      <Chatbot currentMood={currentMood} currentCity={currentCity} />
    </div>
  );
};

export default DashboardPage;
