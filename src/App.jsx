// App.jsx
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import HomeView from './views/HomeView';
import AddDateView from './views/AddDateView';
import AllEventsView from './views/AllEventsView';
import ValetView from './views/ValetView';
import MyWalletView from './views/MyWalletView';
import DateDetailView from './views/DateDetailView';
import CreateBandView from './views/CreateBandView';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalHeader from './components/layouts/GlobalHeader';
import GlobalFooter from './components/layouts/GlobalFooter';
import QuickActionFAB from './components/QuickActionFAB';
import SettingsView from './views/SettingsView';
import FinanceWorksheetView from './views/FinanceWorksheetView';
import BandManagementView from './views/BandManagementView';
import BandAdminView from './views/BandAdminView';
import TranslateView from './views/TranslateView';

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const isDateDetail = /^\/date\/[^/]+$/.test(location.pathname);
  const isAllEvents = location.pathname === '/events';
  const fixedLayout = isDateDetail || isAllEvents;

  return (
    <>
      {/* Row 1: header (auto height) */}
      <div className="min-h-0">{(user?.role === 'GOD' || user?.role === 'translator') && <GlobalHeader />}</div>

      {/* Row 2: main fills remaining space; content + pagination stay above footer. */}
      <main
        className={`min-h-0 w-full ${fixedLayout ? 'flex flex-col overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}
      >
        {fixedLayout ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0, flex: '1 1 0%' }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><HomeView /></ProtectedRoute>} />
              <Route path="/add" element={<ProtectedRoute><AddDateView /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><AllEventsView /></ProtectedRoute>} />
              <Route path="/valet" element={<ProtectedRoute><ValetView /></ProtectedRoute>} />
              <Route path="/wallet" element={<ProtectedRoute><MyWalletView /></ProtectedRoute>} />
              <Route path="/date/:id" element={<ProtectedRoute><DateDetailView /></ProtectedRoute>} />
              <Route path="/create-band" element={<ProtectedRoute><CreateBandView /></ProtectedRoute>} />
              <Route path="/band/:id/manage" element={<BandManagementView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route
                path="/translate"
                element={
                  <ProtectedRoute allowedRoles={['GOD', 'translator']}>
                    <TranslateView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/date/:id/finance"
                element={
                  <ProtectedRoute requiredRole="GOD">
                    <FinanceWorksheetView />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><HomeView /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute><AddDateView /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><AllEventsView /></ProtectedRoute>} />
            <Route path="/valet" element={<ProtectedRoute><ValetView /></ProtectedRoute>} />
            <Route path="/wallet" element={<ProtectedRoute><MyWalletView /></ProtectedRoute>} />
            <Route path="/date/:id" element={<ProtectedRoute><DateDetailView /></ProtectedRoute>} />
            <Route path="/create-band" element={<ProtectedRoute><CreateBandView /></ProtectedRoute>} />
            <Route path="/band/:id/manage" element={<BandManagementView />} />
            <Route path="/band/:id/admin" element={<BandAdminView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route
              path="/translate"
              element={
                <ProtectedRoute allowedRoles={['GOD', 'translator']}>
                  <TranslateView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/date/:id/finance"
              element={
                <ProtectedRoute requiredRole="GOD">
                  <FinanceWorksheetView />
                </ProtectedRoute>
              }
            />
          </Routes>
        )}
      </main>

      {/* Row 3: footer (auto height), in flow so content stays above it */}
      <div className="min-h-0">{(user?.role === 'GOD' || user?.role === 'translator') && <GlobalFooter />}</div>

      {/* Floating Action Button */}
      {user?.role === 'GOD' && <QuickActionFAB />}
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container grid grid-rows-[auto_1fr_auto] h-screen min-h-0 bg-[var(--bg-surface)] text-[var(--text-primary)] font-sans overflow-hidden">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;