import db from '@/api/client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PrayerContent from '@/components/prayer/PrayerContent';
import TextSizeButton from '@/components/prayer/TextSizeButton';
import { usePrayerCompleteLogger } from '@/hooks/usePrayerCompleteLogger';
import { usePhoneViewport } from '@/hooks/usePhoneViewport';
import { setLargeTextPref } from '@/lib/largeText';
import { timeLabel } from '@/lib/prayerTimes';
import { loadActivePrayerMeta, loadPrayerContent, readLastNext, writeLastNext } from '@/lib/prayerData';
import {
  getNextPrayer,
  getCalendarPositionForPrayer,
  START_DAY_MAP,
  WEEKDAY_NAMES_NO,
} from '@/components/prayer/PrayerSeriesCycleUtils';

const subtitleStyle = {
  fontFamily: "'Spectral', Georgia, serif",
  fontWeight: 300,
  fontStyle: 'italic',
  fontSize: '1.1rem',
  color: '#B6B9B3',
  lineHeight: 1.7,
  textAlign: 'center',
  marginBottom: '1rem',
};

const retryStyle = {
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 500,
  fontSize: '0.6rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#BD7B59',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  marginBottom: '1rem',
};

// Neste bønn i brukerens serie (eller første aktive serie).
function computeNext(publicData, progress, now = new Date()) {
  if (!publicData) return null;
  const { prayers, series } = publicData;
  const seriesId = progress?.current_series_id || series[0]?.id;
  const seriesData = series.find((s) => s.id === seriesId);
  if (!seriesData) return null;
  const next = getNextPrayer(seriesData, prayers.filter((p) => p.series_id === seriesId), now);
  return next ? { next, seriesTitle: seriesData.title, series: seriesData } : null;
}

