import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, signupUser, getStoredToken, getStoredUser } from '../api/authApi';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync token and user if changed
  useEffect(() => {
    const activeToken = getStoredToken();
    const activeUser = getStoredUser();
    if (activeToken !== token) setToken(activeToken);
    if (JSON.stringify(activeUser) !== JSON.stringify(user)) setUser(activeUser);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser(email, password);
      // Java backend returns: { accessToken, tokenType, user: { id, name, email } }
      const accessToken = data.accessToken;
      const userData = data.user || {
        email: email.trim().toLowerCase(),
        name: email.split('@')[0]
      };

      localStorage.setItem('finmitra_token', accessToken);
      localStorage.setItem('finmitra_user', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await signupUser(name, email, password);
      return {
        success: true,
        loggedIn: false,
        requiresSignIn: true,
        message: data.message || 'Account created successfully! Please sign in with your email and password.'
      };
    } catch (err) {
      const msg = err.message || 'Signup failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('finmitra_token');
    localStorage.removeItem('finmitra_user');
    setToken(null);
    setUser(null);
  };

  const session = token ? { access_token: token, user } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        session,
        loading,
        error,
        setError,
        login,
        signup,
        logout,
        isConfigured: true
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
