// src/auth-context.js
import React, { createContext, useState, useEffect, useContext } from 'react';

// Create a context for authentication
export const AuthContext = createContext();

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simulate checking for authentication state (e.g., checking localStorage)
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = (userData) => {
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData)); // Save user data in localStorage
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('user'); // Remove user data from localStorage
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
