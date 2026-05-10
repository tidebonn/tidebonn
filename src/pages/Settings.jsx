import db from '@/api/client';

import React, { useState, useEffect } from 'react';

import { User, Moon, Sun, Monitor, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [prayerSeries, setPrayerSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [theme, setTheme] = useState('system');
  const [selectedSeries, setSelectedSeries] = useState('');

  // For incomplete prayers section
  const [seriesPrayers, setSeriesPrayers] = useState([]);
  const [completedLogs, setCompletedLogs] = useState([]);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [loadingIncomplete, setLoadingIncomplete] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await db.auth.isAuthenticated();
      if (!isAuth) { db.auth.redirectToLogin(); return; }

      const currentUser = await db.auth.me();
      setUser(currentUser);
      setDisplayName(currentUser.display_name || currentUser.full_name || '');

      const progressList = await db.entities.UserProgress.filter({ user_id: currentUser.id });
      if (progressList.length > 0) {
        const progress = progressList[0];
        setUserProgress(progress);
        setTheme(progress.theme || 'system');
        setSelectedSeries(progress.current_series_id || '');
        setGender(progress.gender || '');
        setBirthDate(progress.birth_date || '');
      }

      const series = await db.entities.PrayerSeries.filter({ is_active: true });
      setPrayerSeries(series);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadIncompleteData = async () => {
    if (!user || !selectedSeries || loadingIncomplete) return;
    setLoadingIncomplete(true);
    try {
      const [allPrayers, logs] = await Promise.all([
        db.entities.Prayer.filter({ series_id: selectedSeries }),
        db.entities.PrayerLog.filter({ user_id: user.id, series_id: selectedSeries, completed: true })
      ]);
      setSeriesPrayers(allPrayers.filter(p => !p.deleted_at));
      setCompletedLogs(logs);
    } catch (e) {
      console.log(e);
    } finally {
      setLoadingIncomplete(false);
    }
  };

  const handleShowIncomplete = () => {
    const next = !showIncomplete;
    setShowIncomplete(next);
    if (next && seriesPrayers.length === 0) loadIncompleteData();
  };

  const saveSettings = async (updates = {}) => {
    try {
      await db.auth.updateMe({
        display_name: displayName,
        ...updates.user
      });

      const progressData = {
        user_id: user.id,
        theme,
        current_series_id: selectedSeries,
        gender: gender || null,
        birth_date: birthDate || null,
        ...updates.progress
      };

      if (userProgress) {
        await db.entities.UserProgress.update(userProgress.id, progressData);
      } else {
        const created = await db.entities.UserProgress.create(progressData);
        setUserProgress(created);
      }

      toast.success('Innstillinger lagret');
      if (updates.progress?.theme) setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Settings.saveSettings feilet:', error);
      toast.error('Kunne ikke lagre');
    }
  };

  // Compute incomplete prayers
  const completedKeys = new Set(completedLogs.map(l => `${l.day}-${l.time_of_day}`));
  const incompletePrayers = seriesPrayers
    .filter(p => !completedKeys.has(`${p.day}-${p.time_of_day}`))
    .sort((a, b) => a.day - b.day);

  const completedCount = seriesPrayers.length - incompletePrayers.length;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-[#E8E0D8] dark:border-gray-800">
            <CardHeader><div className="h-6 w-32 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" /></CardHeader>
            <CardContent><div className="h-20 bg-[#E8E0D8] dark:bg-gray-800 rounded animate-pulse" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold text-[#1A1A1A] dark:text-white mb-4">Logg inn for å se innstillinger</h2>
        <Button onClick={() => db.auth.redirectToLogin()} className="bg-[#6B9EA0] hover:bg-[#4D8082]">Logg inn</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem'}} className="text-[#2C2C2A] dark:text-[#F4F0E9] mb-2">Oppsett</h1>
        <p style={{color: '#B6B9B3', fontFamily: "'Spectral', Georgia, serif", fontWeight: 300}} className="mb-8">Tilpass din bønneopplevelse</p>

        <div className="space-y-6">
          {/* Personal Info */}
          <Card className="bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                <User className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
                Personlig informasjon
              </CardTitle>
              <CardDescription>Din profil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="displayName">Visningsnavn</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => saveSettings({ user: { display_name: displayName } })}
                  placeholder="Ditt navn"
                  className="mt-1 border-[#E8E0D8] dark:border-gray-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kjønn (valgfritt)</Label>
                  <Select value={gender} onValueChange={(val) => { setGender(val); saveSettings({ progress: { gender: val } }); }}>
                    <SelectTrigger className="mt-1 border-[#E8E0D8] dark:border-gray-700">
                      <SelectValue placeholder="Ikke oppgitt" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mann">Mann</SelectItem>
                      <SelectItem value="kvinne">Kvinne</SelectItem>
                      <SelectItem value="annet">Ikke oppgitt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="birthDate">Fødselsdato (valgfritt)</Label>
                  <Input
                   id="birthDate"
                   type={birthDate ? 'date' : 'text'}
                   value={birthDate}
                   placeholder="Ikke oppgitt"
                   onFocus={(e) => { e.target.type = 'date'; }}
                   onBlur={(e) => {
                     if (!birthDate) e.target.type = 'text';
                     saveSettings({ progress: { birth_date: birthDate || null } });
                   }}
                   onChange={(e) => setBirthDate(e.target.value)}
                   className="mt-1 border-[#E8E0D8] dark:border-gray-700"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme */}
          <Card className="bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                <Sun className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
                Utseende
              </CardTitle>
              <CardDescription>Velg fargetema for appen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'light', icon: Sun, label: 'Lys' },
                  { value: 'dark', icon: Moon, label: 'Mørk' },
                  { value: 'system', icon: Monitor, label: 'Auto' }
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => { setTheme(value); saveSettings({ progress: { theme: value } }); }}
                    className={theme === value ? 'dark:!border-[#BD7B59]' : ''}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      backgroundColor: 'transparent',
                      border: theme === value ? '1.5px solid #4A6B65' : '0.5px solid #B6B9B3',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon className={`w-6 h-6 ${theme === value ? 'text-[#4A6B65] dark:text-[#BD7B59]' : 'text-[#B6B9B3]'}`} />
                    <span style={{fontFamily: "'Montserrat', sans-serif", fontWeight: theme === value ? 600 : 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase'}} className={theme === value ? 'text-[#4A6B65] dark:text-[#BD7B59]' : 'text-[#B6B9B3]'}>{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Prayer Series */}
          <Card className="bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase'}}>
                <BookOpen className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
                Bønneprogresjon
              </CardTitle>
              <CardDescription>Velg aktiv bønneserie</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {prayerSeries.length > 0 && (
                <div>
                  <Label>Bønneserie</Label>
                  <Select value={selectedSeries} onValueChange={(val) => { setSelectedSeries(val); saveSettings({ progress: { current_series_id: val } }); }}>
                    <SelectTrigger className="mt-1 border-[#E8E0D8] dark:border-gray-700">
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

              {/* Statistics */}
              {userProgress && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 text-center bg-[#F4F0E9] dark:bg-[rgba(255,255,255,0.04)] border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
                    <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem'}} className="text-[#4A6B65] dark:text-[#BD7B59]">{userProgress.total_prayers_completed || 0}</p>
                    <p style={{fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B6B9B3'}} className="mt-0.5">Bønner fullført</p>
                  </div>
                  <div className="p-4 text-center bg-[#F4F0E9] dark:bg-[rgba(255,255,255,0.04)] border border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)]">
                    <p style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem'}} className="text-[#4A6B65] dark:text-[#BD7B59]">{userProgress.total_minutes || 0}</p>
                    <p style={{fontFamily: "'Montserrat', sans-serif", fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#B6B9B3'}} className="mt-0.5">Minutter i bønn</p>
                  </div>
                </div>
              )}

              {/* Incomplete prayers toggle */}
              {selectedSeries && user && (
                <div>
                  <button
                    onClick={handleShowIncomplete}
                    className="flex items-center gap-2 text-sm text-[#6A6A6A] dark:text-gray-400 hover:text-[#C8602A] transition-colors"
                  >
                    {showIncomplete ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {loadingIncomplete ? 'Laster...' : `Ikke fullførte bønner i serien`}
                  </button>

                  {showIncomplete && !loadingIncomplete && (
                    <div className="mt-3">
                      {seriesPrayers.length > 0 && (
                        <p className="text-xs text-[#6A6A6A] dark:text-gray-500 mb-2">
                          {completedCount} av {seriesPrayers.length} fullført
                        </p>
                      )}
                      {incompletePrayers.length === 0 ? (
                        <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">
                          Alle bønner i serien er fullført 🙏
                        </p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                          {incompletePrayers.slice(0, 30).map(prayer => (
                            <Link
                              key={prayer.id}
                              to={createPageUrl(`Prayers?day=${prayer.day}&time=${prayer.time_of_day}`)}
                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[#E8E3DC] dark:hover:bg-[#1A1917] transition-colors group"
                            >
                              <span className="text-sm text-[#4A4A4A] dark:text-gray-300 truncate">{prayer.title}</span>
                              <span className="text-xs text-[#9A9A9A] dark:text-gray-500 ml-2 shrink-0">
                                Dag {prayer.day}
                              </span>
                            </Link>
                          ))}
                          {incompletePrayers.length > 30 && (
                            <p className="text-xs text-[#9A9A9A] dark:text-gray-500 pt-1 pl-2">
                              + {incompletePrayers.length - 30} til
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}