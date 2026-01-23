import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  return (
    <div className="homepage-container">
      {/* Doodle decorations - hidden on mobile */}
      <div className="hidden sm:block absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-20 left-10 text-5xl sm:text-6xl md:text-7xl opacity-20 transform rotate-12 animate-float" style={{ fontFamily: "'Caveat', cursive" }}>✨</div>
        <div className="absolute top-40 right-20 text-4xl sm:text-5xl md:text-6xl opacity-20 transform -rotate-12 animate-bounce-gentle" style={{ fontFamily: "'Caveat', cursive" }}>🎨</div>
        <div className="absolute bottom-40 left-20 text-3xl sm:text-4xl md:text-5xl opacity-20 transform rotate-6 animate-pulse-doodle" style={{ fontFamily: "'Caveat', cursive" }}>🌟</div>
        <div className="absolute bottom-20 right-10 text-4xl sm:text-5xl md:text-6xl opacity-20 transform -rotate-6 animate-float" style={{ fontFamily: "'Caveat', cursive" }}>💫</div>
        <div className="absolute top-1/2 left-1/4 text-3xl sm:text-4xl opacity-15 transform rotate-45 animate-wiggle" style={{ fontFamily: "'Caveat', cursive" }}>🎯</div>
        <div className="absolute top-1/3 right-1/4 text-4xl sm:text-5xl opacity-15 transform -rotate-45 animate-bounce-gentle" style={{ fontFamily: "'Caveat', cursive" }}>🚀</div>
      </div>

      <div className="homepage-content">
        {/* Main Logo/Title */}
        <div className="homepage-header">
          <h1 className="homepage-title">MoodMap</h1>
          <p className="homepage-subtitle">Discover places that match your mood 🎉</p>
          <div className="homepage-map-container">
            <span className="homepage-map">🗺️</span>
          </div>
        </div>

        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className="homepage-button"
        >
          🚀 Get Started
        </button>

        {/* Subtitle */}
        <p className="homepage-footer">
          Let's find the perfect places for your current mood! 🎨✨
        </p>
      </div>
    </div>
  );
};

export default HomePage;
