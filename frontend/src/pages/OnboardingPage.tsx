import React, { useState, useEffect } from 'react';
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
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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

    if (name === 'city') {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }

      if (value.length > 2) {
        const timeout = setTimeout(() => {
          searchLocationSuggestions(value);
        }, 300);
        setSearchTimeout(timeout);
      } else {
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const searchLocationSuggestions = async (query: string) => {
    if (query.length < 2) return;
    
    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get('http://localhost:5001/api/locations/search', {
        params: {
          q: query
        }
      });
      
      const data = response.data;
      
      const suggestions = data
        .map((item: any) => {
          const address = item.address || {};
          
          const cityName = 
            address.city || 
            address.town || 
            address.village || 
            address.municipality ||
            address.county ||
            address.state_district ||
            (item.display_name?.split(',')[0]?.trim());
          
          const locationParts = [];
          if (cityName) locationParts.push(cityName);
          if (address.state) locationParts.push(address.state);
          if (address.country) locationParts.push(address.country);
          
          return {
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            city: cityName,
            fullLocation: locationParts.join(', '),
            country: address.country,
            state: address.state,
            type: item.type || item.class,
            importance: item.importance || 0
          };
        })
        .filter((item: any) => item.city && item.city.trim().length > 0)
        .sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 5);
      
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleLocationSelect = (suggestion: any) => {
    const cityName = suggestion.fullLocation || 
      (suggestion.city + (suggestion.state ? `, ${suggestion.state}` : '') + (suggestion.country ? `, ${suggestion.country}` : ''));
    
    setFormData(prev => ({
      ...prev,
      city: cityName
    }));
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    localStorage.setItem('userLat', suggestion.lat.toString());
    localStorage.setItem('userLng', suggestion.lon.toString());
    localStorage.setItem('userCity', cityName);
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
      alert('Geolocation is not supported by this browser. Please enter your city manually.');
      return;
    }

    setIsGettingLocation(true);

    // Configure geolocation options
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds timeout
      maximumAge: 300000 // Accept cached position if less than 5 minutes old
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          let cityName = 'Current Location';
          let reverseGeocodeSuccess = false;

          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
              { 
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              }
            );
            
            if (response.ok) {
              const data = await response.json();
              cityName = data.city || data.locality || data.principalSubdivision || data.countryName || 'Current Location';
              if (cityName !== 'Current Location') {
                reverseGeocodeSuccess = true;
              }
            }
          } catch (error) {
          }

          if (!reverseGeocodeSuccess) {
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                {
                  headers: {
                    'User-Agent': 'MoodMap/1.0'
                  }
                }
              );
              
              if (response.ok) {
                const data = await response.json();
                const address = data.address || {};
                cityName = address.city || address.town || address.village || address.municipality || address.county || 'Current Location';
                if (cityName !== 'Current Location') {
                  reverseGeocodeSuccess = true;
                }
              }
            } catch (error) {
            }
          }

          if (!reverseGeocodeSuccess) {
            cityName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
          
          setFormData(prev => ({
            ...prev,
            city: cityName
          }));
          
          localStorage.setItem('userLat', latitude.toString());
          localStorage.setItem('userLng', longitude.toString());
          localStorage.setItem('userCity', cityName);
          
          setIsGettingLocation(false);
          
          if (reverseGeocodeSuccess) {
            alert(`Location detected: ${cityName}`);
          } else {
            alert(`Location coordinates saved. Please enter your city name manually for better results.`);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          setFormData(prev => ({
            ...prev,
            city: 'Current Location'
          }));
          localStorage.setItem('userLat', latitude.toString());
          localStorage.setItem('userLng', longitude.toString());
          setIsGettingLocation(false);
          alert('Got your coordinates but couldn\'t determine city name. Please enter your city manually.');
        }
      },
      (error) => {
        setIsGettingLocation(false);
        console.error('Geolocation error:', error);
        
        let errorMessage = 'Unable to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Location access was denied. Please enable location permissions in your browser settings or enter your city manually.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable. Please enter your city manually.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or enter your city manually.';
            break;
          default:
            errorMessage += 'An unknown error occurred. Please enter your city manually.';
            break;
        }
        
        alert(errorMessage);
      },
      geoOptions
    );
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post('http://localhost:5001/api/user', formData);
      
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
                          <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>
                            {suggestion.city}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            {suggestion.fullLocation || 
                              (suggestion.state && suggestion.country 
                                ? `${suggestion.state}, ${suggestion.country}`
                                : suggestion.country || suggestion.state || '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    background: isGettingLocation 
                      ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                      : 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isGettingLocation ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    minWidth: 'auto',
                    flexShrink: 0,
                    opacity: isGettingLocation ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isGettingLocation) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGettingLocation) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
                      e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  {isGettingLocation ? (
                    <>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}></div>
                      <span>Locating...</span>
                    </>
                  ) : (
                    <span>📍 Current</span>
                  )}
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
