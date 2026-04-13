/** Base URL for the MoodMap API (no trailing slash). Set in Vercel as REACT_APP_API_URL. */
const DEFAULT_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? '' // same-origin in production (works with rewrites / proxy)
    : 'http://localhost:5001';

const raw = (process.env.REACT_APP_API_URL || DEFAULT_BASE_URL).trim();
export const API_BASE_URL = raw.replace(/\/$/, '');

