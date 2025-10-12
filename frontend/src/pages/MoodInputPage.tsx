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
      description: 'Looking for peaceful, calm places'
    },
    {
      id: 'energetic',
      label: 'Energetic',
      emoji: '⚡',
      description: 'Want to be active and lively'
    },
    {
      id: 'adventurous',
      label: 'Adventurous',
      emoji: '🏔️',
      description: 'Ready for new experiences'
    },
    {
      id: 'social',
      label: 'Social',
      emoji: '👥',
      description: 'Want to connect with people'
    },
    {
      id: 'creative',
      label: 'Creative',
      emoji: '🎨',
      description: 'Feeling inspired and artistic'
    },
    {
      id: 'focused',
      label: 'Focused',
      emoji: '🎯',
      description: 'Need to concentrate or work'
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How are you feeling?</h1>
          <p className="text-gray-600">This helps us recommend the perfect places for you</p>
        </div>

        <div className="space-y-6">
          {/* Preset Mood Options */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Choose your mood:</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {moodOptions.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => handleMoodSelect(mood.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedMood === mood.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{mood.emoji}</div>
                    <div className="font-semibold text-gray-800 mb-1">{mood.label}</div>
                    <div className="text-sm text-gray-600">{mood.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Custom Mood Input */}
          <div>
            <label htmlFor="customMood" className="block text-lg font-semibold text-gray-800 mb-2">
              Describe your mood in your own words:
            </label>
            <input
              type="text"
              id="customMood"
              value={customMood}
              onChange={handleCustomMoodChange}
              placeholder="e.g., nostalgic, excited, contemplative..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!selectedMood && !customMood.trim())}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 text-lg font-semibold"
          >
            {isSubmitting ? 'Finding places...' : 'Find My Perfect Places!'}
          </button>
        </div>

        {/* Current Selection Display */}
        {(selectedMood || customMood) && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-blue-800 font-medium">
              Selected mood: <span className="font-semibold">
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
