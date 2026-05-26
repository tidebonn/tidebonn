import { useEffect, useRef, useState } from 'react';
import db from '@/api/client';

/**
 * Logger en bønne-fullføring til PrayerLog når brukeren scroller helt
 * ned (innenfor 40px fra bunn) av et scroll-element.
 *
 * Brukes både fra /Prayers og / (Home) for å sikre lik atferd.
 *
 * Uinnloggede brukere logges med user_id=null (telles som "Ukjent" i
 * statistikken). Geolokasjon hentes uansett.
 *
 * @param {Object} opts
 * @param {Element|null} opts.scrollEl - scroll-container å lytte på
 * @param {Object|null} opts.prayer - prayer-objekt som logges
 * @param {Object|null} opts.user - bruker (eller null hvis uinnlogget)
 * @param {Object|null} opts.userProgress - UserProgress-rad (kun innlogget)
 * @param {Boolean} opts.showGroupMarkers - I/II-toggle på/av
 * @param {Function} opts.onCompleted - callback(prayerKey, durationMin)
 *   etter vellykket logg
 */
export function usePrayerCompleteLogger({
  scrollEl,
  prayer,
  user,
  userProgress,
  showGroupMarkers,
  onCompleted,
}) {
  const [startTime, setStartTime] = useState(null);
  const triggeredRef = useRef(false);

  // Reset på ny bønne
  useEffect(() => {
    if (prayer) {
      setStartTime(Date.now());
      triggeredRef.current = false;
    }
  }, [prayer?.id]);

  useEffect(() => {
    if (!prayer || !scrollEl) return;

    const handleScroll = async () => {
      if (triggeredRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      if (scrollTop + clientHeight < scrollHeight - 40) return;

      triggeredRef.current = true;
      const duration = Math.max(1, Math.round((Date.now() - (startTime ?? Date.now())) / 60000));

      try {
        const geoData = await db.geo.lookup().catch(() => ({}));

        await db.entities.PrayerLog.create({
          user_id: user?.id ?? null,
          prayer_id: prayer.id,
          series_id: prayer.series_id,
          day: prayer.day,
          time_of_day: prayer.time_of_day,
          duration_minutes: duration,
          completed: true,
          used_group_markers: !!showGroupMarkers,
          location_country: geoData?.country ?? null,
          location_country_code: geoData?.country_code ?? null,
          location_city: geoData?.city ?? null,
        });

        // Oppdater UserProgress kun for innloggede
        if (userProgress) {
          await db.entities.UserProgress.update(userProgress.id, {
            total_prayers_completed: (userProgress.total_prayers_completed || 0) + 1,
            total_minutes: (userProgress.total_minutes || 0) + duration,
          });
        }

        if (onCompleted) {
          const key = `${prayer.series_id}-${prayer.day}-${prayer.time_of_day}`;
          onCompleted(key, duration);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('PrayerLog feilet:', error);
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [prayer?.id, scrollEl, startTime, user?.id, userProgress?.id, showGroupMarkers, onCompleted]);
}
