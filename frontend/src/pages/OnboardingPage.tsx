import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/OnboardingPage.css';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
    preferences: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const preferenceOptions = [
    'Cafes & Coffee',
    'Restaurants',
    'Parks & Nature',
    'Gyms & Fitness',
    'Museums & Culture',
    'Shopping',
    'Entertainment',
    'Nightlife',
    'Outdoor Activities',
    'Beaches & Water'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // If it's the city input, search for suggestions
    if (name === 'city' && value.length > 2) {
      searchLocationSuggestions(value);
    } else if (name === 'city' && value.length <= 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Debounced search for location suggestions
  const searchLocationSuggestions = async (query: string) => {
    if (query.length < 3) return;
    
    setIsLoadingSuggestions(true);
    try {
      // Use Nominatim API for autocomplete (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&extratags=1`
      );
      const data = await response.json();
      
      const suggestions = data.map((item: any) => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality,
        country: item.address?.country,
        state: item.address?.state
      })).filter((item: any) => item.city); // Only include results with city names
      
      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleLocationSelect = (suggestion: any) => {
    const cityName = suggestion.city + (suggestion.country ? `, ${suggestion.country}` : '');
    setFormData(prev => ({
      ...prev,
      city: cityName
    }));
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Save coordinates for more accurate place search
    localStorage.setItem('userLat', suggestion.lat.toString());
    localStorage.setItem('userLng', suggestion.lon.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || locationSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < locationSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : locationSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleLocationSelect(locationSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const handlePreferenceToggle = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter(p => p !== preference)
        : [...prev.preferences, preference]
    }));
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get city name
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const data = await response.json();
          
          const cityName = data.city || data.locality || data.principalSubdivision || 'Current Location';
          
          setFormData(prev => ({
            ...prev,
            city: cityName
          }));
          
          // Also save coordinates for more accurate place search
          localStorage.setItem('userLat', latitude.toString());
          localStorage.setItem('userLng', longitude.toString());
          
          alert(`Location detected: ${cityName}`);
        } catch (error) {
          console.error('Error getting location name:', error);
          setFormData(prev => ({
            ...prev,
            city: 'Current Location'
          }));
          localStorage.setItem('userLat', latitude.toString());
          localStorage.setItem('userLng', longitude.toString());
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Unable to get your location. Please enter your city manually.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post('http://localhost:5001/api/user', formData);
      
      // Save city to localStorage for dashboard to use
      localStorage.setItem('userCity', formData.city);
      
      alert('Preferences saved successfully!');
      navigate('/mood');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Error saving preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-form-card">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Welcome to MoodMap</h1>
          <p className="onboarding-subtitle">Let's get to know you better!</p>
          <div className="onboarding-map-container">
            <span className="onboarding-map">🗺️</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* Name Input */}
          <div className="onboarding-field">
            <label htmlFor="name" className="onboarding-label">
              What's your name?
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="onboarding-input"
              placeholder="Enter your name"
            />
          </div>

          {/* City Input */}
          <div className="onboarding-field">
            <label htmlFor="city" className="onboarding-label">
              What city are you in?
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '0' }}>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (locationSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow clicking on them
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    required
                    className="onboarding-input"
                    placeholder="Type your city name..."
                    style={{ width: '100%' }}
                    autoComplete="off"
                  />
                  
                  {/* Loading indicator */}
                  {isLoadingSuggestions && (
                    <div style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#3b82f6'
                    }}>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #e5e7eb',
                        borderTop: '2px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                    </div>
                  )}
                  
                  {/* Autocomplete dropdown */}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 1000,
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => handleLocationSelect(suggestion)}
                          style={{
                            padding: '12px 16px',
                            cursor: 'pointer',
                            borderBottom: index < locationSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                            transition: 'background-color 0.2s',
                            backgroundColor: selectedSuggestionIndex === index ? '#dbeafe' : 'white'
                          }}
                          onMouseEnter={(e) => {
                            if (selectedSuggestionIndex !== index) {
                              e.currentTarget.style.backgroundColor = '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSuggestionIndex !== index) {
                              e.currentTarget.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <div style={{ fontWeight: '500', color: '#1f2937' }}>
                            {suggestion.city}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {suggestion.state && `${suggestion.state}, `}{suggestion.country}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    minWidth: 'auto',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
                    e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }}
                >
                  📍 Current
                </button>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="onboarding-preferences">
            <label className="onboarding-preferences-label">
              What activities do you enjoy? (Select all that apply)
            </label>
            <div className="onboarding-preferences-grid">
              {preferenceOptions.map((preference) => (
                <label key={preference} className="onboarding-preference-item">
                  <input
                    type="checkbox"
                    checked={formData.preferences.includes(preference)}
                    onChange={() => handlePreferenceToggle(preference)}
                    className="onboarding-checkbox"
                  />
                  <span className="onboarding-preference-text">{preference}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.name || !formData.city}
            className="onboarding-button"
          >
            {isSubmitting ? 'Saving...' : 'Continue to Mood Selection'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;
