import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MoodIndicator from './MoodIndicator';

const HEADER_BG = {
  background:
    'radial-gradient(900px 420px at 20% 0%, rgba(124, 58, 237, 0.28), rgba(0, 0, 0, 0) 60%), linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.98))',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

type AppHeaderProps =
  | { variant: 'dashboard'; currentMood?: string }
  | { variant: 'onboarding' };

export default function AppHeader(props: AppHeaderProps) {
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  const moodForLayout = props.variant === 'dashboard' ? props.currentMood ?? '' : '';

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const sync = () => {
      document.documentElement.style.setProperty('--app-header-height', `${el.offsetHeight}px`);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    window.addEventListener('resize', sync);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
      document.documentElement.style.removeProperty('--app-header-height');
    };
  }, [props.variant, moodForLayout]);

  const currentMood = props.variant === 'dashboard' ? props.currentMood : undefined;

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 border-b shadow-sm backdrop-blur-md pt-[env(safe-area-inset-top)]"
      style={HEADER_BG}
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
            {props.variant === 'onboarding' ? (
              <span className="hidden sm:inline text-xs font-semibold px-2.5 py-1 rounded-md text-white/90 border border-white/15 bg-white/10">
                Setup
              </span>
            ) : (
              currentMood && (
                <div className="hidden sm:block">
                  <MoodIndicator mood={currentMood} size="sm" />
                </div>
              )
            )}
          </div>
          {props.variant === 'dashboard' && currentMood && (
            <div className="sm:hidden -mt-2">
              <MoodIndicator mood={currentMood} size="sm" />
            </div>
          )}
          <nav className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
            {props.variant === 'onboarding' ? (
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
            ) : (
              <button
                type="button"
                onClick={() => navigate('/onboarding')}
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
                <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">New Mood</span>
                <span className="sm:hidden text-xs">Mood</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
