import React from 'react';

interface MoodIndicatorProps {
  mood: string;
  size?: 'sm' | 'md' | 'lg';
}

const moodConfig: Record<string, { emoji: string; color: string; bgColor: string }> = {
  relaxed: { emoji: '😌', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  energetic: { emoji: '⚡', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  adventurous: { emoji: '🏔️', color: 'text-green-600', bgColor: 'bg-green-100' },
  social: { emoji: '👥', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  creative: { emoji: '🎨', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  happy: { emoji: '😊', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  excited: { emoji: '🎉', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  peaceful: { emoji: '🧘', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  curious: { emoji: '🔍', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  romantic: { emoji: '💕', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const MoodIndicator: React.FC<MoodIndicatorProps> = ({ mood, size = 'md' }) => {
  const moodLower = mood?.toLowerCase() || '';
  const config = moodConfig[moodLower] || { emoji: '😊', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  
  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2'
  };

  const bgColorMap: Record<string, string> = {
    'bg-blue-100': 'rgba(219, 234, 254, 0.9)',
    'bg-yellow-100': 'rgba(254, 243, 199, 0.9)',
    'bg-green-100': 'rgba(209, 250, 229, 0.9)',
    'bg-purple-100': 'rgba(243, 232, 255, 0.9)',
    'bg-indigo-100': 'rgba(224, 231, 255, 0.9)',
    'bg-teal-100': 'rgba(204, 251, 241, 0.9)',
    'bg-red-100': 'rgba(254, 226, 226, 0.9)',
    'bg-orange-100': 'rgba(255, 237, 213, 0.9)',
    'bg-gray-100': 'rgba(243, 244, 246, 0.9)',
  };

  return (
    <div 
      className={`inline-flex items-center space-x-2 ${sizeClasses[size]}`}
      style={{
        borderRadius: '20px',
        border: '2px solid #e2e8f0',
        fontFamily: "'Inter', sans-serif",
        backgroundColor: bgColorMap[config.bgColor] || 'rgba(243, 244, 246, 0.9)'
      }}
    >
      <span className="text-xl">{config.emoji}</span>
      <span className={`font-semibold ${config.color} capitalize`} style={{ fontFamily: "'Poppins', sans-serif" }}>{mood}</span>
    </div>
  );
};

export default MoodIndicator;
