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
        {/* Desktop: left column — mobile: hidden (same hero copy stays centered in .homepage-content) */}
        <aside className="homepage-aside">
          <p className="homepage-aside-kicker">Personalized discovery</p>
          <h2 className="homepage-aside-headline">
            Places that fit how you feel.
          </h2>
          <ul className="homepage-aside-list">
            <li>Mood-aware picks near you</li>
            <li>Works on phone or desktop</li>
            <li>Quick setup, then explore</li>
          </ul>
        </aside>

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
