import db from '@/api/client';

import React, { useState, useEffect, useRef } from 'react';

import { ChevronLeft, ChevronRight, BookOpen, Calendar, CalendarDays, Maximize2, Minimize2 } from 'lucide-react';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import PrayerCard from '@/components/prayer/PrayerCard';
import PrayerContent from '@/components/prayer/PrayerContent';
import { usePrayerCompleteLogger } from '@/hooks/usePrayerCompleteLogger';
import {
  TIME_ORDER,
  START_DAY_MAP,
  WEEKDAY_NAMES_NO,
  getCurrentSeriesPosition,
  getLastActiveDayInSeries,
  getLastActiveWeekInSeries
} from '@/components/prayer/PrayerSeriesCycleUtils';

const timeOptions = [
  { id: 'matutin', name: 'Matutin', short: 'M' },
  { id: 'laudes', name: 'Laudes', short: 'L' },
  { id: 'prim', name: 'Prim', short: 'P' },
  { id: 'ters', name: 'Ters', short: 'T' },
  { id: 'sekst', name: 'Sekst', short: 'S' },
  { id: 'non', name: 'Non', short: 'N' },
  { id: 'vesper', name: 'Vesper', short: 'V' },
  { id: 'kompletorium', name: 'Kompletorium', short: 'K' },
];

const NORWEGIAN_DAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const NORWEGIAN_MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

