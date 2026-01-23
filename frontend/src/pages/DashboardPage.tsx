import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [aiPowered, setAiPowered] = useState<boolean>(false);

  useEffect(() => {
    const savedMood = localStorage.getItem('currentMood');
    const userCity = localStorage.getItem('userCity');
    const userLat = localStorage.getItem('userLat');
    const userLng = localStorage.getItem('userLng');
    
    const params = new URLSearchParams();
    if (savedMood) params.append('mood', savedMood);
    if (userCity) params.append('city', userCity);
    if (userLat && userLng) {
      params.append('lat', userLat);
      params.append('lng', userLng);
    }
    
    const apiUrl = `http://localhost:5001/api/places${params.toString() ? `?${params.toString()}` : ''}`;
    
    console.log('[Dashboard] Fetching places from:', apiUrl);
    axios.get(apiUrl)
      .then(res => {
        console.log('[Dashboard] Received response:', res.data);
        if (res.data.places && Array.isArray(res.data.places)) {
          console.log(`[Dashboard] Found ${res.data.places.length} places in response`);
          setPlaces(res.data.places);
          setExplanation(res.data.explanation || '');
          setAiPowered(res.data.aiPowered || false);
        } else if (Array.isArray(res.data)) {
          console.log(`[Dashboard] Legacy format - Found ${res.data.length} places`);
          setPlaces(res.data);
          setExplanation('');
          setAiPowered(false);
        } else {
          console.warn('[Dashboard] Unexpected response format:', res.data);
          setPlaces([]);
          setExplanation('');
          setAiPowered(false);
        }
        setIsLoading(false);
      })
      .catch(err => {
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
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-display font-bold text-gradient">MoodMap</h1>
            <nav className="flex space-x-4">
              <button 
                onClick={() => navigate('/mood')}
                className="btn-primary"
              >
                New Mood
              </button>
              <button className="text-neutral-600 hover:text-neutral-800 font-medium transition-colors duration-200">
                Preferences
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-display font-bold text-neutral-800">Recommended Places</h2>
            {aiPowered && (
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                ✨ AI-Powered
              </span>
            )}
          </div>
          <p className="text-neutral-600 text-lg mb-3">Based on your current mood and preferences</p>
          {explanation && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
              <p className="text-blue-800 text-sm leading-relaxed">
                <span className="font-semibold">💡 Why these places?</span> {explanation}
              </p>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places && places.length > 0 ? (
              places.map((place) => (
                <div key={place.id} className="card hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-semibold text-neutral-800 mb-1">{place.name}</h3>
                  <p className="text-sm text-neutral-500 mb-2">📍 {place.city}</p>
                  <p className="text-neutral-600 mb-3">{place.type}</p>
                  <div className="flex items-center mb-4">
                    <span className="text-yellow-400 text-lg">⭐</span>
                    <span className="ml-2 text-sm font-medium text-neutral-700">{place.rating}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn-primary flex-1">
                      Save
                    </button>
                    <button 
                      onClick={() => handleShowDetails(place)}
                      className="border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors duration-200 flex-1"
                    >
                      Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-neutral-400 mb-6 floating">
                  <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-neutral-800 mb-2">No places found</h3>
                <p className="text-neutral-600 mb-6">Try selecting a mood to get personalized recommendations!</p>
                <button 
                  onClick={() => navigate('/mood')}
                  className="btn-primary"
                >
                  Start Exploring
                </button>
              </div>
            )}
          </div>
        )}

      </main>

      {showDetails && selectedPlace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-800 mb-1">{selectedPlace.name}</h2>
                  <p className="text-sm text-neutral-500 mb-2">📍 {selectedPlace.city}</p>
                  <p className="text-neutral-600 mb-3">{selectedPlace.type}</p>
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-lg">⭐</span>
                    <span className="ml-2 text-sm font-medium text-neutral-700">{selectedPlace.rating}</span>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetails}
                  className="text-neutral-400 hover:text-neutral-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {selectedPlace.photos && selectedPlace.photos.length > 0 && (
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedPlace.photos.map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${selectedPlace.name} photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedPlace.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">About</h3>
                  <p className="text-neutral-600 leading-relaxed">{selectedPlace.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {selectedPlace.hours && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">🕒 Hours</h3>
                    <p className="text-neutral-600">{selectedPlace.hours}</p>
                  </div>
                )}

                {selectedPlace.price && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">💰 Price Range</h3>
                    <p className="text-neutral-600">{selectedPlace.price}</p>
                  </div>
                )}

                {selectedPlace.phone && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">📞 Phone</h3>
                    <p className="text-neutral-600">{selectedPlace.phone}</p>
                  </div>
                )}

                {selectedPlace.website && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-800 mb-2">🌐 Website</h3>
                    <a 
                      href={`https://${selectedPlace.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {selectedPlace.website}
                    </a>
                  </div>
                )}
              </div>

              {selectedPlace.address && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">📍 Address</h3>
                  <p className="text-neutral-600">{selectedPlace.address}</p>
                </div>
              )}

              {selectedPlace.amenities && selectedPlace.amenities.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-neutral-800 mb-3">✨ Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.amenities.map((amenity: string, index: number) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4 border-t border-neutral-200">
                <button className="btn-primary flex-1">
                  Save Place
                </button>
                <button 
                  onClick={handleCloseDetails}
                  className="border border-neutral-300 text-neutral-700 px-6 py-2 rounded-lg hover:bg-neutral-50 transition-colors duration-200 flex-1"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
