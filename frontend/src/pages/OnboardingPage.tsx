import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto form-card">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Welcome to MoodMap</h1>
          <p className="text-blue-100 text-lg">Let's get to know you better!</p>
          <div className="mt-4 floating">
            <span className="text-4xl">🗺️</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-blue-100 mb-2">
              What's your name?
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="Enter your name"
            />
          </div>

          {/* City Input */}
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-blue-100 mb-2">
              What city are you in?
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              required
              className="form-input"
              placeholder="Enter your city"
            />
          </div>

          {/* Preferences */}
          <div>
            <label className="block text-sm font-semibold text-blue-100 mb-3">
              What activities do you enjoy? (Select all that apply)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {preferenceOptions.map((preference) => (
                <label key={preference} className="flex items-center p-2 rounded-lg hover:bg-blue-800/30 transition-colors duration-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.preferences.includes(preference)}
                    onChange={() => handlePreferenceToggle(preference)}
                    className="h-4 w-4 text-blue-400 focus:ring-blue-300 border-blue-300 rounded"
                  />
                  <span className="ml-3 text-sm font-medium text-blue-100">{preference}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.name || !formData.city}
            className="btn-primary w-full py-3 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Continue to Mood Selection'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OnboardingPage;
