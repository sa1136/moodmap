import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import onboardingWorldMap from '../assets/onboarding-world-map.png';
import '../styles/OnboardingPage.css';

type Step = 'location' | 'mood' | 'preferences' | 'done';

const MOOD_OPTIONS = [
  { id: 'relaxed', label: 'Relaxed', emoji: '😌', description: 'Peaceful, calm places' },
  { id: 'energetic', label: 'Energetic', emoji: '⚡', description: 'Active and lively' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🏔️', description: 'New experiences' },
  { id: 'social', label: 'Social', emoji: '👥', description: 'Connect with people' },
  { id: 'creative', label: 'Creative', emoji: '🎨', description: 'Inspired, artistic' },
  { id: 'focused', label: 'Focused', emoji: '🎯', description: 'Concentrate or work' },
] as const;

const PLACE_TYPE_OPTIONS = [
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
] as const;

const STEPS: Step[] = ['location', 'mood', 'preferences', 'done'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('location');

  const [city, setCity] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [customMood, setCustomMood] = useState('');
  const [preferences, setPreferences] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  /** True only when lat/lng came from picking a search suggestion */
  const [pickedCoords, setPickedCoords] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const searchLocationSuggestions = async (query: string) => {
    if (query.length < 2) return;
    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get('http://localhost:5001/api/locations/search', {
        params: { q: query },
      });
      const data = response.data;
      const suggestions = data
        .map((item: any) => {
          const address = item.address || {};
          const cityName =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            address.state_district ||
            item.display_name?.split(',')[0]?.trim();
          const locationParts: string[] = [];
          if (cityName) locationParts.push(cityName);
          if (address.state) locationParts.push(address.state);
          if (address.country) locationParts.push(address.country);
          return {
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            city: cityName,
            fullLocation: locationParts.join(', '),
            country: address.country,
            state: address.state,
            type: item.type || item.class,
            importance: item.importance || 0,
          };
        })
        .filter((item: any) => item.city && item.city.trim().length > 0)
        .sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0))
        .slice(0, 5);
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setPickedCoords(false);
    if (searchTimeout) clearTimeout(searchTimeout);
    if (value.length > 2) {
      const timeout = setTimeout(() => searchLocationSuggestions(value), 200);
      setSearchTimeout(timeout);
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleLocationSelect = (suggestion: any) => {
    const cityName =
      suggestion.fullLocation ||
      `${suggestion.city}${suggestion.state ? `, ${suggestion.state}` : ''}${suggestion.country ? `, ${suggestion.country}` : ''}`;
    setCity(cityName);
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    localStorage.setItem('userLat', suggestion.lat.toString());
    localStorage.setItem('userLng', suggestion.lon.toString());
    localStorage.setItem('userCity', cityName);
    setPickedCoords(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || locationSuggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < locationSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : locationSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          handleLocationSelect(locationSuggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const goLocationNext = () => {
    setErrorMessage('');
    const trimmed = city.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your location.');
      return;
    }
    localStorage.setItem('userCity', trimmed);
    if (!pickedCoords) {
      localStorage.removeItem('userLat');
      localStorage.removeItem('userLng');
    }
    setStep('mood');
  };

  const goMoodNext = () => {
    setErrorMessage('');
    if (!selectedMood && !customMood.trim()) {
      setErrorMessage('Pick a mood or describe your own.');
      return;
    }
    setStep('preferences');
  };

  const goPreferencesNext = async () => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const moodLabel = selectedMood
        ? MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label || selectedMood
        : customMood.trim();

      const moodData = {
        mood: selectedMood || customMood.trim(),
        isCustom: !selectedMood,
        timestamp: new Date().toISOString(),
      };
      await axios.post('http://localhost:5001/api/mood', moodData);
      localStorage.setItem('currentMood', moodLabel);

      const cityStored = (localStorage.getItem('userCity') || city).trim();
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      if (cityStored) {
        await axios.post('http://localhost:5001/api/user', {
          city: cityStored,
          preferences,
        });
      }
      setStep('done');
    } catch {
      setErrorMessage('Could not save. Check that the server is running and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const moodDisplayLabel = selectedMood
    ? MOOD_OPTIONS.find((m) => m.id === selectedMood)?.label
    : customMood.trim() || '—';

  const cityLabel = (localStorage.getItem('userCity') || city).trim();

  return (
    <div className="onboarding-page-root">
      <header
        className="sticky top-0 z-40 border-b shadow-sm shrink-0"
        style={{
          background:
            'radial-gradient(900px 420px at 20% 0%, rgba(124, 58, 237, 0.28), rgba(0, 0, 0, 0) 60%), linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))',
          borderColor: 'rgba(255, 255, 255, 0.10)',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-3 sm:py-4 gap-3 sm:gap-0">
            <div className="flex items-center space-x-2 sm:space-x-4 flex-1">
              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-bold"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  backgroundImage:
                    'linear-gradient(90deg, rgba(255, 255, 255, 0.98), rgba(199, 210, 254, 0.92))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                MoodMap
              </h1>
              <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-md text-white/90 border border-white/15 bg-white/10">
                Setup
              </span>
            </div>
            <nav className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/homepage')}
                className="flex-1 sm:flex-none px-3 sm:px-5 py-2 font-semibold text-sm sm:text-base rounded-lg transition-colors flex items-center justify-center gap-1.5 text-slate-900"
                style={{
                  backgroundColor: '#ffffff',
                  fontFamily: "'Inter', sans-serif",
                  border: '1px solid rgba(255, 255, 255, 0.35)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}
              >
                Home
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 min-h-0 overflow-hidden">
        <div className="onboarding-container onboarding-container--in-main flex-1 flex min-h-0 w-full items-center justify-center overflow-hidden">
          <div
            className="onboarding-form-card"
          >
            <div className="onboarding-step-dots" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`onboarding-step-dot ${i <= stepIndex ? 'onboarding-step-dot--active' : ''}`}
                />
              ))}
            </div>

            <div className="onboarding-form-card-body">
        {step === 'mood' && (
          <>
            <div className="onboarding-header onboarding-header--compact-mood">
              <h1 className="onboarding-title">How are you feeling?</h1>
              <p className="onboarding-subtitle">
                Tap a card to choose — your pick stays highlighted
              </p>
              {cityLabel ? (
                <p
                  className="onboarding-mood-city-line"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span aria-hidden>📍</span>
                  <span>{cityLabel}</span>
                </p>
              ) : null}
            </div>

            <div
              className="onboarding-mood-grid grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
              role="radiogroup"
              aria-label="Choose your mood"
            >
              {MOOD_OPTIONS.map((mood) => {
                const isSelected = selectedMood === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setSelectedMood(mood.id);
                      setCustomMood('');
                    }}
                    className={`doodle-card onboarding-mood-pick-card onboarding-mood-pick-card--equal w-full flex flex-col text-left min-h-0 p-0 ${
                      isSelected ? 'onboarding-mood-pick-card--selected' : ''
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <div className="onboarding-mood-pick-card-inner w-full min-h-0 flex-1 flex flex-col justify-center p-3 sm:p-3.5">
                    <div className="flex items-start gap-2.5 sm:gap-3 w-full min-w-0 min-h-0">
                      <div
                        className="onboarding-mood-pick-emoji w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 text-lg sm:text-xl"
                        aria-hidden
                      >
                        {mood.emoji}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col gap-1 items-stretch text-left">
                        <div className="min-w-0">
                          <h3
                            className="onboarding-mood-pick-title font-bold text-gray-900 leading-tight"
                            style={{ fontFamily: "'Poppins', sans-serif" }}
                          >
                            {mood.label}
                          </h3>
                          <span className="onboarding-mood-pick-badge mt-1 inline-block text-[0.65rem] sm:text-xs text-white px-1.5 py-0.5 font-medium rounded-md">
                            Mood
                          </span>
                        </div>
                        <p className="text-[0.7rem] sm:text-xs text-gray-700 leading-snug">
                          {mood.description}
                        </p>
                      </div>
                    </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="onboarding-field onboarding-field--mood-custom">
              <label htmlFor="customMood" className="onboarding-label">
                Or describe your mood
              </label>
              <input
                id="customMood"
                type="text"
                value={customMood}
                onChange={(e) => {
                  setCustomMood(e.target.value);
                  if (e.target.value) setSelectedMood('');
                }}
                className="onboarding-input"
                placeholder="e.g. nostalgic, wired, chill…"
              />
            </div>

            {errorMessage && <div className="onboarding-inline-error">{errorMessage}</div>}

            <div className="setup-nav-row">
              <button
                type="button"
                className="onboarding-button-secondary"
                onClick={() => setStep('location')}
              >
                Back
              </button>
              <button type="button" onClick={goMoodNext} className="onboarding-button">
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'location' && (
          <>
            <div className="onboarding-header">
              <h1 className="onboarding-title">Where are you?</h1>
              <p className="onboarding-subtitle">
                We use this to find places near you
              </p>
              <div className="onboarding-map-container">
                <img
                  src={onboardingWorldMap}
                  alt=""
                  className="onboarding-world-map-image"
                  width={240}
                  height={141}
                  decoding="async"
                />
              </div>
            </div>

            <div className="onboarding-form">
              <div className="onboarding-field">
                <label htmlFor="city" className="onboarding-label">
                  City or area
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => handleCityChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      if (locationSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="onboarding-input"
                    placeholder="Start typing…"
                    style={{ width: '100%' }}
                    autoComplete="off"
                  />
                  {isLoadingSuggestions && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#7c3aed',
                      }}
                    >
                      <div
                        style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #e5e7eb',
                          borderTop: '2px solid #7c3aed',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    </div>
                  )}
                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="onboarding-suggestions">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleLocationSelect(suggestion)}
                          onKeyDown={(ev) => {
                            if (ev.key === 'Enter') handleLocationSelect(suggestion);
                          }}
                          className={`onboarding-suggestion-row ${
                            selectedSuggestionIndex === index ? 'onboarding-suggestion-row--kbd' : ''
                          }`}
                        >
                          <div className="onboarding-suggestion-title">{suggestion.city}</div>
                          <div className="onboarding-suggestion-sub">
                            {suggestion.fullLocation ||
                              (suggestion.state && suggestion.country
                                ? `${suggestion.state}, ${suggestion.country}`
                                : suggestion.country || suggestion.state || '')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {errorMessage && (
                <div className="onboarding-inline-error">{errorMessage}</div>
              )}

              <button
                type="button"
                onClick={goLocationNext}
                className="onboarding-button"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'preferences' && (
          <>
            <div className="onboarding-header">
              <h1 className="onboarding-title">Place types</h1>
              <p className="onboarding-subtitle">
                What should we prioritize? (optional)
              </p>
            </div>

            <div className="setup-preferences-grid">
              {PLACE_TYPE_OPTIONS.map((label, idx) => {
                const isOn = preferences.includes(label);
                const theme = idx % 5;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={isOn}
                    onClick={() =>
                      setPreferences((prev) =>
                        prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
                      )
                    }
                    className={`doodle-card setup-pref-card setup-pref-card--t${theme} ${
                      isOn ? 'setup-pref-card--selected' : ''
                    }`}
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    {isOn ? (
                      <span className="setup-pref-card-check" aria-hidden>
                        ✓
                      </span>
                    ) : null}
                    <span className="setup-pref-card-label">{label}</span>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="onboarding-inline-error">{errorMessage}</div>
            )}

            <div className="setup-nav-row">
              <button
                type="button"
                className="onboarding-button-secondary"
                onClick={() => setStep('mood')}
              >
                Back
              </button>
              <button
                type="button"
                onClick={goPreferencesNext}
                disabled={isSubmitting}
                className="onboarding-button"
              >
                {isSubmitting ? 'Saving…' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="onboarding-header">
              <div className="onboarding-map-container">
                <span className="onboarding-map" style={{ fontSize: '3rem' }}>
                  ✨
                </span>
              </div>
              <h1 className="onboarding-title">You&apos;re all set</h1>
              <p className="onboarding-subtitle">
                {localStorage.getItem('userCity') || city}
              </p>
            </div>

            <div className="setup-done-summary">
              <p>
                <strong>Mood:</strong> {moodDisplayLabel}
              </p>
              <p>
                <strong>Preferences:</strong>{' '}
                {preferences.length ? preferences.join(', ') : 'No filters — surprise me'}
              </p>
            </div>

            <button
              type="button"
              className="onboarding-button"
              onClick={() => navigate('/dashboard')}
            >
              Open my map
            </button>
            <button
              type="button"
              className="onboarding-button-secondary onboarding-button-full-margin"
              onClick={() => {
                setStep('location');
                setSelectedMood('');
                setCustomMood('');
                setPreferences([]);
              }}
            >
              Start over
            </button>
          </>
        )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
