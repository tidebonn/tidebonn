import { useState, useEffect } from 'react';
import db from '@/api/client';
import { setLargeTextPref } from '@/lib/largeText';

function readFlag(key) {
  try {
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
}

function writeFlag(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* localStorage utilgjengelig */
  }
}

// I/II-markører og «større tekst» i bønnevisningen. localStorage for alle
// (også uinnloggede); synkes fra brukerens progresjon når den finnes og
// lagres dit ved endring.
export function usePrayerViewPrefs({ userProgress, setUserProgress }) {
  const [showGroupMarkers, setShowGroupMarkers] = useState(() => readFlag('tidebonn.showGroupMarkers'));
  const [largeText, setLargeText] = useState(() => readFlag('tidebonn.largeText'));

  useEffect(() => {
    if (!userProgress) return;
    if (typeof userProgress.show_group_markers === 'boolean') {
      setShowGroupMarkers(userProgress.show_group_markers);
    }
    if (typeof userProgress.large_text === 'boolean') {
      setLargeText(userProgress.large_text);
      setLargeTextPref(userProgress.large_text);
    }
  }, [userProgress?.id]);

  const saveProgress = async (patch) => {
    if (!userProgress) return;
    try {
      await db.entities.UserProgress.update(userProgress.id, patch);
      setUserProgress((prev) => ({ ...prev, ...patch }));
    } catch (error) {
      console.warn('Kunne ikke lagre visningsvalg:', error);
    }
  };

  const toggleGroupMarkers = () => {
    const next = !showGroupMarkers;
    setShowGroupMarkers(next);
    writeFlag('tidebonn.showGroupMarkers', next);
    saveProgress({ show_group_markers: next });
  };

  const toggleLargeText = () => {
    const next = !largeText;
    setLargeText(next);
    setLargeTextPref(next);
    saveProgress({ large_text: next });
  };

  return { showGroupMarkers, largeText, toggleGroupMarkers, toggleLargeText };
}
