import db, { sb } from '@/api/client';

import React, { createContext, useState, useContext, useEffect } from 'react';

// Auth-kontekst som speiler Base44-formen (samme felt og metoder),
// men med Supabase under panseret. Behold-overflaten gjør at alle
// sider og komponenter fungerer uten endringer.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Starter på false: appen rendres umiddelbart. user-state
  // populeres i bakgrunnen av me() / onAuthStateChange. Header
  // viser "Logg inn" et øyeblikk før det evt. flipper til
  // "Logg ut" — bedre UX enn 6-sek spinner ved første load.
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  // Disse to feltene var Base44-spesifikke (app config + auth-feil
  // fra hosted endpoint). Vi beholder dem som no-op for at App.jsx
  // og pages skal kunne destrukturere uten å krasje.
  const [isLoadingPublicSettings] = useState(false);
  const [authError] = useState(null);
  const [appPublicSettings] = useState(null);

  // Initial sjekk + abonnement på auth-endringer.
  // Kjører i bakgrunnen — appen er allerede rendret når dette starter.
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const me = await db.auth.me();
        if (!mounted) return;
        setUser(me);
        setIsAuthenticated(!!me);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Auth-init feilet:', e);
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
