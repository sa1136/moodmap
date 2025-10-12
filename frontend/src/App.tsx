import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import OnboardingPage from './pages/OnboardingPage';
import MoodInputPage from './pages/MoodInputPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/homepage" replace />} />
          <Route path="/homepage" element={<HomePage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/mood" element={<MoodInputPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
