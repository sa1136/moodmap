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

      {/* Enhanced Header */}
      <header className="bg-white sticky top-0 z-40 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient" style={{ fontFamily: "'Poppins', sans-serif", color: '#1e293b' }}>
                MoodMap
              </h1>
              {currentMood && (
                <div className="hidden sm:block">
                  <MoodIndicator mood={currentMood} size="sm" />
                </div>
              )}
            </div>
            {currentMood && (
              <div className="sm:hidden -mt-2">
                <MoodIndicator mood={currentMood} size="sm" />
              </div>
            )}
            <nav className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/mood')}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-2 text-white font-semibold text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center gap-1.5"
                style={{ backgroundColor: '#3d2817', fontFamily: "'Inter', sans-serif", border: 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a3728'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3d2817'}
              >
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">New Mood</span>
                <span className="sm:hidden text-xs">Mood</span>
              </button>
              <button
                onClick={() => navigate('/onboarding')}
                className="doodle-button flex-1 sm:flex-none px-3 sm:px-5 py-2 bg-gray-100 text-gray-700 font-semibold text-sm sm:text-base hover:bg-gray-200 flex items-center justify-center gap-1.5"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Settings</span>
                <span className="sm:hidden text-xs">Settings</span>
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
                <h2 className="text-4xl font-bold mb-2 text-gray-900" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {currentMood ? `Places for Your ${currentMood} Mood` : 'Recommended Places'}
              </h2>
              {currentCity && (
                <p className="text-gray-900 flex items-center text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentCity}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-wrap">
              {aiPowered && (
                <span className="text-white text-xs font-medium px-3 py-1.5 rounded-md" style={{ fontFamily: "'Inter', sans-serif", border: 'none', backgroundColor: '#3d2817' }}>
                  AI-Powered
                </span>
              )}
              {/* View Toggle */}
              <div className="flex overflow-hidden ml-auto sm:ml-0 bg-white border border-gray-200 rounded-lg" style={{ borderRadius: '12px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-4 py-2 font-bold transition-all ${viewMode === 'grid' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  style={viewMode === 'grid' ? { backgroundColor: '#3d2817', fontFamily: "'Inter', sans-serif" } : { fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={viewMode === 'grid' ? (e) => e.currentTarget.style.backgroundColor = '#4a3728' : undefined}
                  onMouseLeave={viewMode === 'grid' ? (e) => e.currentTarget.style.backgroundColor = '#3d2817' : undefined}
                  aria-label="Grid view"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-4 py-2 font-bold transition-all ${viewMode === 'list' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  style={viewMode === 'list' ? { backgroundColor: '#3d2817', fontFamily: "'Inter', sans-serif" } : { fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={viewMode === 'list' ? (e) => e.currentTarget.style.backgroundColor = '#4a3728' : undefined}
                  onMouseLeave={viewMode === 'list' ? (e) => e.currentTarget.style.backgroundColor = '#3d2817' : undefined}
                  aria-label="List view"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* AI Explanation */}
          {explanation && (
            <div className="doodle-card p-4 sm:p-6 mb-4 sm:mb-6" style={{ backgroundColor: '#f5f1eb' }}>
              <div className="flex items-start">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#4a3728' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <div className="ml-2 sm:ml-4">
                  <p className="text-gray-900 text-sm sm:text-base leading-relaxed font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                    <span className="font-semibold text-gray-900">Why these places?</span> <span className="block sm:inline mt-1 sm:mt-0 text-gray-700">{explanation}</span>
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
          <div className="flex flex-col justify-center items-center py-12 sm:py-20">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 animate-bounce-gentle">🔍</div>
            <p className="text-gray-900 font-semibold text-base sm:text-lg md:text-xl px-4 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>Finding perfect places for you...</p>
            <div className="mt-3 sm:mt-4 flex space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: '#4a3728' }}></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* Results Count */}
            {filteredPlaces.length > 0 && (
              <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-900">
                Showing <span className="font-semibold" style={{ color: '#4a3728' }}>{filteredPlaces.length}</span> of <span className="font-semibold">{places.length}</span> places
              </div>
            )}

            {/* Places Grid/List */}
            {filteredPlaces.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" 
                : "space-y-3 sm:space-y-4"
              }>
                {filteredPlaces.map((place, index) => (
                  <div 
                    key={place.id} 
                    className={`doodle-card overflow-hidden bg-white ${
                      viewMode === 'list' ? 'flex flex-col sm:flex-row' : ''
                    }`}
                  >
                    {/* Place Image */}
                    {place.photos && place.photos.length > 0 && (
                      <div className={`${viewMode === 'list' ? 'w-full sm:w-48 h-32 sm:h-full' : 'w-full h-40 sm:h-48'} overflow-hidden flex-shrink-0`}>
                        <img
                          src={place.photos[0]}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image if it fails to load
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Place Content */}
                    <div className={`p-4 sm:p-5 ${viewMode === 'list' ? 'flex-1' : ''}`} style={{ fontFamily: "'Inter', sans-serif" }}>
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1 flex-1 break-words" style={{ fontFamily: "'Poppins', sans-serif" }}>{place.name}</h3>
                        <span className="text-xs text-white px-2 sm:px-3 py-1 font-medium flex-shrink-0 rounded-md" style={{ border: 'none', backgroundColor: '#3d2817' }}>
                          {place.type}
                        </span>
                      </div>
                      
                      <p className="text-sm sm:text-base text-gray-900 mb-2 sm:mb-3 flex items-center font-medium">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{place.city}</span>
                      </p>

                      {place.description && (
                        <p className="text-xs sm:text-sm text-gray-800 mb-3 sm:mb-4 line-clamp-2">{place.description}</p>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 sm:w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-sm font-semibold text-gray-900">{place.rating}</span>
                          </div>
                          {place.price && (
                            <span className="text-sm font-medium text-gray-900">{place.price}</span>
                          )}
                        </div>
                      </div>

                      {/* Amenities Preview */}
                      {place.amenities && place.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {place.amenities.slice(0, 3).map((amenity: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f5f1eb', color: '#3d2817' }}
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
                          className="flex-1 px-3 sm:px-4 py-2 text-white font-medium text-xs sm:text-sm rounded-md transition-colors"
                          style={{ backgroundColor: '#3d2817', fontFamily: "'Inter', sans-serif", border: 'none' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a3728'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3d2817'}
                        >
                          Details
                        </button>
                        <button className="doodle-button px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200" style={{ fontFamily: "'Inter', sans-serif" }} aria-label="Save place">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-full text-center py-8 sm:py-12 md:py-16 px-4">
                <div className="text-5xl sm:text-6xl md:text-8xl mb-4 sm:mb-6 animate-bounce-gentle">🗺️</div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>No places found</h3>
                <p className="text-gray-900 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base md:text-lg font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {places.length === 0 
                    ? "Try selecting a mood to get personalized recommendations! 🎨"
                    : "No places match your current filters. Try adjusting them! 🔍"}
                </p>
                {places.length === 0 && (
                  <button 
                    onClick={() => navigate('/mood')}
                    className="px-6 sm:px-8 py-3 sm:py-4 text-white font-medium text-base sm:text-lg rounded-md transition-colors"
                    style={{ backgroundColor: '#3d2817', fontFamily: "'Inter', sans-serif", border: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a3728'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3d2817'}
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
          <div className="doodle-card max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="p-4 sm:p-6 md:p-8">
              {/* Header */}
              <div className="flex justify-between items-start mb-4 sm:mb-6 gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">{selectedPlace.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-900">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                      <span className="truncate">{selectedPlace.city}</span>
                    </span>
                    <span className="text-white px-2 sm:px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#3d2817' }}>
                      {selectedPlace.type}
                    </span>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="ml-1 font-semibold text-gray-900">{selectedPlace.rating}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-bold transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {/* Photos */}
              {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    {selectedPlace.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedPlace.name} photo ${index + 1}`}
                        className="w-full h-40 sm:h-48 object-cover rounded-xl"
                        onError={(e) => {
                          // Hide image if it fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedPlace.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">About</h3>
                  <p className="text-gray-900 text-sm sm:text-base leading-relaxed">{selectedPlace.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                {selectedPlace.hours && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      🕒 Hours
                    </h3>
                    <p className="text-gray-900 text-sm sm:text-base">{selectedPlace.hours}</p>
                  </div>
                )}

                {selectedPlace.price && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      💰 Price Range
                    </h3>
                    <p className="text-gray-900 font-medium text-sm sm:text-base">{selectedPlace.price}</p>
                  </div>
                )}

                {selectedPlace.phone && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      📞 Phone
                    </h3>
                    <a 
                      href={`tel:${selectedPlace.phone}`} 
                      className="text-sm sm:text-base break-all" 
                      style={{ color: '#4a3728' }} 
                      onMouseEnter={(e) => e.currentTarget.style.color = '#3d2817'} 
                      onMouseLeave={(e) => e.currentTarget.style.color = '#4a3728'}
                    >
                      {selectedPlace.phone}
                    </a>
                  </div>
                )}

                {selectedPlace.website && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      🌐 Website
                    </h3>
                    <a
                      href={selectedPlace.website.startsWith('http') ? selectedPlace.website : `https://${selectedPlace.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-sm sm:text-base break-all" style={{ color: '#4a3728' }} onMouseEnter={(e) => e.currentTarget.style.color = '#3d2817'} onMouseLeave={(e) => e.currentTarget.style.color = '#4a3728'}
                    >
                      {selectedPlace.website}
                    </a>
                  </div>
                )}
              </div>

              {/* Address */}
              {selectedPlace.address && (
                <div className="mb-4 sm:mb-6 bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    📍 Address
                  </h3>
                  <p className="text-gray-900 text-sm sm:text-base break-words">{selectedPlace.address}</p>
                </div>
              )}

              {/* Amenities */}
              {selectedPlace.amenities && selectedPlace.amenities.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">✨ Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.amenities.map((amenity: string, index: number) => (
                      <span
                        key={index}
                        className="text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium" style={{ backgroundColor: '#3d2817' }}
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-4 sm:pt-6 border-t border-gray-200">
                <button 
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-white rounded-md transition-colors duration-200 font-medium text-sm sm:text-base" 
                  style={{ backgroundColor: '#3d2817' }} 
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4a3728'} 
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3d2817'}
                >
                  Save Place
                </button>
                <button 
                  onClick={handleCloseDetails}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-semibold text-sm sm:text-base"
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