function formatNorwegianDate(date) {
  const dayName = WEEKDAY_NAMES_NO[date.getDay()];
  const day = date.getDate();
  const month = NORWEGIAN_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName} ${day}. ${month} ${year}`;
}

export default function Prayers() {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [prayerSeries, setPrayerSeries] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [completedPrayers, setCompletedPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Gruppemarkører-toggle: lagres til UserProgress når innlogget, ellers
  // til localStorage så uinnloggede også kan styre visningen.
  const [showGroupMarkers, setShowGroupMarkers] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('tidebonn.showGroupMarkers') === 'true';
  });

  // Navigation state
  const [selectedDay, setSelectedDay] = useState(1);         // for days-mode
  const [selectedWeek, setSelectedWeek] = useState(1);       // for weeks-mode
  const [selectedWeekday, setSelectedWeekday] = useState(0); // 0-6 offset from start_day
  const [selectedTime, setSelectedTime] = useState('laudes');

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Prayer dialog
  const [selectedPrayer, setSelectedPrayer] = useState(null);
  const [prayerFullscreen, setPrayerFullscreen] = useState(false);
  // Callback-ref via useState: Radix Dialog mounter innholdet asynkront
  // (animasjon / portal), så vanlig useRef er null på effect-tid. State
  // trigger effecten på nytt når DOM-en finnes.
  const [prayerScrollEl, setPrayerScrollEl] = useState(null);
  // Husk om initial load hadde URL-params, så vi ikke overskriver
  // dem når selectedSeries blir satt i useEffect [selectedSeries].
  const initialUrlParamsRef = useRef(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dayParam = urlParams.get('day');
    const timeParam = urlParams.get('time');
    if (dayParam || timeParam) initialUrlParamsRef.current = true;
    if (dayParam) setSelectedDay(parseInt(dayParam));
    if (timeParam) setSelectedTime(timeParam);
    loadData(dayParam ? parseInt(dayParam) : null, timeParam);
  }, []);

  const loadData = async (urlDay, urlTime) => {
    try {
      const isAuth = await db.auth.isAuthenticated();
      const allSeries = await db.entities.PrayerSeries.filter({ is_active: true });
      setPrayerSeries(allSeries);

      let chosenSeriesId = allSeries[0]?.id;

      if (isAuth) {
        const currentUser = await db.auth.me();
        setUser(currentUser);
        const progressList = await db.entities.UserProgress.filter({ user_id: currentUser.id });
        if (progressList.length > 0) {
          let progress = progressList[0];
          setUserProgress(progress);
          if (progress.current_series_id) chosenSeriesId = progress.current_series_id;
          if (typeof progress.show_group_markers === 'boolean') {
            setShowGroupMarkers(progress.show_group_markers);
          }
        }
        const logs = await db.entities.PrayerLog.filter({ user_id: currentUser.id, completed: true });
        setCompletedPrayers(logs.map(l => `${l.series_id}-${l.day}-${l.time_of_day}`));
      }

      setSelectedSeries(chosenSeriesId);

      // Filter ut bønner som er skjult i admin (is_active=false) eller
      // som tilhører skjult serie. allSeries inneholder bare aktive
      // serier, så en bønn fra en skjult serie får ikke matche.
      const allPrayers = await db.entities.Prayer.filter({ is_active: true });
      const activeSeriesIds = new Set(allSeries.map(s => s.id));
      const activePrayers = allPrayers.filter(
        p => !p.deleted_at && activeSeriesIds.has(p.series_id)
      );
      setPrayers(activePrayers);

      // Auto-navigate to current position in series
      if (!urlDay && !urlTime) {
        const seriesData = allSeries.find(s => s.id === chosenSeriesId);
        if (seriesData) {
          applyCurrentPosition(seriesData);
        }
      }
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyCurrentPosition = (seriesData, targetDate = new Date()) => {
    const pos = getCurrentSeriesPosition(seriesData, targetDate);
    const available = seriesData.available_prayer_times;
    let time = pos.currentTime;
    if (available && available.length > 0 && !available.includes(time)) {
      // Find the next available time after the computed one
      const idx = TIME_ORDER.indexOf(time);
      let found = false;
      for (let i = idx + 1; i < TIME_ORDER.length; i++) {
        if (available.includes(TIME_ORDER[i])) { time = TIME_ORDER[i]; found = true; break; }
      }
      if (!found) {
        for (let i = 0; i < idx; i++) {
          if (available.includes(TIME_ORDER[i])) { time = TIME_ORDER[i]; break; }
        }
      }
    }
    setSelectedTime(time);
    if (seriesData.sort_by === 'weeks') {
      setSelectedWeek(pos.week || 1);
      setSelectedWeekday(pos.weekdayOffset ?? 0);
    } else {
      setSelectedDay(pos.seriesDayNumber);
    }
  };

  // Derived values
  const currentSeriesData = prayerSeries.find(s => s.id === selectedSeries);
  const isWeekMode = currentSeriesData?.sort_by === 'weeks';
  const availableTimes = currentSeriesData?.available_prayer_times || timeOptions.map(t => t.id);
  const filteredTimeOptions = timeOptions.filter(t => availableTimes.includes(t.id));

  const seriesPrayers = prayers.filter(p => p.series_id === selectedSeries);

  // Determine actual last active week/day (skip empty trailing weeks)
  const lastActiveDay = getLastActiveDayInSeries(seriesPrayers);
  const lastActiveWeek = getLastActiveWeekInSeries(seriesPrayers);
  const totalWeeks = isWeekMode ? (lastActiveWeek || currentSeriesData?.total_weeks || 4) : null;
  const totalDays = !isWeekMode ? (lastActiveDay || currentSeriesData?.total_days || 30) : null;

  // For week mode: build ordered weekdays starting from start_day
  const seriesStartDayOfWeek = START_DAY_MAP[currentSeriesData?.start_day || 'saturday'];
  const orderedWeekdays = Array.from({ length: 7 }, (_, i) => (seriesStartDayOfWeek + i) % 7);

  const effectiveDay = isWeekMode
    ? (selectedWeek - 1) * 7 + (selectedWeekday ?? 0) + 1
    : selectedDay;

  const filteredPrayers = seriesPrayers.filter(p => p.day === effectiveDay);
  const currentPrayer = filteredPrayers.find(p => p.time_of_day === selectedTime);

  // Reset selectors when series changes (manuelt valg i dropdown).
  // Skipper første gang hvis URL hadde day/time-params — da skal
  // de respekteres i stedet for å bli overskrevet av dagens posisjon.
  // I uke-modus konverteres day (1-28) til week + weekday her, siden
  // vi nå vet seriens sort_by.
  useEffect(() => {
    if (!currentSeriesData) return;
    if (initialUrlParamsRef.current) {
      initialUrlParamsRef.current = false;
      if (currentSeriesData.sort_by === 'weeks') {
        // selectedDay holder URL-paramet 'day' (1-28). Konverter.
        const d = selectedDay;
        if (d > 0) {
          setSelectedWeek(Math.floor((d - 1) / 7) + 1);
          setSelectedWeekday((d - 1) % 7);
        }
      }
      return;
    }
    applyCurrentPosition(currentSeriesData);
  }, [selectedSeries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigation helpers
  const goToPrevDay = () => {
    if (isWeekMode) {
      if (selectedWeekday > 0) {
        setSelectedWeekday(prev => prev - 1);
      } else if (selectedWeek > 1) {
        setSelectedWeek(prev => prev - 1);
        setSelectedWeekday(6);
      } else {
        setSelectedWeek(totalWeeks);
        setSelectedWeekday(6);
      }
    } else {
      setSelectedDay(prev => prev > 1 ? prev - 1 : totalDays);
    }
  };

  const goToNextDay = () => {
    if (isWeekMode) {
      if (selectedWeekday < 6) {
        setSelectedWeekday(prev => prev + 1);
      } else if (selectedWeek < totalWeeks) {
        setSelectedWeek(prev => prev + 1);
        setSelectedWeekday(0);
      } else {
        setSelectedWeek(1);
        setSelectedWeekday(0);
      }
    } else {
      setSelectedDay(prev => prev < totalDays ? prev + 1 : 1);
    }
  };

  const openPrayer = (prayer) => {
    setSelectedPrayer(prayer);
  };

  const closePrayer = () => {
    setSelectedPrayer(null);
  };

  // Automatisk bønne-fullføring når brukeren har scrollet til bunn
  // (innenfor 40px). Logger til PrayerLog uansett innlogging, og
  // oppdaterer UserProgress for innloggede. Anonyme logges med
  // user_id=null og telles som "Ukjent" i statistikken.
  usePrayerCompleteLogger({
    scrollEl: prayerScrollEl,
    prayer: selectedPrayer,
    user,
    userProgress,
    showGroupMarkers,
    onCompleted: (key, duration) => {
      setCompletedPrayers(prev => [...prev, key]);
      if (userProgress) {
        setUserProgress(prev => ({
          ...prev,
          total_prayers_completed: (prev.total_prayers_completed || 0) + 1,
          total_minutes: (prev.total_minutes || 0) + duration,
        }));
      }
    },
  });

  const isPrayerCompleted = (prayer) => {
    return completedPrayers.includes(`${prayer.series_id}-${prayer.day}-${prayer.time_of_day}`);
  };

  const currentDayLabel = isWeekMode
    ? `Uke ${selectedWeek} – ${WEEKDAY_NAMES_NO[orderedWeekdays[selectedWeekday ?? 0]]}`
    : `Dag ${effectiveDay}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Today's date bar */}
      <div className="mb-4 flex items-center gap-2">
        <span style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontStyle: 'italic', fontSize: '0.95rem', color: '#B6B9B3'}}>{formatNorwegianDate(new Date())}</span>
        {currentSeriesData && (
          <div className="ml-auto flex items-center gap-3">
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <button style={{display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B6B9B3', background: 'none', border: 'none', cursor: 'pointer'}}>
                  <CalendarDays className="w-3.5 h-3.5" />
                  Planlegg
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarPicker
                  mode="single"
                  selected={undefined}
                  onSelect={(date) => {
                    if (date) {
                      applyCurrentPosition(currentSeriesData, date);
                      setShowDatePicker(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <button
              onClick={() => applyCurrentPosition(currentSeriesData)}
              style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#BD7B59', background: 'none', border: 'none', cursor: 'pointer'}}
            >
              Gå til i dag
            </button>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9]">
          Bønner
        </h1>
      </div>

      {/* Series Selector */}
      {prayerSeries.length > 0 && (
        <div className="mb-6">
          <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.5rem'}}>Bønneserie</h2>
          <Select value={selectedSeries} onValueChange={setSelectedSeries}>
            <SelectTrigger style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300}} className="border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)] dark:text-[#F4F0E9]">
              <SelectValue placeholder="Velg bønneserie" />
            </SelectTrigger>
            <SelectContent>
              {prayerSeries.map(series => (
                <SelectItem key={series.id} value={series.id}>{series.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Day / Week Navigation */}
      {isWeekMode ? (
        <>
          {/* Week selector – only show weeks that have prayers */}
          <div className="mb-4">
            <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.5rem'}}>Uke i bønneserien</h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setSelectedWeek(prev => prev > 1 ? prev - 1 : totalWeeks)} className="border-[#E8E0D8] dark:border-gray-700 shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => (
                    <button
                      key={week}
                      onClick={() => setSelectedWeek(week)}
                      style={week === selectedWeek ? {padding: '0 1rem', height: '2.25rem', backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.06em', border: 'none', cursor: 'pointer', flexShrink: 0, textTransform: 'uppercase'} : {padding: '0 1rem', height: '2.25rem', backgroundColor: 'transparent', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', border: '0.5px solid #B6B9B3', cursor: 'pointer', flexShrink: 0, textTransform: 'uppercase'}}
                    className={week === selectedWeek ? 'dark:!bg-[#BD7B59]' : 'text-[#2C2C2A] dark:text-[rgba(244,240,233,0.65)] dark:border-[rgba(244,240,233,0.25)]'}
                  >
                      Uke {week}
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => setSelectedWeek(prev => prev < totalWeeks ? prev + 1 : 1)} className="border-[#E8E0D8] dark:border-gray-700 shrink-0">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Weekday selector – always show all 7 */}
          <div className="mb-5">
            <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.5rem'}}>Dag i uken</h2>
            <div className="flex flex-wrap gap-2">
              {orderedWeekdays.map((jsDay, offset) => (
                <button
                  key={offset}
                  onClick={() => setSelectedWeekday(offset)}
                  style={offset === (selectedWeekday ?? 0) ? {padding: '0 0.75rem', height: '2.25rem', backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.06em', border: 'none', cursor: 'pointer', textTransform: 'uppercase'} : {padding: '0 0.75rem', height: '2.25rem', backgroundColor: 'transparent', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', border: '0.5px solid #B6B9B3', cursor: 'pointer', textTransform: 'uppercase'}}
                  className={offset === (selectedWeekday ?? 0) ? 'dark:!bg-[#BD7B59]' : 'text-[#2C2C2A] dark:text-[rgba(244,240,233,0.65)] dark:border-[rgba(244,240,233,0.25)]'}
                >
                  {WEEKDAY_NAMES_NO[jsDay]}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mb-5">
          <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.5rem'}}>Dag i bønneserien</h2>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goToPrevDay} className="border-[#E8E0D8] dark:border-gray-700 shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    style={day === selectedDay ? {width: '2.25rem', height: '2.25rem', backgroundColor: '#4A6B65', color: '#F4F0E9', fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.6rem', letterSpacing: '0.06em', border: 'none', cursor: 'pointer', flexShrink: 0} : {width: '2.25rem', height: '2.25rem', backgroundColor: 'transparent', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', border: '0.5px solid #B6B9B3', cursor: 'pointer', flexShrink: 0}}
                    className={day === selectedDay ? 'dark:!bg-[#BD7B59]' : 'text-[#2C2C2A] dark:text-[rgba(244,240,233,0.65)] dark:border-[rgba(244,240,233,0.25)]'}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={goToNextDay} className="border-[#E8E0D8] dark:border-gray-700 shrink-0">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Time Selector */}
      <div className="mb-7">
        <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.5rem'}}>Tidebønn</h2>
        <div className="overflow-x-auto">
          <Tabs value={selectedTime} onValueChange={setSelectedTime}>
            <TabsList className="inline-flex bg-[#F5F0EB] dark:bg-[#2A2A2A] p-1 h-auto">
              {filteredTimeOptions.map(time => (
                <TabsTrigger
                  key={time.id}
                  value={time.id}
                  style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase'}}
                  className="py-2 px-3 data-[state=active]:bg-[#4A6B65] dark:data-[state=active]:bg-[#BD7B59] data-[state=active]:text-[#F4F0E9] data-[state=inactive]:text-[#B6B9B3] data-[state=inactive]:bg-transparent"
                >
                  <span className="hidden sm:inline">{time.name}</span>
                  <span className="sm:hidden">{time.short}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Prayer Display */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="p-4 border-[#E8E0D8] dark:border-gray-800">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </Card>
          ))}
        </div>
      ) : currentPrayer ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${effectiveDay}-${selectedTime}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PrayerCard
              prayer={currentPrayer}
              isCompleted={isPrayerCompleted(currentPrayer)}
              onClick={() => openPrayer(currentPrayer)}
            />
          </motion.div>
        </AnimatePresence>
      ) : (
        <Card className="p-8 text-center border-[#E8E0D8] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <h3 className="text-xl font-semibold text-[#1A1A1A] dark:text-white mb-2">
            Ingen bønn funnet
          </h3>
          <p className="text-[#6A6A6A] dark:text-gray-400">
            Det finnes ingen bønn for {currentDayLabel}, {timeOptions.find(t => t.id === selectedTime)?.name}.
          </p>
        </Card>
      )}

      {/* Other prayers for this day */}
      {filteredPrayers.filter(p => p.time_of_day !== selectedTime).length > 0 && (
        <div className="mt-8">
          <h2 style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B6B9B3', marginBottom: '0.75rem'}}>Andre bønner for {currentDayLabel}</h2>
          <div>
            {filteredPrayers
              .filter(p => p.time_of_day !== selectedTime)
              .slice()
              .sort(
                (a, b) =>
                  TIME_ORDER.indexOf(a.time_of_day) -
                  TIME_ORDER.indexOf(b.time_of_day)
              )
              .map(prayer => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  isCompleted={isPrayerCompleted(prayer)}
                  onClick={() => openPrayer(prayer)}
                  compact
                />
              ))}
          </div>
        </div>
      )}

      {/* Prayer Dialog */}
      <Dialog open={!!selectedPrayer} onOpenChange={(open) => { if (!open) { closePrayer(); setPrayerFullscreen(false); } }}>
        <DialogContent className={prayerFullscreen
          ? "max-w-none w-screen h-screen m-0 rounded-none flex flex-col overflow-hidden bg-white dark:bg-[#1A1917]"
          : "max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#1A1917] border-[#D8D0C8] dark:border-gray-800"
        }>
          <DialogHeader className="border-b border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] pb-4 flex-shrink-0 text-left">
            <div>
              <Badge className="mb-2" style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase'}}>
                {currentDayLabel} • {timeOptions.find(t => t.id === selectedPrayer?.time_of_day)?.name}
              </Badge>
              <div className="flex items-center gap-2">
              <DialogTitle
                style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '1.5rem'}}
                className="text-[#2C2C2A] dark:text-[#F4F0E9]"
              >
                {selectedPrayer?.title}
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
                    ? 'bg-[#4A6B65]/10 text-[#4A6B65] hover:bg-[#4A6B65]/20 dark:bg-[#BD7B59]/15 dark:text-[#BD7B59] dark:hover:bg-[#BD7B59]/25'
                    : 'hover:bg-[#F4F0E9] dark:hover:bg-gray-800 text-[#B6B9B3]'
                }`}
                title={showGroupMarkers ? 'Skjul gruppemarkører' : 'Vis gruppemarkører'}
              >
                I/II
              </button>
              <button
                onClick={() => setPrayerFullscreen(f => !f)}
                className="p-1.5 rounded hover:bg-[#F4F0E9] dark:hover:bg-gray-800 text-[#B6B9B3] transition-colors flex-shrink-0"
                title={prayerFullscreen ? 'Avslutt fullskjerm' : 'Fullskjerm'}
              >
                {prayerFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Tekst og veiledning for bønnen. Bla nedover for å lese hele.
            </DialogDescription>
          </DialogHeader>
          <div ref={setPrayerScrollEl} className="flex-1 overflow-y-auto py-4">
            {selectedPrayer && (
              <PrayerContent prayer={selectedPrayer} noInternalScroll showGroupMarkers={showGroupMarkers} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}