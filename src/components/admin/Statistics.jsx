import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, MapPin, BookOpen, TrendingUp, CheckCircle, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#6B9EA0', '#C8602A', '#89B5B7', '#4D8082', '#A8CBCD', '#E8A87C', '#2D6A6C', '#F0C9A0'];

const PERIOD_OPTIONS = [
  { id: 'all', label: 'Totalt' },
  { id: 'year', label: 'Siste år' },
  { id: 'month', label: 'Siste måned' },
  { id: 'week', label: 'Siste uke' },
  { id: 'day', label: 'Siste døgn' },
];

function filterByPeriod(logs, period) {
  if (period === 'all') return logs;
  const now = new Date();
  const cutoff = new Date();
  if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
  else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
  else if (period === 'week') cutoff.setDate(now.getDate() - 7);
  else if (period === 'day') cutoff.setDate(now.getDate() - 1);
  return logs.filter(l => new Date(l.created_date) >= cutoff);
}

function StatCard({ icon: Icon, label, value, sub, color = '#6B9EA0' }) {
  return (
    <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#6A6A6A] dark:text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold" style={{ color }}>{value}</p>
            {sub && <p className="text-xs text-[#6A6A6A] dark:text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Statistics({ prayerLogs, prayerSeries, userProgressList = [], totalUsers }) {
  const [period, setPeriod] = useState('all');

  const filtered = useMemo(() => filterByPeriod(prayerLogs, period), [prayerLogs, period]);

  const stats = useMemo(() => {
    const totalPrayers = filtered.length;
    const completed = filtered.filter(l => l.completed).length;
    const totalMinutes = filtered.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const uniqueUsers = new Set(filtered.map(l => l.user_id)).size;

    const now = new Date();
    const active24h = new Set(prayerLogs.filter(l => new Date(l.created_date) >= new Date(now - 86400000)).map(l => l.user_id)).size;
    const active7d = new Set(prayerLogs.filter(l => new Date(l.created_date) >= new Date(now - 7 * 86400000)).map(l => l.user_id)).size;
    const active30d = new Set(prayerLogs.filter(l => new Date(l.created_date) >= new Date(now - 30 * 86400000)).map(l => l.user_id)).size;
    const totalRegistered = userProgressList.length;

    // By time of day – antall bønner BEDT (fra PrayerLog)
    const timeMap = {};
    filtered.forEach(l => {
      const t = l.time_of_day || 'ukjent';
      timeMap[t] = (timeMap[t] || 0) + 1;
    });
    const byTime = Object.entries(timeMap)
      .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
      .sort((a, b) => b.count - a.count);

    // By series – antall bønner BEDT (fra PrayerLog)
    const seriesMap = {};
    filtered.forEach(l => {
      const s = prayerSeries.find(s => s.id === l.series_id);
      const name = s?.title || 'Ukjent';
      seriesMap[name] = (seriesMap[name] || 0) + 1;
    });
    const bySeries = Object.entries(seriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // By country – fra PrayerLog (API-basert geolokasjon, ikke oppsett)
    const countryMap = {};
    filtered.forEach(l => {
      const c = l.location_country || 'Ukjent';
      countryMap[c] = (countryMap[c] || 0) + 1;
    });
    const byCountry = Object.entries(countryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // By city – fra PrayerLog (API-basert geolokasjon, ikke oppsett)
    const cityMap = {};
    filtered.forEach(l => {
      if (l.location_city) cityMap[l.location_city] = (cityMap[l.location_city] || 0) + 1;
    });
    const byCity = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Daily activity – følger valgt periode
    const days = {};
    filtered.forEach(l => {
      const d = new Date(l.created_date).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' });
      days[d] = (days[d] || 0) + 1;
    });
    const dailyActivity = Object.entries(days)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        const [ad, am] = a.date.split('.').map(Number);
        const [bd, bm] = b.date.split('.').map(Number);
        return am !== bm ? am - bm : ad - bd;
      });

    // Gender distribution – fra UserProgress (brukerprofil)
    const genderMap = { mann: 0, kvinne: 0, 'ikke oppgitt': 0 };
    userProgressList.forEach(p => {
      const g = p.gender;
      if (g === 'mann') genderMap['mann']++;
      else if (g === 'kvinne') genderMap['kvinne']++;
      else if (g === 'annet') genderMap['ikke oppgitt']++;
      else genderMap['ikke oppgitt']++;
    });
    const byGender = Object.entries(genderMap)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .filter(d => d.value > 0);

    // Age distribution – fra UserProgress (beregnet fra fødselsdato)
    const currentYear = new Date().getFullYear();
    const ageBuckets = { '< 18': 0, '18–29': 0, '30–44': 0, '45–59': 0, '60+': 0, 'Ikke oppgitt': 0 };
    userProgressList.forEach(p => {
      if (!p.birth_date) { ageBuckets['Ikke oppgitt']++; return; }
      const age = currentYear - new Date(p.birth_date).getFullYear();
      if (age < 18) ageBuckets['< 18']++;
      else if (age < 30) ageBuckets['18–29']++;
      else if (age < 45) ageBuckets['30–44']++;
      else if (age < 60) ageBuckets['45–59']++;
      else ageBuckets['60+']++;
    });
    const byAge = Object.entries(ageBuckets)
      .map(([name, count]) => ({ name, count }))
      .filter(d => d.count > 0);

    return {
      totalPrayers, completed, totalMinutes, uniqueUsers,
      active24h, active7d, active30d, totalRegistered,
      byTime, bySeries, byCountry, byCity, dailyActivity,
      byGender, byAge
    };
  }, [filtered, prayerLogs, prayerSeries, userProgressList]);

  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}t ${mins}m` : `${mins}m`;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setPeriod(opt.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              period === opt.id
                ? 'bg-[#6B9EA0] text-white'
                : 'bg-[#E8E3DC] dark:bg-[#2A2A2A] text-[#4A4A4A] dark:text-gray-300 hover:bg-[#DDD8D0]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Bønner totalt" value={stats.totalPrayers} />
        <StatCard icon={CheckCircle} label="Fullført" value={stats.completed} sub={stats.totalPrayers > 0 ? `${Math.round(stats.completed / stats.totalPrayers * 100)}%` : '–'} color="#C8602A" />
        <StatCard icon={Clock} label="Tid i bønn" value={timeStr} sub={`${stats.totalMinutes} minutter`} color="#4D8082" />
        <StatCard icon={Users} label="Unike brukere" value={stats.uniqueUsers} sub={totalUsers > 0 ? `${totalUsers} brukere totalt` : undefined} />
      </div>

      {/* Active users */}
      <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#6B9EA0]" />
            Aktive brukere
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#6B9EA0]">{stats.active24h}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 24 timer</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#6B9EA0]">{stats.active7d}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 7 dager</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#6B9EA0]">{stats.active30d}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 30 dager</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily activity chart */}
      {stats.dailyActivity.length > 0 && (
        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm">Daglig aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
                <XAxis dataKey="date" stroke="#6A6A6A" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#6B9EA0" strokeWidth={2} dot={false} name="Bønner" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* By time of day */}
        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm">Bønner bedt per tidebønn</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.byTime} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
                <XAxis type="number" stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#6A6A6A" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#6B9EA0" radius={[0, 4, 4, 0]} name="Antall" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By series */}
        {stats.bySeries.length > 0 && (
          <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
            <CardHeader>
              <CardTitle className="text-[#1A1A1A] dark:text-white text-sm">Bønner bedt per serie</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.bySeries} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + '…' : name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.bySeries.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gender & Age */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#6B9EA0]" />
              Kjønnsfordeling (registrerte brukere)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byGender.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen data ennå</p>
            ) : (
              <div className="space-y-2">
                {stats.byGender.map((item, i) => {
                  const max = Math.max(...stats.byGender.map(d => d.value));
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm w-28 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                      <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A] dark:text-white w-8 text-right">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm">Aldersfordeling (registrerte brukere)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byAge.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen data ennå</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byAge}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D8" />
                  <XAxis dataKey="name" stroke="#6A6A6A" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#C8602A" radius={[4, 4, 0, 0]} name="Antall" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geolocation */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6B9EA0]" />
              Fordelt på land
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byCountry.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen geolokasjon ennå</p>
            ) : (
              <div className="space-y-2">
                {stats.byCountry.map((item, i) => {
                  const max = stats.byCountry[0].value;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                      <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A] dark:text-white w-8 text-right">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E8E0D8] dark:border-gray-800 bg-white dark:bg-[#2A2A2A]">
          <CardHeader>
            <CardTitle className="text-[#1A1A1A] dark:text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C8602A]" />
              Topp byer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byCity.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen bydata ennå</p>
            ) : (
              <div className="space-y-2">
                {stats.byCity.map((item, i) => {
                  const max = stats.byCity[0].value;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                      <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1919] rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-sm font-medium text-[#1A1A1A] dark:text-white w-8 text-right">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}