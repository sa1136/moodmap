import { useEffect, useState } from "react";
import axios from "axios";

const DashboardPage: React.FC = () => {
  const [places, setPlaces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get("http://localhost:5001/api/places")
      .then(res => {
        setPlaces(res.data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-display font-bold text-gradient">MoodMap</h1>
            <nav className="flex space-x-4">
              <button className="btn-primary">
                New Mood
              </button>
              <button className="text-neutral-600 hover:text-neutral-800 font-medium transition-colors duration-200">
                Preferences
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-display font-bold text-neutral-800 mb-2">Recommended Places</h2>
          <p className="text-neutral-600 text-lg">Based on your current mood and preferences</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.length > 0 ? (
              places.map((place) => (
                <div key={place.id} className="card hover:scale-105 transition-transform duration-300">
                  <h3 className="text-xl font-semibold text-neutral-800 mb-2">{place.name}</h3>
                  <p className="text-neutral-600 mb-3">{place.type}</p>
                  <div className="flex items-center mb-4">
                    <span className="text-yellow-400 text-lg">⭐</span>
                    <span className="ml-2 text-sm font-medium text-neutral-700">{place.rating}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="btn-primary flex-1">
                      Save
                    </button>
                    <button className="border border-neutral-300 text-neutral-700 px-4 py-2 rounded-lg hover:bg-neutral-50 transition-colors duration-200 flex-1">
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
                <button className="btn-primary">
                  Start Exploring
                </button>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default DashboardPage;
