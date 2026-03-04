import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Navigate } from 'react-router-dom';

const Login = () => {
    const { user, loading } = useAuth();
    const { t } = useLanguage();

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>{t('common.loading')}</div>;
    if (user) return <Navigate to="/" replace />;

    const handleLogin = () => {
        window.location.href = '/auth/google';
    };

    return (
        <div style={{ textAlign: 'center', marginTop: '100px', fontFamily: 'sans-serif' }}>
            <h1>{t('login.appName')}</h1>
            <p>{t('login.pleaseLogIn')}</p>
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
                {t('login.signInGoogle')}
            </button>
        </div>
    );
};

export default Login;