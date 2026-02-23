import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
    const { user, loading } = useAuth();

    // If the app is still checking who you are, show a loading message
    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

    // If you are ALREADY logged in, don't stay on the login page! Go to Valet.
    if (user) return <Navigate to="/" replace />;

    // The actual login button logic
    const handleLogin = () => {
        window.location.href = '/auth/google';
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
            <h1>Gigstr</h1>
            <p>Please log in to access the Valet Master Package.</p>
            <button 
                onClick={handleLogin}
                style={{
                    padding: '10px 20px', 
                    cursor: 'pointer', 
                    fontSize: '16px',
                    backgroundColor: '#4285F4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px'
                }}
            >
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;