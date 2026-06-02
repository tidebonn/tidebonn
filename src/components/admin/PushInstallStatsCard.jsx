import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Bell } from 'lucide-react';
import db from '@/api/client';

// Etiketter for de åtte bønnetidene — speiler send-pending-pushes-funksjonen.
const TIME_LABELS = {
  matutin: 'Matutin',
  laudes: 'Laudes',
  prim: 'Prim',
  ters: 'Ters',
  sekst: 'Middagsbønn',
  non: 'Non',
  vesper: 'Vesper',
  kompletorium: 'Kompletorium',
};
const TIME_ORDER = ['matutin', 'laudes', 'prim', 'ters', 'sekst', 'non', 'vesper', 'kompletorium'];

function pct(num, denom) {
  if (!denom) return '–';
  return `${Math.round((num / denom) * 100)} %`;
}

function MetricBox({ label, value, sub }) {
  return (
    <div className="rounded-md border border-[#DECCB4] dark:border-[rgba(244,240,233,0.15)] p-4 bg-[#FAF6EF] dark:bg-[rgba(255,255,255,0.03)]">
      <p className="text-xs uppercase tracking-wider text-[#6A6A6A] dark:text-gray-400" style={{fontFamily: "'Montserrat', sans-serif"}}>
        {label}
      </p>
      <p className="mt-1 text-3xl font-light text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Spectral', Georgia, serif"}}>
        {value}
      </p>
      {sub && (
        <p className="text-xs text-[#6A6A6A] dark:text-gray-400">{sub}</p>
      )}
    </div>
  );
}

export default function PushInstallStatsCard({ users = [] }) {
  const [pushSubs, setPushSubs] = useState([]);
  const [pushPrefs, setPushPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [subs, prefs] = await Promise.all([
          db.entities.PushSubscription.list(),
          db.entities.PushPreference.list(),
        ]);
        if (!mounted) return;
        setPushSubs(subs || []);
        setPushPrefs(prefs || []);
      } catch (e) {
        if (mounted) setError(e?.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    const totalUsers = users.length;
    const installedCount = users.filter(u => u.installed_app_at).length;
    const subscribedUserIds = new Set(pushSubs.map(s => s.user_id).filter(Boolean));
    const pushUserCount = subscribedUserIds.size;
    const enabledPrefs = pushPrefs.filter(p => p.enabled);
    const byTime = TIME_ORDER.map(t => ({
      time_of_day: t,
      label: TIME_LABELS[t],
      count: new Set(
        enabledPrefs.filter(p => p.time_of_day === t).map(p => p.user_id)
      ).size,
    }));
    return { totalUsers, installedCount, pushUserCount, byTime };
  }, [users, pushSubs, pushPrefs]);

  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
      <CardHeader>
        <CardTitle className="text-[#2C2C2A] dark:text-[#F4F0E9] flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
          App & push
        </CardTitle>
        <p className="text-xs text-[#6A6A6A] dark:text-gray-400">
          Installasjon registreres første gang en innlogget bruker åpner appen i standalone-modus («fra hjemmeskjermen»).
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[#6A6A6A] dark:text-gray-400 italic">Laster …</p>
        ) : error ? (
          <p className="text-sm text-red-500">Kunne ikke laste push-data: {error}</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricBox
                label="Brukere totalt"
                value={stats.totalUsers}
              />
              <MetricBox
                label="Installert som app"
                value={stats.installedCount}
                sub={`${pct(stats.installedCount, stats.totalUsers)} av brukerne`}
              />
              <MetricBox
                label="Push aktivert"
                value={stats.pushUserCount}
                sub={stats.installedCount > 0
                  ? `${pct(stats.pushUserCount, stats.installedCount)} av installerte`
                  : `${pct(stats.pushUserCount, stats.totalUsers)} av brukerne`}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#6A6A6A] dark:text-gray-400 mb-3" style={{fontFamily: "'Montserrat', sans-serif"}}>
                <Bell className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                Ønsker push for bønnetid
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.byTime.map(t => (
                  <div
                    key={t.time_of_day}
                    className="rounded-md border border-[#DECCB4] dark:border-[rgba(244,240,233,0.15)] px-3 py-2 bg-[#FAF6EF] dark:bg-[rgba(255,255,255,0.03)]"
                  >
                    <p className="text-xs text-[#6A6A6A] dark:text-gray-400" style={{fontFamily: "'Spectral', Georgia, serif"}}>
                      {t.label}
                    </p>
                    <p className="text-xl font-light text-[#2C2C2A] dark:text-[#F4F0E9]" style={{fontFamily: "'Spectral', Georgia, serif"}}>
                      {t.count}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
