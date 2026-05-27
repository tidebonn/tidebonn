import { useEffect, useRef, useState } from 'react';
import db from '@/api/client';

// Antall ms før en åpen bønn telles som "påbegynt" (completed=false).
// Filtrerer bort kjappe avbrutte åpninger.
const START_THRESHOLD_MS = 5000;

/**
 * Logger to typer hendelser til prayer_logs:
 *   - "påbegynt": completed=false, logges 5 sek etter at bønnen åpnes
 *   - "fullført": completed=true, logges når brukeren scroller til bunn
 *
 * Begge er separate INSERT-rader. Anonyme brukere (uten innlogging)
 * logges med user_id=null og telles som "Ukjent" i statistikken.
 *
 * Brukes både fra /Prayers og / (Home) for å sikre lik atferd.
 *
 * @param {Object} opts
 * @param {Element|null} opts.scrollEl - scroll-container å lytte på
 * @param {Object|null} opts.prayer - prayer-objekt som logges
 * @param {Object|null} opts.user - bruker (eller null hvis uinnlogget)
 * @param {Object|null} opts.userProgress - UserProgress-rad (kun innlogget)
 * @param {Boolean} opts.showGroupMarkers - I/II-toggle på/av
 * @param {Function} opts.onCompleted - callback(prayerKey, durationMin)
 *   etter vellykket fullføringslogg
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
  const startLoggedRef = useRef(false);

  // Reset på ny bønne
  useEffect(() => {
    if (prayer) {
      setStartTime(Date.now());
      triggeredRef.current = false;
      startLoggedRef.current = false;
    }
  }, [prayer?.id]);

  // Logg "påbegynt" etter 5 sek (filtrerer bort kjappe lukkinger)
  useEffect(() => {
    if (!prayer) return;
    const prayerId = prayer.id;
    const timer = setTimeout(async () => {
      if (startLoggedRef.current || triggeredRef.current) return;
      startLoggedRef.current = true;
      try {
        const geoData = await db.geo.lookup().catch(() => ({}));
        await db.entities.PrayerLog.create({
          user_id: user?.id ?? null,
          prayer_id: prayerId,
          series_id: prayer.series_id,
          day: prayer.day,
          time_of_day: prayer.time_of_day,
          duration_minutes: 0,
          completed: false,
          used_group_markers: !!showGroupMarkers,
          location_country: geoData?.country ?? null,
          location_country_code: geoData?.country_code ?? null,
          location_city: geoData?.city ?? null,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('PrayerLog (start) feilet:', error);
        db.logError('prayer_log_insert_start', error, { prayer_id: prayerId, user_id: user?.id ?? null });
      }
    }, START_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [prayer?.id, user?.id, showGroupMarkers]);

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

        const baseRow = {
          user_id: user?.id ?? null,
          prayer_id: prayer.id,
          series_id: prayer.series_id,
          day: prayer.day,
          time_of_day: prayer.time_of_day,
          used_group_markers: !!showGroupMarkers,
          location_country: geoData?.country ?? null,
          location_country_code: geoData?.country_code ?? null,
          location_city: geoData?.city ?? null,
        };

        // Hvis 5-sek-timeren ikke rakk å fyre (rask fullføring), logg
        // "påbegynt" først så hver fullført har en matchende start.
        if (!startLoggedRef.current) {
          startLoggedRef.current = true;
          try {
            await db.entities.PrayerLog.create({ ...baseRow, duration_minutes: 0, completed: false });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('PrayerLog (start, rask) feilet:', e);
            db.logError('prayer_log_insert_fast_start', e, { prayer_id: prayer.id, user_id: user?.id ?? null });
          }
        }

        await db.entities.PrayerLog.create({ ...baseRow, duration_minutes: duration, completed: true });

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
        db.logError('prayer_log_insert_complete', error, { prayer_id: prayer.id, user_id: user?.id ?? null });
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [prayer?.id, scrollEl, startTime, user?.id, userProgress?.id, showGroupMarkers, onCompleted]);
}
