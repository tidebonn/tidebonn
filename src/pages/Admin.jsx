import db from '@/api/client';

import React, { useState, useEffect } from 'react';

import { BarChart3, Users, BookOpen, FileEdit, Loader2, Shield } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

import Statistics from '../components/admin/Statistics';
import ClientErrorsCard from '../components/admin/ClientErrorsCard';
import PushInstallStatsCard from '../components/admin/PushInstallStatsCard';
import SeriesTab from '../components/admin/SeriesTab';
import PrayersTab from '../components/admin/PrayersTab';
import ContentTab from '../components/admin/ContentTab';
import UsersTab from '../components/admin/UsersTab';

// Admin-skall: innlogging/rolle, delt data og fanenavigasjon. Hver fane
// bor i src/components/admin/*Tab.jsx og får data + loadData som props.
export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  // Dark-mode for inline-styled aksent (tab-underline). Holdes synket
  // med .dark-klassen på <html>.
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const tabAccent = isDark ? '#BD7B59' : '#4A6B65';

  // Data states
  const [prayerLogs, setPrayerLogs] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [prayerSeries, setPrayerSeries] = useState([]);
  const [contentPages, setContentPages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allUserProgress, setAllUserProgress] = useState([]);
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const isAuth = await db.auth.isAuthenticated();
      if (!isAuth) {
        db.auth.redirectToLogin();
        return;
      }

      const currentUser = await db.auth.me();
      setUser(currentUser);

      if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
        return;
      }

      // Load all data
      const [logs, prayerData, series, pages, users, userProgress, allProgress] = await Promise.all([
        db.entities.PrayerLog.list('-created_at', 5000),
        db.entities.Prayer.list(),
        db.entities.PrayerSeries.list(),
        db.entities.ContentPage.list(),
        db.entities.User.list(),
        db.entities.UserProgress.filter({ user_id: currentUser.id }),
        db.entities.UserProgress.list()
      ]);

      setPrayerLogs(logs);
      setPrayers(prayerData);
      setPrayerSeries(series);
      // Sorter etter order_index så DnD-rekkefølgen alltid stemmer
      setContentPages(
        (pages || []).slice().sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
      );
      setAllUsers(users);
      setAllUserProgress(allProgress);

      // Set series filter to user's selected series if available
      if (userProgress.length > 0 && userProgress[0].current_series_id) {
        setSelectedSeriesFilter(userProgress[0].current_series_id);
      }
    } catch (error) {
      console.error('Admin loadData feilet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#4A6B65] animate-spin" />
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Shield className="w-16 h-16 text-[#4A6B65] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-[#2C2C2A] dark:text-[#F4F0E9] mb-4">
          Ingen tilgang
        </h2>
        <p className="text-[#6A6A6A] dark:text-gray-400">
          Du har ikke tilgang til administrasjonspanelet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              style={{fontFamily: "'Spectral', Georgia, serif", fontWeight: 300, fontSize: '2rem', marginBottom: '0.75rem'}}
              className="text-[#2C2C2A] dark:text-[#F4F0E9]"
            >
              Administrasjon
            </h1>
            <Badge style={{backgroundColor: '#CFD9D6', color: '#2C2C2A', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase'}} className="border-0">
              {user.role === 'owner' ? 'Eier' : 'Administrator'}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 bg-transparent p-0 h-auto" style={{borderBottom: '1px solid #DECCB4'}}>
            <TabsTrigger value="statistics" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3] data-[state=active]:font-semibold" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'statistics' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Statistikk</span>
            </TabsTrigger>
            <TabsTrigger value="series" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'series' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <BookOpen className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Bønneserier</span>
            </TabsTrigger>
            <TabsTrigger value="prayers" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'prayers' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <FileEdit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Bønner</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'content' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
              <FileEdit className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Innhold</span>
            </TabsTrigger>
            {user.role === 'owner' && (
              <TabsTrigger value="users" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-[#2C2C2A] dark:data-[state=active]:text-[#F4F0E9] text-[#B6B9B3]" style={{fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0.625rem 0.75rem', borderBottom: activeTab === 'users' ? `2px solid ${tabAccent}` : '2px solid transparent', marginBottom: '-1px'}}>
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Brukere</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <Statistics
              prayerLogs={prayerLogs}
              prayerSeries={prayerSeries}
              userProgressList={allUserProgress}
              totalUsers={allUsers.length}
            />
            <PushInstallStatsCard users={allUsers} />
            <ClientErrorsCard />
          </TabsContent>

          {/* Prayer Series Tab */}
          <TabsContent value="series">
            <SeriesTab user={user} prayerSeries={prayerSeries} loadData={loadData} />
          </TabsContent>

          {/* Prayers Tab */}
          <TabsContent value="prayers">
            <PrayersTab user={user} prayers={prayers} prayerSeries={prayerSeries} loadData={loadData} />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <ContentTab
              user={user}
              contentPages={contentPages}
              setContentPages={setContentPages}
              loadData={loadData}
            />
          </TabsContent>

          {/* Users Tab — kun for eiere */}
          {user.role === 'owner' && (
            <TabsContent value="users">
              <UsersTab user={user} allUsers={allUsers} loadData={loadData} />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </div>
  );
}
