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
      <div className="homepage-content">
        {/* Main Logo/Title */}
        <div className="homepage-header">
          <h1 className="homepage-title">MoodMap</h1>
          <p className="homepage-subtitle">Discover places that match your mood</p>
          <div className="homepage-map-container">
            <span className="homepage-map">🗺️</span>
          </div>
        </div>

        {/* Get Started Button */}
        <button
          onClick={handleGetStarted}
          className="homepage-button"
        >
          Get Started
        </button>

        {/* Subtitle */}
        <p className="homepage-footer">
          Let's find the perfect places for your current mood
        </p>
      </div>
    </div>
  );
};

export default HomePage;
