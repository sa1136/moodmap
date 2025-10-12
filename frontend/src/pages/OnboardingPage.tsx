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
  };

  const handlePreferenceToggle = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(preference)
        ? prev.preferences.filter(p => p !== preference)
        : [...prev.preferences, preference]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await axios.post('http://localhost:5001/api/user', formData);
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
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              className="onboarding-input"
              placeholder="Enter your city"
            />
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
