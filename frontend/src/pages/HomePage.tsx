import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('homepage-route');
    return () => document.body.classList.remove('homepage-route');
  }, []);

  const handleGetStarted = () => {
    navigate('/onboarding');
  };

  return (
    <div className="homepage-container">
      <div className="homepage-shell">
        <div className="homepage-content">
          {/* Main Logo/Title */}
          <div className="homepage-header">
            <h1 className="homepage-title">MoodMap</h1>
            <p className="homepage-subtitle">Discover places that match your mood</p>
          </div>

          <button
            type="button"
            onClick={handleGetStarted}
            className="homepage-button"
          >
            Get Started
          </button>

          <p className="homepage-footer">
            Let&apos;s find the perfect places for your current mood
          </p>
        </div>
      </div>
    </div>
  );
}
