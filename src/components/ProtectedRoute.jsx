import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    // 1. While we are asking the server "Who is this?", show nothing or a spinner
    if (loading) return <div>Loading...</div>;

    // 2. If no user is logged in, redirect to the landing/login page
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Optional: If a specific role (like GOD) is required and they don't have it
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    // 4. If they are logged in and authorized, let them in!
    return children;
};

export default ProtectedRoute;