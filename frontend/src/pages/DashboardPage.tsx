import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Chatbot from "../components/Chatbot";
import MoodIndicator from "../components/MoodIndicator";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [aiPowered, setAiPowered] = useState<boolean>(false);
  const [currentMood, setCurrentMood] = useState<string>('');
  const [currentCity, setCurrentCity] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

    axios.get(apiUrl)
      .then(res => {
        if (res.data.places && Array.isArray(res.data.places)) {
          setPlaces(res.data.places);
          setExplanation(res.data.explanation || '');
          setAiPowered(res.data.aiPowered || false);
        } else if (Array.isArray(res.data)) {
          setPlaces(res.data);
          setExplanation('');
          setAiPowered(false);
        } else {
          setPlaces([]);
          setExplanation('');
          setAiPowered(false);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching places:', err);
        setPlaces([]);
        setExplanation('');
        setAiPowered(false);
        setIsLoading(false);
      });
  }, []);

  const handleShowDetails = (place: any) => {
    setSelectedPlace(place);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedPlace(null);
  };

  return (
    <div className="min-h-screen relative">

      {/* Enhanced Header */}
      <header
        className="sticky top-0 z-40 border-b shadow-sm backdrop-blur-md"
        style={{
          background:
            "radial-gradient(900px 420px at 20% 0%, rgba(124, 58, 237, 0.28), rgba(0, 0, 0, 0) 60%), linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))",
          borderColor: "rgba(255, 255, 255, 0.10)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255, 255, 255, 0.98), rgba(199, 210, 254, 0.92))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
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
                onClick={() => navigate('/onboarding')}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-2 font-semibold text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center gap-1.5 text-slate-900"
                style={{
                  backgroundColor: "#ffffff",
                  fontFamily: "'Inter', sans-serif",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ffffff";
                }}
              >
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">New Mood</span>
                <span className="sm:hidden text-xs">Mood</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 pb-28 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Section with Mood & AI Badge */}
        <div className="mb-8">
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-md shadow-[0_12px_40px_-12px_rgba(2,6,23,0.45)] px-4 py-5 sm:px-6 sm:py-6 mb-6"
          >
          <div className="flex items-center justify-between mb-0 flex-wrap gap-4">
            <div>
                <h2 className="text-4xl font-bold mb-2 text-white drop-shadow-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {currentMood ? `Places for Your ${currentMood} Mood` : 'Recommended Places'}
              </h2>
              {currentCity && (
                <p className="text-slate-200 flex items-center text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif" }}>
                  <svg className="w-5 h-5 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {currentCity}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-wrap">
              {aiPowered && (
                <span className="text-white text-xs font-medium px-3 py-1.5 rounded-md" style={{ fontFamily: "'Inter', sans-serif", border: 'none', backgroundColor: '#7c3aed' }}>
                  AI-Powered
                </span>
              )}
              {/* View Toggle */}
              <div className="flex overflow-hidden ml-auto sm:ml-0 bg-white border border-gray-200 rounded-lg" style={{ borderRadius: '12px' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2 sm:px-4 py-2 font-bold transition-all ${viewMode === 'grid' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  style={viewMode === 'grid' ? { backgroundColor: '#7c3aed', fontFamily: "'Inter', sans-serif" } : { fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={viewMode === 'grid' ? (e) => e.currentTarget.style.backgroundColor = '#6d28d9' : undefined}
                  onMouseLeave={viewMode === 'grid' ? (e) => e.currentTarget.style.backgroundColor = '#7c3aed' : undefined}
                  aria-label="Grid view"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-4 py-2 font-bold transition-all ${viewMode === 'list' ? 'text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  style={viewMode === 'list' ? { backgroundColor: '#7c3aed', fontFamily: "'Inter', sans-serif" } : { fontFamily: "'Inter', sans-serif" }}
                  onMouseEnter={viewMode === 'list' ? (e) => e.currentTarget.style.backgroundColor = '#6d28d9' : undefined}
                  onMouseLeave={viewMode === 'list' ? (e) => e.currentTarget.style.backgroundColor = '#7c3aed' : undefined}
                  aria-label="List view"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* AI Explanation */}
          {explanation && (
            <div
              className="doodle-card p-4 sm:p-6 mb-4 sm:mb-6 border border-white/20 shadow-lg"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.94)' }}
            >
              <div className="flex items-start">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#7c3aed' }}>
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

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-12 sm:py-20">
            <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4 animate-bounce-gentle">🔍</div>
            <p className="text-slate-100 font-semibold text-base sm:text-lg md:text-xl px-4 text-center drop-shadow-sm" style={{ fontFamily: "'Inter', sans-serif" }}>Finding perfect places for you...</p>
            <div className="mt-3 sm:mt-4 flex space-x-2">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-bounce" style={{ animationDelay: '0ms', backgroundColor: '#7c3aed' }}></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 sm:w-3 sm:h-3 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : (
          <>
            {/* Places Grid/List */}
            {places.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch" 
                : "space-y-3 sm:space-y-4"
              }>
                {places.map((place) => (
                  <div
                    key={place.id}
                    className="doodle-card overflow-hidden bg-white rounded-2xl shadow-[0_14px_40px_-14px_rgba(15,23,42,0.28)] border border-slate-200/90 flex flex-col h-[22rem] sm:h-[24rem] lg:h-[25rem]"
                  >
                    <div className="flex-1 min-h-0 bg-slate-100 overflow-hidden flex items-stretch">
                      {place.photos?.[0] ? (
                        <img
                          src={place.photos[0]}
                          alt=""
                          className="w-full h-full object-cover object-center block"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 via-slate-100 to-slate-200 text-slate-400"
                          aria-hidden
                        >
                          <span className="text-5xl">📍</span>
                        </div>
                      )}
                    </div>
                    <div
                      className="p-4 sm:p-5 flex flex-col gap-3 shrink-0 border-t border-slate-100"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      <h3
                        className="text-lg sm:text-xl font-bold text-gray-900 break-words line-clamp-2 min-h-[2.75rem] sm:min-h-[3.25rem] leading-snug"
                        style={{ fontFamily: "'Poppins', sans-serif" }}
                      >
                        {place.name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleShowDetails(place)}
                        className="w-full px-4 py-2.5 text-white font-semibold text-sm rounded-lg transition-colors"
                        style={{ backgroundColor: '#7c3aed', fontFamily: "'Inter', sans-serif", border: 'none' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#6d28d9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#7c3aed';
                        }}
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="col-span-full text-center py-8 sm:py-12 md:py-16 px-4">
                <div className="text-5xl sm:text-6xl md:text-8xl mb-4 sm:mb-6 animate-bounce-gentle">🗺️</div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 drop-shadow-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>No places found</h3>
                <p className="text-slate-200 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base md:text-lg font-medium" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {places.length === 0 
                    ? "Try selecting a mood to get personalized recommendations! 🎨"
                    : "No places found. Try a different mood or location."}
                </p>
                {places.length === 0 && (
                  <button 
                    onClick={() => navigate('/onboarding')}
                    className="px-6 sm:px-8 py-3 sm:py-4 text-white font-medium text-base sm:text-lg rounded-md transition-colors"
                    style={{ backgroundColor: '#7c3aed', fontFamily: "'Inter', sans-serif", border: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'} 
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
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
          <div
            className="doodle-card max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden bg-white shadow-2xl"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            <div className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-5 sm:pb-3 md:px-8 md:pt-6 md:pb-4 border-b border-slate-100">
              <div className="flex justify-between items-start gap-2">
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
                    <span className="text-white px-2 sm:px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#7c3aed' }}>
                      {selectedPlace.type}
                    </span>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="ml-1 font-semibold text-gray-900">{selectedPlace.distanceLabel || 'Nearby'}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="text-gray-400 hover:text-gray-600 text-2xl sm:text-3xl font-bold transition-colors flex-shrink-0 leading-none"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-4 py-4 sm:px-6 md:px-8 sm:py-5">
              {/* Description */}
              {selectedPlace.description && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">About</h3>
                  <p className="text-gray-900 text-sm sm:text-base leading-relaxed">{selectedPlace.description}</p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                {selectedPlace.cuisine ? (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 sm:col-span-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      🍽 Cuisine
                    </h3>
                    <p className="text-gray-900 text-sm sm:text-base">{selectedPlace.cuisine}</p>
                  </div>
                ) : null}

                {selectedPlace.hours && (
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                      🕒 Hours
                    </h3>
                    <p className="text-gray-900 text-sm sm:text-base whitespace-pre-wrap break-words">{selectedPlace.hours}</p>
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
                      style={{ color: '#7c3aed' }} 
                      onMouseEnter={(e) => e.currentTarget.style.color = '#6d28d9'} 
                      onMouseLeave={(e) => e.currentTarget.style.color = '#7c3aed'}
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
                      className="underline text-sm sm:text-base break-all" style={{ color: '#7c3aed' }} onMouseEnter={(e) => e.currentTarget.style.color = '#6d28d9'} onMouseLeave={(e) => e.currentTarget.style.color = '#7c3aed'}
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
                        className="text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium" style={{ backgroundColor: '#7c3aed' }}
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseDetails}
                  className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors duration-200 font-semibold text-sm sm:text-base"
                  style={{ border: 'none' }}
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
}
