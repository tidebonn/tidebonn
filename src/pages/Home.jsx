import db from '@/api/client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

import { ArrowRight, BookOpen, Clock, Users, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PrayerContent from '@/components/prayer/PrayerContent';
import TextSizeButton from '@/components/prayer/TextSizeButton';
import { usePrayerCompleteLogger } from '@/hooks/usePrayerCompleteLogger';
import { usePhoneViewport } from '@/hooks/usePhoneViewport';
import { setLargeTextPref } from '@/lib/largeText';
import { getNextPrayer, TIME_ORDER } from '@/components/prayer/PrayerSeriesCycleUtils';

const WEEKDAY_NAMES = ['Lørdag', 'Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag'];

const timeLabels = {
  matutin: 'Matutin',
  laudes: 'Laudes',
  prim: 'Prim',
  ters: 'Ters',
  sekst: 'Middagsbønn',
  non: 'Non',
  vesper: 'Vesper',
  kompletorium: 'Kompletorium',
};

const getCurrentTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 2 && hour < 6) return 'matutin';
  if (hour >= 6 && hour < 9) return 'laudes';
  if (hour >= 9 && hour < 12) return 'ters';
  if (hour >= 12 && hour < 15) return 'sekst';
  if (hour >= 15 && hour < 17) return 'non';
  if (hour >= 17 && hour < 21) return 'vesper';
  return 'kompletorium';
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [nextPrayerLabel, setNextPrayerLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPrayerDialog, setShowPrayerDialog] = useState(false);
  const [nextSeriesTitle, setNextSeriesTitle] = useState('');
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check if user is logged in
      const isAuth = await db.auth.isAuthenticated();
      
      let loadedProgress = null;
      
      if (isAuth) {
        const currentUser = await db.auth.me();
        setUser(currentUser);
        
        // Load user progress
        const progressList = await db.entities.UserProgress.filter({ user_id: currentUser.id });
        if (progressList.length > 0) {
          loadedProgress = progressList[0];
          setUserProgress(loadedProgress);
          if (typeof loadedProgress.show_group_markers === 'boolean') {
            setShowGroupMarkers(loadedProgress.show_group_markers);
          }
          if (typeof loadedProgress.large_text === 'boolean') {
            setLargeText(loadedProgress.large_text);
            setLargeTextPref(loadedProgress.large_text);
          }
        }
      }

      // Load prayers and active series (skjuler bønner med
      // is_active=false fra brukervisning)
      const [allPrayers, allSeries] = await Promise.all([
        db.entities.Prayer.filter({ is_active: true }),
        db.entities.PrayerSeries.filter({ is_active: true })
      ]);

      // Filter prayers to only include those from active series
      const activeSeriesIds = allSeries.map(s => s.id);
      const prayers = allPrayers.filter(p => activeSeriesIds.includes(p.series_id));

      if (prayers.length > 0) {
        const seriesId = loadedProgress?.current_series_id || allSeries[0]?.id;
        const seriesData = allSeries.find(s => s.id === seriesId);
        const seriesPrayers = prayers.filter(p => p.series_id === seriesId);

        let next = null;

        if (loadedProgress && loadedProgress.follow_date === false) {
          // Brukeren har valgt manuell posisjon — ikke følg kalender.
          // Bruk current_day + current_prayer_time som «cursor» og finn
          // den bønnen, eller første som matcher i samme bønnedøgn.
          const targetDay = loadedProgress.current_day || 1;
          const targetTime = loadedProgress.current_prayer_time || 'laudes';
          const tIdx = TIME_ORDER.indexOf(targetTime);
          const sorted = [...seriesPrayers].sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day;
            return TIME_ORDER.indexOf(a.time_of_day) - TIME_ORDER.indexOf(b.time_of_day);
          });
          next = sorted.find(p =>
            p.day > targetDay || (p.day === targetDay && TIME_ORDER.indexOf(p.time_of_day) >= tIdx)
          ) || sorted[0] || null;
        } else if (seriesData) {
          // Standard: regn ut neste bønn fra kalenderdato + klokke.
          // Bruker bønnedøgn-helperen som håndterer wraparound korrekt
          // (siste bønn i bø 28 → vesper bø 1, sømløst).
          next = getNextPrayer(seriesData, seriesPrayers, new Date());
        }

        setNextPrayer(next);

        if (seriesData) setNextSeriesTitle(seriesData.title);

        if (next && seriesData) {
          if (seriesData.sort_by === 'weeks') {
            const week = Math.ceil(next.day / 7);
            setNextPrayerLabel(`Uke ${week}`);
          } else {
            setNextPrayerLabel(`Dag ${next.day}`);
          }
        }
      }
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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

            {/* Next prayer subtitle */}
            <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', fontSize: '1.1rem', color: '#B6B9B3', lineHeight: 1.7, textAlign: 'center', marginBottom: '1rem'}}>
              {nextPrayer && nextSeriesTitle
                ? `Neste bønn er ${nextPrayer.title} fra ${nextSeriesTitle}.`
                : 'Neste bønn er [navn på neste bønn] fra [navn på bønneserie].'}
            </p>

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
                onClick={() => nextPrayer ? setShowPrayerDialog(true) : db.auth.redirectToLogin()}
                className="dark:!bg-[#BD7B59]"
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
                {nextPrayer ? `Uke ${Math.ceil(nextPrayer.day / 7)} · ${WEEKDAY_NAMES[(nextPrayer.day - 1) % 7]} · ${timeLabels[nextPrayer.time_of_day] || nextPrayer.time_of_day}` : ''}
              </Badge>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-semibold text-[#1A1A1A] dark:text-white">
                  {nextPrayer?.title}
                </DialogTitle>
                <button
                  onClick={async () => {
                    const newVal = !showGroupMarkers;
                    setShowGroupMarkers(newVal);
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('tidebonn.showGroupMarkers', String(newVal));
                    }
                    if (userProgress) {
                      await db.entities.UserProgress.update(userProgress.id, { show_group_markers: newVal });
                      setUserProgress(prev => ({ ...prev, show_group_markers: newVal }));
                    }
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
                  onToggle={async () => {
                    const newVal = !largeText;
                    setLargeText(newVal);
                    setLargeTextPref(newVal);
                    if (userProgress) {
                      await db.entities.UserProgress.update(userProgress.id, { large_text: newVal });
                      setUserProgress(prev => ({ ...prev, large_text: newVal }));
                    }
                  }}
                />
              </div>
            </div>
            <DialogDescription className="sr-only">
              Tekst og veiledning for bønnen. Bla nedover for å lese hele.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {nextPrayer && (
              <PrayerContent prayer={nextPrayer} noInternalScroll showGroupMarkers={showGroupMarkers} largeText={!isPhone && largeText} />
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}