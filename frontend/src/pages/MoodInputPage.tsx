import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto form-card">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2">How are you feeling?</h1>
          <p className="text-blue-100 text-lg">This helps us recommend the perfect places for you</p>
          <div className="mt-4 floating">
            <span className="text-4xl">💭</span>
          </div>
        </div>

        <div className="space-y-6">
          {/* Preset Mood Options */}
          <div>
            <h2 className="text-xl font-semibold text-blue-100 mb-6">Choose your mood:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {moodOptions.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={`mood-card transition-all duration-300 ${
                    selectedMood === mood.id
                      ? `border-2 bg-${mood.color}-50 border-${mood.color}-500 shadow-lg`
                      : 'border-2 border-blue-300 hover:border-blue-200 bg-blue-900/30'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-4xl mb-3 ${selectedMood === mood.id ? 'bounce-gentle' : ''}`}>{mood.emoji}</div>
                    <div className="font-semibold text-blue-100 mb-2 text-lg">{mood.label}</div>
                    <div className="text-sm text-blue-200">{mood.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-blue-300/50" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-blue-900 text-blue-200 font-medium">or</span>
                </div>
              </div>

          {/* Custom Mood Input */}
          <div>
            <label htmlFor="customMood" className="block text-xl font-semibold text-blue-100 mb-3">
              Describe your mood in your own words:
            </label>
            <input
              type="text"
              id="customMood"
              value={customMood}
              onChange={handleCustomMoodChange}
              placeholder="e.g., nostalgic, excited, contemplative..."
              className="form-input text-lg"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedMood && !customMood.trim())}
            className="btn-primary w-full py-4 text-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Finding places...' : 'Find My Perfect Places!'}
          </button>
        </div>

            {/* Current Selection Display */}
            {(selectedMood || customMood) && (
              <div className="mt-6 p-4 bg-blue-800/30 rounded-lg border border-blue-300/30">
                <p className="text-blue-100 font-medium">
                  Selected mood: <span className="font-semibold text-white">
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
