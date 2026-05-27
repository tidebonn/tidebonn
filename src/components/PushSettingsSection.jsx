import React, { useEffect, useState } from 'react';
import db from '@/api/client';
import { Bell, BellOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Standard-tider per bønnetid (Oslo lokaltid)
const DEFAULT_TIMES = {
  matutin: '03:00',
  laudes: '07:00',
  prim: '07:30',
  ters: '09:00',
  sekst: '12:00',
  non: '15:00',
  vesper: '18:00',
  kompletorium: '22:00',
};

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

// VAPID public key (settes som env-var i Vercel + .env.local)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushSettingsSection({ user, series }) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [subscribing, setSubscribing] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  // preferences[time_of_day] = { enabled: boolean, notify_at: 'HH:MM' }
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);

  const availableTimes = series?.available_prayer_times || [];

  useEffect(() => {
    // Vis kun i installert PWA
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsStandalone(standalone);

    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const prefs = await db.entities.PushPreference.filter({ user_id: user.id });
        const map = {};
        for (const t of availableTimes) {
          const existing = prefs.find((p) => p.time_of_day === t);
          map[t] = existing
            ? { enabled: existing.enabled, notify_at: existing.notify_at.slice(0, 5) }
            : { enabled: false, notify_at: DEFAULT_TIMES[t] || '08:00' };
        }
        setPreferences(map);

        const subs = await db.entities.PushSubscription.filter({ user_id: user.id });
        setHasSubscription(subs.length > 0);
      } catch (e) {
        console.error('Last push-prefs feilet:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id, availableTimes.join(',')]);

  const subscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      toast.error('Mangler VITE_VAPID_PUBLIC_KEY i env');
      return;
    }
    setSubscribing(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        toast.error('Varsler ble blokkert');
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      await db.entities.PushSubscription.create({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
      });
      setHasSubscription(true);
      toast.success('Varsler aktivert på denne enheten');
    } catch (e) {
      console.error('Subscribe feilet:', e);
      db.logError('push_subscribe', e, { user_id: user?.id });
      toast.error('Kunne ikke aktivere varsler');
    } finally {
      setSubscribing(false);
    }
  };

  const unsubscribe = async () => {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await db.entities.PushSubscription.filter({ endpoint: subscription.endpoint }).then(
          (subs) => Promise.all(subs.map((s) => db.entities.PushSubscription.delete(s.id))),
        );
      }
      setHasSubscription(false);
      toast.success('Varsler avslått på denne enheten');
    } catch (e) {
      console.error('Unsubscribe feilet:', e);
    } finally {
      setSubscribing(false);
    }
  };

  const updatePref = async (time_of_day, patch) => {
    const newState = { ...preferences[time_of_day], ...patch };
    setPreferences({ ...preferences, [time_of_day]: newState });
    try {
      // Upsert (POST hvis ny, PATCH hvis finnes)
      const existing = await db.entities.PushPreference.filter({
        user_id: user.id,
        time_of_day,
      });
      const payload = {
        user_id: user.id,
        time_of_day,
        enabled: newState.enabled,
        notify_at: newState.notify_at.length === 5 ? `${newState.notify_at}:00` : newState.notify_at,
        // Reset last_sent ved endring så ny tid faktisk trigges
        last_sent_date: null,
      };
      if (existing.length > 0) {
        await db.entities.PushPreference.update(existing[0].id, payload);
      } else {
        await db.entities.PushPreference.create(payload);
      }
    } catch (e) {
      console.error('Oppdater pref feilet:', e);
      db.logError('push_pref_update', e, { user_id: user?.id, time_of_day });
      toast.error('Kunne ikke lagre');
    }
  };

  if (!isStandalone) return null;
  if (!user) return null;
  if (availableTimes.length === 0) return null;

  return (
    <Card className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2C2C2A] dark:text-[#F4F0E9]">
          <Bell className="w-5 h-5 text-[#4A6B65] dark:text-[#BD7B59]" />
          Pushvarsler
        </CardTitle>
        <CardDescription>
          Få påminnelse om bønnetidene du har valgt. Varselet åpner aktuell bønn direkte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasSubscription ? (
          <Button
            onClick={subscribe}
            disabled={subscribing}
            className="bg-[#4A6B65] hover:bg-[#3a5550] dark:bg-[#BD7B59] dark:hover:bg-[#A56347] text-[#F4F0E9]"
          >
            <Bell className="w-4 h-4 mr-2" />
            {subscribing ? 'Aktiverer…' : 'Aktiver varsler på denne enheten'}
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#4A4A4A] dark:text-gray-300">
                Varsler er aktivert på denne enheten.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={unsubscribe}
                disabled={subscribing}
                className="border-[#DECCB4] dark:border-[rgba(244,240,233,0.2)]"
              >
                <BellOff className="w-4 h-4 mr-2" />
                Slå av
              </Button>
            </div>

            {loading ? (
              <p className="text-sm text-[#9A9A9A]">Laster…</p>
            ) : (
              <div className="space-y-2">
                {availableTimes.map((t) => {
                  const pref = preferences[t] || { enabled: false, notify_at: DEFAULT_TIMES[t] };
                  return (
                    <div
                      key={t}
                      className="flex items-center justify-between gap-3 py-2 border-b border-[#E8E0D8] dark:border-[rgba(244,240,233,0.08)] last:border-0"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={pref.enabled}
                          onCheckedChange={(v) => updatePref(t, { enabled: v })}
                        />
                        <span
                          className="text-sm text-[#2C2C2A] dark:text-[#F4F0E9]"
                          style={{
                            fontFamily: "'Spectral', Georgia, serif",
                            fontWeight: 400,
                            fontSize: '1rem',
                          }}
                        >
                          {TIME_LABELS[t] || t}
                        </span>
                      </div>
                      <Input
                        type="time"
                        value={pref.notify_at}
                        disabled={!pref.enabled}
                        onChange={(e) => updatePref(t, { notify_at: e.target.value })}
                        className="w-28 text-sm border-[#E8E0D8] dark:border-gray-700"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Varsler er blokkert i nettleseren. Slå på i innstillingene for å bruke pushvarsler.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
