import db, { sb } from '@/api/client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Auth-kontekst som speiler Base44-formen (samme felt og metoder),
// men med Supabase under panseret. Behold-overflaten gjør at alle
// sider og komponenter fungerer uten endringer.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Disse to feltene var Base44-spesifikke (app config + auth-feil
  // fra hosted endpoint). Vi beholder dem som no-op for at App.jsx
  // og pages skal kunne destrukturere uten å krasje.
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [appPublicSettings] = useState(null);

  // Initial sjekk + abonnement på auth-endringer
  useEffect(() => {
    let mounted = true;

    // Watchdog: garanter at appen rendrer innen 6 sek selv om
    // db.auth.me() henger (Supabase JS init-bug kan blokkere
    // første load). User-state oppdateres senere når me() lander
    // eller via onAuthStateChange.
    const watchdog = setTimeout(() => {
      if (mounted) {
        // eslint-disable-next-line no-console
        console.warn('AuthContext watchdog: tvinger isLoadingAuth=false etter 6s');
        setIsLoadingAuth(false);
      }
    }, 6000);

    (async () => {
      try {
        const me = await db.auth.me();
        if (!mounted) return;
        setUser(me);
        setIsAuthenticated(!!me);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth-init feilet:', e);
      } finally {
        if (mounted) {
          clearTimeout(watchdog);
          setIsLoadingAuth(false);
        }
      }
    })();

    const { data: subscription } = sb.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        if (session) {
          try {
            const me = await db.auth.me();
            if (!mounted) return;
            setUser(me);
            setIsAuthenticated(!!me);
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('onAuthStateChange me() feilet:', e);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(watchdog);
      subscription?.subscription?.unsubscribe?.();
    };
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    try {
      const me = await db.auth.me();
      setUser(me);
      setIsAuthenticated(!!me);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => db.auth.logout();

  const navigateToLogin = () => db.auth.redirectToLogin();

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
