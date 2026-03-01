// App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import HomeView from './views/HomeView';
import AddDateView from './views/AddDateView';
import ValetView from './views/ValetView';
import DateDetailView from './views/DateDetailView';
import CreateBandView from './views/CreateBandView';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalHeader from './components/layouts/GlobalHeader';
import GlobalFooter from './components/layouts/GlobalFooter';
import QuickActionFAB from './components/QuickActionFAB';
import SettingsView from './views/SettingsView';
import BandManagementView from './views/BandManagementView';

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isDateDetail = /^\/date\/[^/]+$/.test(location.pathname);

  return (
    <>
      {/* Top Header */}
      {user?.role === 'GOD' && <GlobalHeader />}

      {/* Body: main scrolls on most pages; on DateDetailView only form scrolls */}
      <main className={`flex-grow w-full flex flex-col min-h-0 ${isDateDetail ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
        <div className={isDateDetail ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><HomeView /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddDateView /></ProtectedRoute>} />
            <Route path="/valet" element={<ProtectedRoute><ValetView /></ProtectedRoute>} />
            <Route path="/date/:id" element={<ProtectedRoute><DateDetailView /></ProtectedRoute>} />
            <Route path="/create-band" element={<ProtectedRoute><CreateBandView /></ProtectedRoute>} />
            <Route path="/band/:id/manage" element={<BandManagementView />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </div>
      </main>

      {/* Bottom Menu */}
      {user?.role === 'GOD' && <GlobalFooter />}

      {/* Floating Action Button */}
      {user?.role === 'GOD' && <QuickActionFAB />}
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container flex flex-col min-h-screen bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans overflow-hidden">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;