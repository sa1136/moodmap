import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MoodInputPage.css';

const MoodInputPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [customMood, setCustomMood] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const moodOptions = [
    {
      id: 'relaxed',
      label: 'Relaxed',
      emoji: '😌',
      description: 'Looking for peaceful, calm places',
      color: 'mood-relaxed'
    },
    {
      id: 'energetic',
      label: 'Energetic',
      emoji: '⚡',
      description: 'Want to be active and lively',
      color: 'mood-energetic'
    },
    {
      id: 'adventurous',
      label: 'Adventurous',
      emoji: '🏔️',
      description: 'Ready for new experiences',
      color: 'mood-adventurous'
    },
    {
      id: 'social',
      label: 'Social',
      emoji: '👥',
      description: 'Want to connect with people',
      color: 'mood-social'
    },
    {
      id: 'creative',
      label: 'Creative',
      emoji: '🎨',
      description: 'Feeling inspired and artistic',
      color: 'mood-creative'
    },
    {
      id: 'focused',
      label: 'Focused',
      emoji: '🎯',
      description: 'Need to concentrate or work',
      color: 'mood-focused'
    }
  ];

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId);
    setCustomMood(''); // Clear custom mood when selecting preset
  };

  const handleCustomMoodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomMood(e.target.value);
    if (e.target.value) {
      setSelectedMood(''); // Clear preset when typing custom
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood && !customMood.trim()) {
      alert('Please select a mood or enter your own!');
      return;
    }

    setIsSubmitting(true);

    try {
      const moodData = {
        mood: selectedMood || customMood.trim(),
        isCustom: !selectedMood,
        timestamp: new Date().toISOString()
      };

      await axios.post('http://localhost:5001/api/mood', moodData);
      
      // Save mood to localStorage for dashboard to use
      const moodLabel = selectedMood ? moodOptions.find(m => m.id === selectedMood)?.label : customMood;
      localStorage.setItem('currentMood', moodLabel || '');
      
      alert('Mood recorded! Let\'s find some great places for you.');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving mood:', error);
      alert('Error saving mood. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mood-container">
      <div className="mood-form-card">
        <div className="mood-header">
          <h1 className="mood-title">How are you feeling?</h1>
          <p className="mood-subtitle">This helps us recommend the perfect places for you</p>
          <div className="mood-emoji-container">
            <span className="mood-emoji">💭</span>
          </div>
        </div>

        <div className="mood-content">
          {/* Preset Mood Options */}
          <div className="mood-section">
            <h2 className="mood-section-title">Choose your mood:</h2>
            <div className="mood-grid">
              {moodOptions.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
                >
                  <div className="mood-card-content">
                    <div className={`mood-card-emoji ${selectedMood === mood.id ? 'bouncing' : ''}`}>{mood.emoji}</div>
                    <div className="mood-card-label">{mood.label}</div>
                    <div className="mood-card-description">{mood.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mood-divider">
            <div className="mood-divider-line"></div>
            <div className="mood-divider-text">
              <span>or</span>
            </div>
          </div>

          {/* Custom Mood Input */}
          <div className="mood-custom-section">
            <label htmlFor="customMood" className="mood-custom-label">
              Describe your mood in your own words:
            </label>
            <input
              type="text"
              id="customMood"
              value={customMood}
              onChange={handleCustomMoodChange}
              placeholder="e.g., nostalgic, excited, contemplative..."
              className="mood-custom-input"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedMood && !customMood.trim())}
            className="mood-button"
          >
            {isSubmitting ? 'Finding places...' : 'Find My Perfect Places!'}
          </button>
        </div>

        {/* Current Selection Display */}
        {(selectedMood || customMood) && (
          <div className="mood-selection-display">
            <p className="mood-selection-text">
              Selected mood: <span className="mood-selection-value">
                {selectedMood
                  ? moodOptions.find(m => m.id === selectedMood)?.label
                  : customMood
                }
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodInputPage;
