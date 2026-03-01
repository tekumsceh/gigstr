import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // NEW: We store the user's band roles here
    const [userBands, setUserBands] = useState([]); 
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const res = await axios.get('/api/me');
            
            // We assume the backend will now send both the user info AND their band memberships
            // If res.data is just the user object, we store it. If it has a nested .user and .bands, we split it.
            setUser(res.data.user || res.data);
            setUserBands(res.data.bands || []);
            
        } catch (err) {
            setUser(null);
            setUserBands([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // --- NEW: ROLE CHECKING HELPERS ---

    // 1. Check what role the user has in a specific band
    const getBandRole = (bandID) => {
        if (!userBands || userBands.length === 0) return null;
        const membership = userBands.find(b => b.bandID === parseInt(bandID));
        return membership ? membership.role : null;
    };

    // 2. Check if user has global app-wide admin privileges
    const isGlobalAdmin = () => {
        return user?.role === 'Admin'; // Adjust if your ENUM uses a different word like 'SuperAdmin'
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            setUser, 
            userBands, 
            loading, 
            checkAuth, 
            getBandRole, 
            isGlobalAdmin 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);