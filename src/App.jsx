// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import HomeView from './views/HomeView';
import AddDateView from './views/AddDateView';
import ValetView from './views/ValetView';
import DateDetailView from './views/DateDetailView';
import CreateBandView from './views/CreateBandView';
import ProtectedRoute from './components/ProtectedRoute';

// Import your new layout shell components
import GlobalHeader from './components/layouts/GlobalHeader';
import GlobalFooter from './components/layouts/GlobalFooter';

function App() {
  const { user } = useAuth(); 

  return (
    <Router>
      <div className="app-container flex flex-col min-h-screen bg-[var(--bg-surface)] text-white font-sans overflow-hidden">
        
        {/* Top Header */}
        {user?.role === 'GOD' && <GlobalHeader />}

        {/* Scrollable Body Area */}
        <main className="flex-grow w-full overflow-y-auto custom-scrollbar">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute requiredRole="GOD"><HomeView /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute requiredRole="GOD"><AddDateView /></ProtectedRoute>} />
            <Route path="/valet" element={<ProtectedRoute requiredRole="GOD"><ValetView /></ProtectedRoute>} />
            <Route path="/date/:id" element={<ProtectedRoute requiredRole="GOD"><DateDetailView /></ProtectedRoute>} />
            <Route path="/create-band" element={<ProtectedRoute requiredRole="GOD"><CreateBandView /></ProtectedRoute>} />
          </Routes>
        </main>

        {/* Bottom Menu */}
        {user?.role === 'GOD' && <GlobalFooter />}

      </div>
    </Router>
  );
}

export default App;