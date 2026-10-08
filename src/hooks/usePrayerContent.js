import { useState, useCallback } from 'react';
import { loadPrayerContent } from '@/lib/prayerData';

// Bønneteksten hentes først når en bønn åpnes; listene har bare metadata.
export function usePrayerContent() {
  const [content, setContent] = useState({ id: null, data: null, error: null, loading: false });

  const load = useCallback(async (id) => {
    setContent({ id, data: null, error: null, loading: true });
    try {
      const data = await loadPrayerContent(id);
      setContent({ id, data, error: null, loading: false });
    } catch (error) {
      setContent({ id, data: null, error, loading: false });
    }
  }, []);

  const ensure = useCallback(
    (id) => {
      if (content.id !== id || content.error) load(id);
    },
    [content.id, content.error, load],
  );

  return { content, load, ensure };
}
