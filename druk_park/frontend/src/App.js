import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TimeFormatProvider } from './context/TimeFormatContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import TopNav from './components/TopNav';
import Footer from './components/Footer';
import Login from './pages/Login';
import Home from './pages/Home';
import Analytics from './pages/Analytics';
import IMEM from './pages/IMEM';
import Calibration from './pages/Calibration';

function App() {
  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyPress = (e) => {
      // Only trigger if not typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // F - Focus search/filter (if on IMEM page)
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }

      // S - Open snapshot modal (if available)
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        // This would need to be implemented with a global state or event system
        // For now, we'll just focus on the search since snapshots are context-specific
      }

      // N - Jump to next unread IMEM (if on IMEM page)
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        // This would scroll to the next unread item
        // Implementation would require tracking read/unread state
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <TimeFormatProvider>
      <NotificationProvider>
        <Router>
          <div className="flex flex-col min-h-screen">
            <TopNav />
            <main className="flex-grow">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
                <Route path="/imem" element={<PrivateRoute><IMEM /></PrivateRoute>} />
                <Route path="/calibration" element={<PrivateRoute><Calibration /></PrivateRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </NotificationProvider>
    </TimeFormatProvider>
  );
}

export default App;
