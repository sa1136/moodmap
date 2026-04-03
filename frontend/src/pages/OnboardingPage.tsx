import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/OnboardingPage.css';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    city: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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
    setErrorMessage('');

    try {
      localStorage.setItem('userCity', formData.city);
      localStorage.setItem('userName', formData.name);

      navigate('/mood');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setErrorMessage('Error saving preferences. Please try again.');
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
                  color: '#7c3aed'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e5e7eb',
                    borderTop: '2px solid #7c3aed',
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
                  backgroundColor: '#1e293b',
                  border: '3px solid #1a1a1a',
                  borderRadius: '10px',
                  boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.3)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  marginTop: '4px'
                }}>
                  {locationSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleLocationSelect(suggestion)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: index < locationSuggestions.length - 1 ? '1px solid #334155' : 'none',
                        transition: 'background-color 0.2s',
                        backgroundColor: selectedSuggestionIndex === index ? '#334155' : '#1e293b',
                        minHeight: '44px'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSuggestionIndex !== index) {
                          e.currentTarget.style.backgroundColor = '#334155';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSuggestionIndex !== index) {
                          e.currentTarget.style.backgroundColor = '#1e293b';
                        }
                      }}
                    >
                      <div style={{ fontWeight: '600', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '4px', fontSize: '14px' }}>
                        {suggestion.city}
                      </div>
                      <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
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
          </div>

          {errorMessage && (
            <div style={{
              color: '#b91c1c',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '12px',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif"
            }}>
              {errorMessage}
            </div>
          )}

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
