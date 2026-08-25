import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isSigningUpRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSigningUpRef.current) {
        setSession(session);
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.name || session.user.email.split('@')[0]
          });
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Ignore auth state changes while user registration is in progress
      if (isSigningUpRef.current) {
        return;
      }

      setSession(session);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email.split('@')[0]
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!isSupabaseConfigured()) {
      const msg = 'Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing on Vercel. Please add them in Vercel Settings -> Environment Variables and redeploy.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email.split('@')[0]
      };

      setUser(userData);
      setSession(data.session);
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
    if (!isSupabaseConfigured()) {
      const msg = 'Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are missing on Vercel. Please add them in Vercel Settings -> Environment Variables and redeploy.';
      setError(msg);
      return { success: false, error: msg };
    }

    setLoading(true);
    setError(null);
    isSigningUpRef.current = true;
    
    // Explicitly reset user and session before registration
    setUser(null);
    setSession(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: name.trim() }
        }
      });

      if (error) throw error;

      // Force sign out immediately if Supabase created a session
      await supabase.auth.signOut().catch(() => {});

      // Clear any stored Supabase auth tokens from localStorage
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth-token'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.error('Error clearing storage:', e);
      }

      setUser(null);
      setSession(null);

      // Delay resetting the ref so leftover async state events are absorbed
      await new Promise(r => setTimeout(r, 400));

      return {
        success: true,
        loggedIn: false,
        requiresSignIn: true,
        message: 'Account created successfully! Please sign in with your email and password.'
      };
    } catch (err) {
      const msg = err.message || 'Signup failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      isSigningUpRef.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  const token = session?.access_token || null;

  return (
    <AuthContext.Provider value={{ user, token, session, loading, error, setError, login, signup, logout, isConfigured: isSupabaseConfigured() }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
