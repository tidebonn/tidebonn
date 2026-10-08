import db, { sb } from '@/api/client';

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

// Én kilde for innlogget bruker og brukerens progresjon. Sidene leser
// herfra i stedet for å kalle isAuthenticated()/me()/UserProgress selv.
const AuthContext = createContext();

// Anvend evt. nyhetsbrev-samtykke valgt i LoginDialog (også etter
// magic-link-redirect). Kjøres én gang, så fjernes flagget.
async function applyPendingNewsletter(session) {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage.getItem('tidebonn.pendingNewsletter') === 'true' &&
      session.user?.id
    ) {
      await sb.from('profiles').update({ wants_newsletter: true }).eq('id', session.user.id);
      window.localStorage.removeItem('tidebonn.pendingNewsletter');
    }
  } catch (e) {
    console.warn('Nyhetsbrev-flagg feilet:', e);
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  // true når første avklaring (sesjon eller ikke) er gjort
  const [authReady, setAuthReady] = useState(false);

  const refreshUser = useCallback(async () => {
    const me = await db.auth.me();
    setUser(me);
    if (!me) {
      setUserProgress(null);
      return null;
    }
    const list = await db.entities.UserProgress.filter({ user_id: me.id });
    setUserProgress(list[0] ?? null);
    return me;
  }, []);

  useEffect(() => {
    let mounted = true;
    // INITIAL_SESSION fyrer én gang ved oppstart, så et eget me()-kall i
    // tillegg er unødvendig. TOKEN_REFRESHED endrer ingen brukerdata.
    const { data } = sb.auth.onAuthStateChange(async (event, session) => {
      if (!mounted || event === 'TOKEN_REFRESHED') return;
      if (!session) {
        setUser(null);
        setUserProgress(null);
        setAuthReady(true);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') await applyPendingNewsletter(session);
      try {
        await refreshUser();
      } catch (e) {
        console.warn('Auth: kunne ikke hente bruker:', e);
      } finally {
        if (mounted) setAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, [refreshUser]);

  const logout = () => db.auth.logout();

  return (
    <AuthContext.Provider
      value={{
        user,
        userProgress,
        setUserProgress,
        isAuthenticated: !!user,
        authReady,
        refreshUser,
        logout,
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