function badgeLabel(series, prayer) {
  const time = timeLabel(prayer.time_of_day);
  if (series?.sort_by === 'weeks') {
    const { calendarWeek, calendarWeekday } = getCalendarPositionForPrayer(series, prayer.day, prayer.time_of_day);
    if (calendarWeek != null) {
      const startDow = START_DAY_MAP[series.start_day || 'saturday'];
      return `Uke ${calendarWeek} · ${WEEKDAY_NAMES_NO[(startDow + calendarWeekday) % 7]} · ${time}`;
    }
  }
  return `Dag ${prayer.day} · ${time}`;
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [publicData, setPublicData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showPrayerDialog, setShowPrayerDialog] = useState(false);
  const [content, setContent] = useState({ id: null, data: null, error: null, loading: false });
  const [prayerScrollEl, setPrayerScrollEl] = useState(null);
  // I/II-toggle: samme localStorage-fallback som /Bønner, så uinnloggede
  // også kan styre visningen.
  const [showGroupMarkers, setShowGroupMarkers] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('tidebonn.showGroupMarkers') === 'true';
  });
  // Større tekst — kun store skjermer (toggle). På telefon styres
  // størrelsen av skjermretningen via CSS.
  const [largeText, setLargeText] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('tidebonn.largeText') === 'true';
  });
  const { isPhone, isPortrait } = usePhoneViewport();
  const landscapePhone = isPhone && !isPortrait;

  // Sist kjente neste bønn vises umiddelbart, og beholdes hvis henting feiler.
  const [cached] = useState(() => (typeof window === 'undefined' ? null : readLastNext()));
  const computed = useMemo(() => computeNext(publicData, userProgress), [publicData, userProgress]);
  const display = computed || cached;
  const nextPrayer = display?.next ?? null;

  useEffect(() => {
    if (computed) writeLastNext(computed);
  }, [computed]);

  const loadPublic = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prayers, series] = await Promise.all([
        loadActivePrayerMeta(),
        db.entities.PrayerSeries.filter({ is_active: true }),
      ]);
      const activeSeriesIds = new Set(series.map((s) => s.id));
      setPublicData({ prayers: prayers.filter((p) => activeSeriesIds.has(p.series_id)), series });
    } catch (error) {
      console.warn('Home: kunne ikke hente bønner:', error);
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Brukerdata påvirker bare valg av serie og visningsvalg; feil her skal
  // aldri hindre at neste bønn vises.
  const loadUser = useCallback(async () => {
    try {
      if (!(await db.auth.isAuthenticated())) return;
      const currentUser = await db.auth.me();
      if (!currentUser) return;
      setUser(currentUser);
      const progressList = await db.entities.UserProgress.filter({ user_id: currentUser.id });
      const progress = progressList[0];
      if (!progress) return;
      setUserProgress(progress);
      if (typeof progress.show_group_markers === 'boolean') {
        setShowGroupMarkers(progress.show_group_markers);
      }
      if (typeof progress.large_text === 'boolean') {
        setLargeText(progress.large_text);
        setLargeTextPref(progress.large_text);
      }
    } catch (error) {
      console.warn('Home: brukerdata utilgjengelig:', error);
    }
  }, []);

  useEffect(() => {
    loadPublic();
    loadUser();
  }, [loadPublic, loadUser]);

  // Ett nytt forsøk når nettet eller fanen er tilbake — ingen polling.
  useEffect(() => {
    if (!loadError) return undefined;
    const retry = () => {
      if (document.visibilityState === 'visible') loadPublic();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', retry);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', retry);
    };
  }, [loadError, loadPublic]);

  const loadContent = useCallback(async (id) => {
    setContent({ id, data: null, error: null, loading: true });
    try {
      const data = await loadPrayerContent(id);
      setContent({ id, data, error: null, loading: false });
    } catch (error) {
      setContent({ id, data: null, error, loading: false });
    }
  }, []);

  const openPrayer = () => {
    if (!nextPrayer) return;
    setShowPrayerDialog(true);
    if (content.id !== nextPrayer.id || content.error) loadContent(nextPrayer.id);
  };

  const saveProgress = async (patch) => {
    if (!userProgress) return;
    try {
      await db.entities.UserProgress.update(userProgress.id, patch);
      setUserProgress((prev) => ({ ...prev, ...patch }));
    } catch (error) {
      console.warn('Home: kunne ikke lagre visningsvalg:', error);
    }
  };

  // Logg bønne-fullføring (også for uinnloggede — registreres med
  // user_id=null og telles som "Ukjent" i statistikken).
  usePrayerCompleteLogger({
    scrollEl: showPrayerDialog ? prayerScrollEl : null,
    prayer: showPrayerDialog ? nextPrayer : null,
    user,
    userProgress,
    showGroupMarkers,
    onCompleted: (_key, duration) => {
      if (userProgress) {
        setUserProgress(prev => ({
          ...prev,
          total_prayers_completed: (prev.total_prayers_completed || 0) + 1,
          total_minutes: (prev.total_minutes || 0) + duration,
        }));
      }
    },
  });

  return (
    <div className="min-h-full flex flex-col">
      {/* Hero Section — min-height = viewport minus (sticky) header og
          footer, så section'en eier den ledige plassen. Innholdet
          sentreres vertikalt og «flyter» derfor i midten uansett
          skjermhøyde. Vokser naturlig forbi om innholdet er høyere
          enn tilgjengelig plass (overflødig blir scrollbart). */}
      <section
        className="bg-[#F4F0E9] dark:bg-[#2C2C2A]"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // 3.25rem header + ca. 4rem footer = 7.25rem reserveres
          minHeight: 'calc(100dvh - 7.25rem)',
        }}
      >
        <div style={{maxWidth: '860px', margin: '0 auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '320px'}}
          >
            {/* SVG Cross - upper part */}
            <div className="text-[#4A6B65] dark:text-[#BD7B59]" style={{marginBottom: '0.75rem'}}>
            <svg width="32" height="72" viewBox="0 0 32 72">
              <circle cx="16" cy="6" r="4" fill="none" stroke="currentColor" strokeWidth="0.7"/>
              <circle cx="16" cy="6" r="1.5" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              <line x1="2" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="2" cy="22" r="2" fill="none" stroke="currentColor" strokeWidth="0.6"/>
              <circle cx="30" cy="22" r="2" fill="none" stroke="currentColor" strokeWidth="0.6"/>
              <line x1="16" y1="1" x2="16" y2="72" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            </div>

            {/* Welcome label */}
            <p style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '1.25rem', textAlign: 'center'}}>
              VELKOMMEN TIL TIDEBØNN
            </p>

            {/* Next prayer subtitle: data / laster / feil */}
            {display ? (
              <p style={subtitleStyle}>
                Neste bønn er {display.next.title} fra {display.seriesTitle}.
              </p>
            ) : loading ? (
              <div style={{ width: '100%', marginBottom: '1rem' }} aria-label="Henter neste bønn">
                <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
                <Skeleton className="h-5 w-1/2 mx-auto" />
              </div>
            ) : (
              <p style={subtitleStyle}>Kunne ikke hente neste bønn akkurat nå.</p>
            )}
            {loadError && !loading && (
              <button type="button" onClick={loadPublic} style={retryStyle}>
                {display ? 'Viser sist kjente bønn · Prøv igjen' : 'Prøv igjen'}
              </button>
            )}

            {/* Liten vertikal strek — visuell forlengelse av korset
                ovenfor, så det ses at korsets stamme fortsetter ned
                gjennom knappene og ender i den nedre dekorasjonen. */}
            <div className="text-[#4A6B65] dark:text-[#BD7B59]" style={{marginBottom: '0.75rem'}}>
              <svg width="32" height="10" viewBox="0 0 32 10" aria-hidden="true">
                <line x1="16" y1="0" x2="16" y2="10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>

            {/* Two vertical stacked buttons */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '260px'}}>
              <button
                onClick={openPrayer}
                disabled={!nextPrayer}
                className="dark:!bg-[#BD7B59] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{width: '100%', padding: '0.875rem 1.5rem', backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'}}
              >
                Be neste bønn <ArrowRight className="w-4 h-4" />
              </button>
              <Link to={createPageUrl('Prayers')} style={{width: '100%'}}>
                <button style={{width: '100%', padding: '0.875rem 1.5rem', backgroundColor: 'transparent', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer'}} className="text-[#7A9994] border border-[#7A9994] dark:text-[#BD7B59] dark:border-[#BD7B59]/60">
                  Se alle bønner
                </button>
              </Link>
            </div>

            {/* SVG Cross - lower part */}
            <div className="home-lower-cross text-[#4A6B65] dark:text-[#BD7B59]" style={{marginTop: '0.75rem'}}>
            <svg width="32" height="56" viewBox="0 0 32 56">
              <line x1="16" y1="0" x2="16" y2="55" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              <circle cx="16" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="0.6"/>
            </svg>
            </div>
          </motion.div>
        </div>
      </section>

      <Dialog open={showPrayerDialog} onOpenChange={(open) => { setShowPrayerDialog(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#1A1917] border-[#D8D0C8] dark:border-gray-800">
          <div ref={setPrayerScrollEl} className="flex-1 overflow-y-auto">
          <DialogHeader className={`text-left bg-white dark:bg-[#1A1917] ${landscapePhone ? 'pb-4' : 'sticky top-0 z-10 border-b border-[#E8E0D8] dark:border-gray-800 pb-4'}`}>
            <div>
              <Badge className="mb-2" style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase'}}>
                {nextPrayer ? badgeLabel(display.series, nextPrayer) : ''}
              </Badge>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-semibold text-[#1A1A1A] dark:text-white">
                  {nextPrayer?.title}
                </DialogTitle>
                <button
                  onClick={() => {
                    const newVal = !showGroupMarkers;
                    setShowGroupMarkers(newVal);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('tidebonn.showGroupMarkers', String(newVal));
                    }
                    saveProgress({ show_group_markers: newVal });
                  }}
                  className={`p-1.5 rounded transition-colors flex-shrink-0 text-xs font-medium ${
                    showGroupMarkers
                      ? 'bg-[#6B9EA0]/10 text-[#6B9EA0] hover:bg-[#6B9EA0]/20 dark:bg-[#BD7B59]/15 dark:text-[#BD7B59] dark:hover:bg-[#BD7B59]/25'
                      : 'hover:bg-[#F5F0EB] dark:hover:bg-gray-800 text-[#9A9A9A]'
                  }`}
                  title={showGroupMarkers ? 'Skjul gruppemarkører' : 'Vis gruppemarkører'}
                >
                  I/II
                </button>
                <TextSizeButton
                  isPhone={isPhone}
                  active={largeText}
                  onToggle={() => {
                    const newVal = !largeText;
                    setLargeText(newVal);
                    setLargeTextPref(newVal);
                    saveProgress({ large_text: newVal });
                  }}
                />
              </div>
            </div>
            <DialogDescription className="sr-only">
              Tekst og veiledning for bønnen. Bla nedover for å lese hele.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {content.loading && (
              <div className="space-y-3" aria-label="Henter bønneteksten">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            )}
            {content.error && !content.loading && (
              <div className="text-center py-6">
                <p className="text-sm text-[#6A6A6A] dark:text-gray-400 mb-3">Kunne ikke hente bønneteksten.</p>
                <button type="button" onClick={() => loadContent(nextPrayer.id)} style={retryStyle}>
                  Prøv igjen
                </button>
              </div>
            )}
            {content.data && nextPrayer && content.id === nextPrayer.id && (
              <PrayerContent
                prayer={{ ...nextPrayer, free_text_content: content.data.free_text_content }}
                noInternalScroll
                showGroupMarkers={showGroupMarkers}
                largeText={!isPhone && largeText}
              />
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
