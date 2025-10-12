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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">MoodMap</h1>
            <nav className="flex space-x-4">
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                New Mood
              </button>
              <button className="text-gray-600 hover:text-gray-800 font-medium">
                Preferences
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Recommended Places</h2>
          <p className="text-gray-600">Based on your current mood and preferences</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.length > 0 ? (
              places.map((place) => (
                <div key={place.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{place.name}</h3>
                  <p className="text-gray-600 mb-2">{place.type}</p>
                  <div className="flex items-center mb-3">
                    <span className="text-yellow-400">⭐</span>
                    <span className="ml-1 text-sm text-gray-700">{place.rating}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                      Save
                    </button>
                    <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors">
                      Details
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No places found</h3>
                <p className="text-gray-500">Try selecting a mood to get personalized recommendations!</p>
              </div>
            )}
          </div>
        )}

        {/* Demo Tailwind Section */}
        <div className="mt-12 bg-blue-500 text-white p-6 rounded-lg">
          <h3 className="text-xl font-bold mb-2">🎉 Tailwind CSS is working perfectly!</h3>
          <p>Your onboarding and mood input pages are ready to use.</p>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
