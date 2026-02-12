import React, { createContext, useState, useContext, useEffect } from 'react';
import apiClient, { setAuthToken } from '../utils/apiClient';
import { encryptForStorage, decryptFromStorage } from '../utils/encryption';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for token in localStorage on mount
    const checkLoggedIn = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Decrypt token from secure storage
          const token = decryptFromStorage(storedToken);
          setAuthToken(token);
          const res = await apiClient.get('/auth/me');
          setUser(res.data.data);
        } catch (err) {
          // Token invalid or expired — clear auth state
          localStorage.removeItem('token');
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/auth/register', userData);
      const { token, ...profile } = res.data.data;

      // Encrypt token before storing in localStorage
      localStorage.setItem('token', encryptForStorage(token));
      setAuthToken(token);
      setUser(profile);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { token, ...profile } = res.data.data;

      // Encrypt token before storing in localStorage
      localStorage.setItem('token', encryptForStorage(token));
      setAuthToken(token);
      setUser(profile);
      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
  };

  // Function to manually set auth state after face login
  const setAuthData = (data) => {
    const { token, ...profile } = data;
    localStorage.setItem('token', encryptForStorage(token));
    setAuthToken(token);
    setUser(profile);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    setAuthData,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isDoctor: user?.role === 'oncologist',
    isPatient: user?.role === 'patient',
    isResearcher: user?.role === 'researcher'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
