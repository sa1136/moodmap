import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import AppHeader from '../components/AppHeader';
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

  /** Viewport-fixed box for location autocomplete (portal — not clipped by flash card overflow). */
  const [suggestionDropdownBox, setSuggestionDropdownBox] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const locationFieldWrapRef = useRef<HTMLDivElement>(null);

  const stepIndex = STEPS.indexOf(step);

  const searchLocationSuggestions = async (query: string) => {
    if (query.length < 2) return;
    setIsLoadingSuggestions(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/locations/search`, {
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
    document.documentElement.classList.add('onboarding-route');
    document.body.classList.add('onboarding-route');
    return () => {
      document.documentElement.classList.remove('onboarding-route');
      document.body.classList.remove('onboarding-route');
    };
  }, []);

  useLayoutEffect(() => {
    if (step !== 'location' || !showSuggestions || locationSuggestions.length === 0) {
      setSuggestionDropdownBox(null);
      return;
    }

    const wrap = locationFieldWrapRef.current;
    if (!wrap) {
      setSuggestionDropdownBox(null);
      return;
    }

    const update = () => {
      requestAnimationFrame(() => {
        const el = locationFieldWrapRef.current;
        if (!el) return;

        const r = el.getBoundingClientRect();
        const vv = window.visualViewport;
        const inset = 10;
        const gap = 8;

        /* Always open below the input (never flip upward). */
        const top = r.bottom + gap;
        const vw = vv?.width ?? window.innerWidth;
        const offsetLeft = vv?.offsetLeft ?? 0;
        let left = r.left + offsetLeft;
        let width = r.width;
        left = Math.max(inset, Math.min(left, vw - inset - Math.min(width, vw - 2 * inset)));
        width = Math.min(width, vw - 2 * inset);

        /* Use visual viewport bottom so the list fits above the keyboard on mobile */
        const viewportBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
        const maxHeight = Math.max(
          96,
          Math.min(260, Math.max(0, viewportBottom - top - inset))
        );

        setSuggestionDropdownBox({ top, left, width, maxHeight });
      });
    };

    update();
    const t = window.setTimeout(update, 100);
    const t2 = window.setTimeout(update, 350);

    const scrollParent = wrap.closest('.onboarding-form-card-body');
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    scrollParent?.addEventListener('scroll', update, { passive: true });
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);

    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      scrollParent?.removeEventListener('scroll', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [step, showSuggestions, locationSuggestions]);

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
      await axios.post(`${API_BASE_URL}/api/mood`, moodData);
      localStorage.setItem('currentMood', moodLabel);

      const cityStored = (localStorage.getItem('userCity') || city).trim();
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      if (cityStored) {
        await axios.post(`${API_BASE_URL}/api/user`, {
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
    <>
      <AppHeader variant="onboarding" />
      <div className="onboarding-page-root onboarding-page-root--below-header">
        <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 min-h-0 overflow-hidden">
        <div className="onboarding-container onboarding-container--in-main flex flex-1 min-h-0 w-full flex-col items-center justify-center overflow-hidden">
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
                    <div className="onboarding-mood-pick-card-inner w-full min-h-0 flex-1 flex flex-col justify-center p-2.5 sm:p-3.5">
                      <div className="onboarding-mood-pick-row flex w-full min-w-0 min-h-0 flex-col items-center gap-1.5 text-center md:flex-row md:items-start md:gap-3 md:text-left">
                        <div
                          className="onboarding-mood-pick-emoji flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base md:h-11 md:w-11 md:rounded-xl md:text-xl"
                          aria-hidden
                        >
                          {mood.emoji}
                        </div>
                        <div className="flex min-w-0 w-full flex-1 flex-col gap-0.5 items-center text-center md:items-stretch md:gap-1 md:text-left">
                          <div className="min-w-0 w-full text-center md:text-left">
                            <h3
                              className="onboarding-mood-pick-title font-bold text-gray-900 leading-tight"
                              style={{ fontFamily: "'Poppins', sans-serif" }}
                            >
                              {mood.label}
                            </h3>
                            <span className="onboarding-mood-pick-badge mt-0.5 inline-block text-[0.6rem] sm:text-xs text-white px-1.5 py-0.5 font-medium rounded-md md:mt-1">
                              Mood
                            </span>
                          </div>
                          <p className="onboarding-mood-pick-desc text-center text-[0.65rem] leading-snug text-gray-700 sm:text-xs md:text-left">
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
                <div ref={locationFieldWrapRef} style={{ position: 'relative' }}>
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

    {step === 'location' &&
      showSuggestions &&
      locationSuggestions.length > 0 &&
      suggestionDropdownBox &&
      createPortal(
        <div
          className="onboarding-suggestions onboarding-suggestions--portal"
          role="listbox"
          aria-label="Location suggestions"
          style={{
            position: 'fixed',
            top: suggestionDropdownBox.top,
            left: suggestionDropdownBox.left,
            width: suggestionDropdownBox.width,
            maxHeight: suggestionDropdownBox.maxHeight,
            zIndex: 10050,
          }}
        >
          {locationSuggestions.map((suggestion, index) => (
            <div
              key={index}
              role="option"
              tabIndex={0}
              aria-selected={selectedSuggestionIndex === index}
              onMouseDown={(e) => e.preventDefault()}
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
        </div>,
        document.body
      )}
    </>
  );
}
