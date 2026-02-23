import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import HomeView from './views/HomeView';
import AddDateView from './views/AddDateView';
import ValetView from './views/ValetView';
import DateDetailView from './views/DateDetailView';
import CreateBandView from './views/CreateBandView'; // <-- IMPORT THE NEW VIEW
import ProtectedRoute from './components/ProtectedRoute';
import Avatar from './components/Avatar';

function App() {

  const { user } = useAuth(); 

  return (
    <Router>
      <div className="app-container">
        
        {/* Navigation Bar (No changes here) */}
        {user?.role === 'GOD' && (
          <nav className="flex items-center justify-between px-10 py-8 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md shrink-0 z-50 shadow-2xl">
            <Link to="/" className="text-3xl font-black italic uppercase tracking-tighter text-white hover:text-orange-500 transition-all">
              Gigstr
            </Link>
            <div className="flex gap-12 items-center">
              <Link to="/add" className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all">Add Date</Link>
              <Link to="/valet" className="text-[14px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-white transition-all">Valet</Link>
              
              <Avatar />

            </div>
          </nav>
        )}

        <main className="custom-scrollbar">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute requiredRole="GOD"><HomeView /></ProtectedRoute>} />
            <Route path="/add" element={<ProtectedRoute requiredRole="GOD"><AddDateView /></ProtectedRoute>} />
            <Route path="/valet" element={<ProtectedRoute requiredRole="GOD"><ValetView /></ProtectedRoute>} />
            <Route path="/date/:id" element={<ProtectedRoute requiredRole="GOD"><DateDetailView /></ProtectedRoute>} />
            {/* ADD THE NEW ROUTE FOR CREATING A BAND */}
            <Route path="/create-band" element={<ProtectedRoute requiredRole="GOD"><CreateBandView /></ProtectedRoute>} />
          </Routes>
        </main>

      </div>
    </Router>
  );
}

export default App;
