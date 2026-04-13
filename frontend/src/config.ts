/** Base URL for the MoodMap API (no trailing slash). Set in Vercel as REACT_APP_API_URL. */
export const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5001').replace(
  /\/$/,
  ''
);

