import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/MoodInputPage.css';

export default function MoodInputPage() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [customMood, setCustomMood] = useState<string>('');
  const [preferences, setPreferences] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('userPreferences');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
    'Beaches & Water',
  ];

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
      setSelectedMood('');
    }
  };

  const togglePreference = (p: string) => {
    setPreferences((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async () => {
    if (!selectedMood && !customMood.trim()) {
      setErrorMessage('Please select a mood or enter your own!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const moodData = {
        mood: selectedMood || customMood.trim(),
        isCustom: !selectedMood,
        timestamp: new Date().toISOString()
      };

      await axios.post('http://localhost:5001/api/mood', moodData);

      const moodLabel = selectedMood ? moodOptions.find(m => m.id === selectedMood)?.label : customMood;
      localStorage.setItem('currentMood', moodLabel || '');

      // Save preferences (place types) after mood selection.
      const name = (localStorage.getItem('userName') || '').trim() || 'Guest';
      const city = (localStorage.getItem('userCity') || '').trim();
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      if (city) {
        await axios.post('http://localhost:5001/api/user', {
          name,
          city,
          preferences,
        });
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving mood:', error);
      setErrorMessage('Error saving mood. Please try again.');
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

          <div className="mood-divider">
            <div className="mood-divider-line"></div>
            <div className="mood-divider-text">
              <span>then</span>
            </div>
          </div>

          <div className="mood-custom-section">
            <label className="mood-custom-label">
              What kinds of places should we prioritize? (Optional)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', marginTop: '10px' }}>
              {preferenceOptions.map((p) => (
                <label
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'white',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={preferences.includes(p)}
                    onChange={() => togglePreference(p)}
                  />
                  <span style={{ color: '#1e293b' }}>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mood-divider">
            <div className="mood-divider-line"></div>
            <div className="mood-divider-text">
              <span>or</span>
            </div>
          </div>

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

          {errorMessage && (
            <div className="mood-error" style={{
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

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedMood && !customMood.trim())}
            className="mood-button"
          >
            {isSubmitting ? 'Finding places...' : 'Find My Perfect Places!'}
          </button>
        </div>

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
}
