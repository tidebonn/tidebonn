import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, BookOpen, Activity, Hourglass, MapPin } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const COLORS = ['#4A6B65', '#BD7B59', '#7A9690', '#3a5550', '#A8CBCD', '#DECCB4', '#2D5450', '#E8A87C'];

const PERIOD_OPTIONS = [
  { id: 'all', label: 'Totalt' },
  { id: 'year', label: 'Siste år' },
  { id: 'month', label: 'Siste måned' },
  { id: 'week', label: 'Siste uke' },
  { id: 'day', label: 'Siste døgn' },
];

const WEEKDAYS_NO = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
// Reorder for monday-start week
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

function filterByPeriod(logs, period) {
  if (period === 'all') return logs;
  const now = new Date();
  const cutoff = new Date();
  if (period === 'year') cutoff.setFullYear(now.getFullYear() - 1);
  else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
  else if (period === 'week') cutoff.setDate(now.getDate() - 7);
  else if (period === 'day') cutoff.setDate(now.getDate() - 1);
  return logs.filter((l) => {
    const d = new Date(l.created_at);
    return !isNaN(d) && d >= cutoff;
  });
}

function CompactStatList({ title, data, valueKey = 'count' }) {
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen data ennå</p>
        ) : (
          <div className="space-y-2">
            {data.map((item, i) => {
              const v = item[valueKey] || 0;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-sm flex-1 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                  <div className="w-16 sm:w-20 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-xs w-14 text-right text-[#6A6A6A] dark:text-gray-400 tabular-nums">{v} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = '#4A6B65' }) {
  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
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
    const completed = filtered.filter((l) => l.completed).length;
    const totalMinutes = filtered.reduce((s, l) => s + (l.duration_minutes || 0), 0);
    const uniqueUsers = new Set(filtered.map((l) => l.user_id)).size;
    const avgMinutesPerPrayer = totalPrayers > 0 ? totalMinutes / totalPrayers : 0;

    // Active users (alle logs, ikke periodefiltrert)
    const now = Date.now();
    const within = (ms) => prayerLogs.filter((l) => {
      const d = new Date(l.created_at).getTime();
      return !isNaN(d) && d >= now - ms;
    });
    const active24h = new Set(within(86400000).map((l) => l.user_id)).size;
    const active7d = new Set(within(7 * 86400000).map((l) => l.user_id)).size;
    const active30d = new Set(within(30 * 86400000).map((l) => l.user_id)).size;

    // By time of day (laudes/sekst/vesper etc)
    const timeMap = {};
    filtered.forEach((l) => {
      const t = l.time_of_day || 'ukjent';
      timeMap[t] = (timeMap[t] || 0) + 1;
    });
    const byTime = Object.entries(timeMap)
      .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
      .sort((a, b) => b.count - a.count);

    // By series
    const seriesMap = {};
    filtered.forEach((l) => {
      const s = prayerSeries.find((s) => s.id === l.series_id);
      const name = s?.title || 'Ukjent';
      seriesMap[name] = (seriesMap[name] || 0) + 1;
    });
    const bySeries = Object.entries(seriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Daily activity — bruk ekte dato-objekter for sortering
    const dayMap = new Map();
    filtered.forEach((l) => {
      const d = new Date(l.created_at);
      if (isNaN(d)) return;
      // Normaliser til midnatt lokal tid
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });
    const dailyActivity = Array.from(dayMap.entries())
      .map(([key, count]) => {
        const [, m, dd] = key.split('-');
        return { key, label: `${dd}.${m}`, count };
      })
      .sort((a, b) => (a.key < b.key ? -1 : 1));

    // Hour of day (når på dagen ber folk)
    const hourMap = Array(24).fill(0);
    filtered.forEach((l) => {
      const d = new Date(l.created_at);
      if (!isNaN(d)) hourMap[d.getHours()]++;
    });
    const byHour = hourMap.map((count, hour) => ({
      hour: `${String(hour).padStart(2, '0')}`,
      count,
    }));

    // Weekday (mandag-start)
    const weekdayCounts = Array(7).fill(0);
    filtered.forEach((l) => {
      const d = new Date(l.created_at);
      if (!isNaN(d)) weekdayCounts[d.getDay()]++;
    });
    const byWeekday = WEEKDAY_ORDER.map((dow) => ({
      name: WEEKDAYS_NO[dow],
      count: weekdayCounts[dow],
    }));

    // Gruppemarkører — viser hvor mange som har lest med I/II-toggle
    // på vs av. Bare bønner med en eksplisitt boolean teller med
    // (null = gammel logg uten data → ekskluderes fra %).
    let usedMarkers = 0;
    let withoutMarkers = 0;
    filtered.forEach((l) => {
      if (l.used_group_markers === true) usedMarkers++;
      else if (l.used_group_markers === false) withoutMarkers++;
    });
    const byGroupMarkers = [];
    if (usedMarkers > 0 || withoutMarkers > 0) {
      byGroupMarkers.push({ name: 'Med I/II-markører', value: usedMarkers });
      byGroupMarkers.push({ name: 'Uten markører', value: withoutMarkers });
    }

    // Geo-fordeling (fra Edge Function geo-lookup ved fullføring)
    const countryMap = {};
    filtered.forEach((l) => {
      if (l.location_country) countryMap[l.location_country] = (countryMap[l.location_country] || 0) + 1;
    });
    const byCountry = Object.entries(countryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const cityMap = {};
    filtered.forEach((l) => {
      if (l.location_city) cityMap[l.location_city] = (cityMap[l.location_city] || 0) + 1;
    });
    const byCity = Object.entries(cityMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Mest populær bønn (kun navn på serien er kjent her, vi har ikke
    // hentet prayers her — viser kun serie/dag/tid-kombinasjon).
    const prayerCombo = {};
    filtered.forEach((l) => {
      const key = `${l.series_id}|${l.day}|${l.time_of_day}`;
      prayerCombo[key] = (prayerCombo[key] || 0) + 1;
    });
    let topPrayer = null;
    let topCount = 0;
    Object.entries(prayerCombo).forEach(([k, v]) => {
      if (v > topCount) {
        topCount = v;
        const [sid, day, t] = k.split('|');
        const s = prayerSeries.find((s) => s.id === sid);
        topPrayer = { series: s?.title || 'Ukjent', day, time: t, count: v };
      }
    });

    // Gender distribution
    const genderMap = { mann: 0, kvinne: 0, 'ikke oppgitt': 0 };
    userProgressList.forEach((p) => {
      if (p.gender === 'mann') genderMap.mann++;
      else if (p.gender === 'kvinne') genderMap.kvinne++;
      else genderMap['ikke oppgitt']++;
    });
    const byGender = Object.entries(genderMap)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .filter((d) => d.value > 0);

    // Age distribution
    const currentYear = new Date().getFullYear();
    const ageBuckets = { '< 18': 0, '18–29': 0, '30–44': 0, '45–59': 0, '60+': 0, 'Ikke oppgitt': 0 };
    userProgressList.forEach((p) => {
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
      .filter((d) => d.count > 0);

    return {
      totalPrayers, completed, totalMinutes, uniqueUsers, avgMinutesPerPrayer,
      active24h, active7d, active30d,
      byTime, bySeries, dailyActivity, byHour, byWeekday, byGroupMarkers,
      topPrayer,
      byCountry, byCity,
      byGender, byAge,
    };
  }, [filtered, prayerLogs, prayerSeries, userProgressList]);

  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;
  const timeStr = hours > 0 ? `${hours}t ${mins}m` : `${mins}m`;
  const avgStr = stats.avgMinutesPerPrayer > 0 ? `${stats.avgMinutesPerPrayer.toFixed(1)}m` : '–';

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setPeriod(opt.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              period === opt.id
                ? 'bg-[#4A6B65] dark:bg-[#BD7B59] text-[#F4F0E9]'
                : 'bg-[#E8E3DC] dark:bg-[#2A2A2A] text-[#4A4A4A] dark:text-gray-300 hover:bg-[#DDD8D0]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Bønner bedt" value={stats.totalPrayers} sub={`${stats.completed} fullført`} />
        <StatCard icon={Clock} label="Tid i bønn" value={timeStr} sub={`${stats.totalMinutes} minutter`} color="#7A9690" />
        <StatCard icon={Hourglass} label="Snitt per bønn" value={avgStr} color="#BD7B59" />
        <StatCard icon={Users} label="Unike brukere" value={stats.uniqueUsers} sub={totalUsers > 0 ? `${totalUsers} brukere totalt` : undefined} />
      </div>

      {/* Active users */}
      <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#4A6B65]" />
            Aktive brukere
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#4A6B65]">{stats.active24h}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 24 timer</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#4A6B65]">{stats.active7d}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 7 dager</p>
            </div>
            <div className="text-center p-3 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-lg">
              <p className="text-2xl font-bold text-[#4A6B65]">{stats.active30d}</p>
              <p className="text-xs text-[#6A6A6A] dark:text-gray-400 mt-1">Siste 30 dager</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily activity */}
      {stats.dailyActivity.length > 0 && (
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">Daglig aktivitet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DECCB4" />
                <XAxis dataKey="label" stroke="#6A6A6A" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#4A6B65" strokeWidth={2} dot={{ r: 3 }} name="Bønner" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Hour of day + Weekday */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">Tid på døgnet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DECCB4" />
                <XAxis dataKey="hour" stroke="#6A6A6A" tick={{ fontSize: 10 }} interval={2} />
                <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(h) => `Kl. ${h}:00`} />
                <Bar dataKey="count" fill="#4A6B65" radius={[4, 4, 0, 0]} name="Bønner" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">Ukedag</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.byWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DECCB4" />
                <XAxis dataKey="name" stroke="#6A6A6A" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#BD7B59" radius={[4, 4, 0, 0]} name="Bønner" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tre kompakte stat-lister side om side */}
      <div className="grid md:grid-cols-3 gap-6">
        <CompactStatList title="Per tidebønn" data={stats.byTime} valueKey="count" />
        <CompactStatList title="Gruppemarkører" data={stats.byGroupMarkers} valueKey="value" />
        <CompactStatList title="Per serie" data={stats.bySeries} valueKey="value" />
      </div>

      {/* Gender & Age */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-[#4A6B65]" />
              Kjønnsfordeling
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byGender.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen data ennå</p>
            ) : (
              <div className="space-y-2">
                {stats.byGender.map((item, i) => {
                  const max = Math.max(...stats.byGender.map((d) => d.value));
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-sm w-28 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                      <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-sm font-medium text-[#2C2C2A] dark:text-[#F4F0E9] w-8 text-right">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">Aldersfordeling</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.byAge.length === 0 ? (
              <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Ingen data ennå</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.byAge}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DECCB4" />
                  <XAxis dataKey="name" stroke="#6A6A6A" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6A6A6A" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#BD7B59" radius={[4, 4, 0, 0]} name="Antall" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Geo distribution */}
      {(stats.byCountry.length > 0 || stats.byCity.length > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {stats.byCountry.length > 0 && (
            <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <CardHeader>
                <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#4A6B65]" />
                  Fordelt på land
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.byCountry.map((item, i) => {
                    const max = stats.byCountry[0].value;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="text-sm w-32 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                        <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-sm font-medium text-[#2C2C2A] dark:text-[#F4F0E9] w-8 text-right">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.byCity.length > 0 && (
            <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <CardHeader>
                <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#BD7B59]" />
                  Topp byer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.byCity.map((item, i) => {
                    const max = stats.byCity[0].value;
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="text-sm w-32 truncate text-[#4A4A4A] dark:text-gray-300">{item.name}</span>
                        <div className="flex-1 bg-[#F5F0EB] dark:bg-[#1A1917] rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-sm font-medium text-[#2C2C2A] dark:text-[#F4F0E9] w-8 text-right">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top prayer */}
      {stats.topPrayer && (
        <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] text-sm">Mest brukte bønn i perioden</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#4A4A4A] dark:text-gray-300">
              <strong className="text-[#4A6B65]">{stats.topPrayer.series}</strong>
              {' '}— dag {stats.topPrayer.day}, {stats.topPrayer.time}
              {' '}<span className="text-[#6A6A6A]">({stats.topPrayer.count} bønner)</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
