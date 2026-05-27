// Supabase-adapter som eksponerer samme form som den gamle Base44-klienten.
// Alle sider og komponenter importerer som default: `import db from '@/api/client'`.
//
// Fasade:
//   db.entities.<Name>.{ list, filter, get, create, update, delete }
//   db.auth.{ me, isAuthenticated, login, loginWithPassword,
//             setPassword, logout, updateMe, redirectToLogin }
//
// Lesing er offentlig der RLS-policy tillater det (prayers,
// prayer_series, content_pages). Skriving krever innlogging og
// admin-rolle for serie/bønn-innhold.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // eslint-disable-next-line no-console
  console.error('Mangler VITE_SUPABASE_URL eller VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Default-locken til @supabase/supabase-js bruker navigator.locks som
// har en kjent bug i Safari der den ikke alltid slipper låsen etter
// auth-operasjoner — alle påfølgende kall (getSession, query, refresh)
// henger til siden refreshes. Symptomet vi har sett: "Logger inn…"
// fryser, profil-query fryser, spinner låser appen.
//
// Vi har bare én fane om gangen og trenger ikke serialisering, så vi
// erstatter låsen med en no-op. Anbefalt workaround fra Supabase-issues.
const noopLock = async (_name, _acquireTimeout, fn) => fn();

export const sb = createClient(SUPABASE_URL ?? '', SUPABASE_KEY ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: noopLock,
  },
});

// Wrap en lovende-pasient i en timeout. Hvis tiden går ut returnerer
// vi et sentinel-objekt {__timeout:true, msg} så kallesiden kan velge
// å sjekke getSession() (auth-kall lykkes ofte server-side selv om
// klient-Promise henger — kjent Supabase-JS-bug).
function withTimeout(promise, ms, msg) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ __timeout: true, msg }), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Base44-entitetsnavn → Supabase-tabellnavn
const TABLES = {
  Prayer: 'prayers',
  PrayerSeries: 'prayer_series',
  UserProgress: 'user_progress',
  PrayerLog: 'prayer_logs',
  ContentPage: 'content_pages',
  User: 'profiles',
  PushSubscription: 'push_subscriptions',
  PushPreference: 'push_preferences',
};

// Tabeller som har deleted_at og som vi automatisk filtrerer bort
const SOFT_DELETE_TABLES = new Set(['prayer_series', 'prayers']);

function applySort(query, sort) {
  if (!sort) return query;
  const desc = sort.startsWith('-');
  const col = desc ? sort.slice(1) : sort;
  // Base44 brukte 'created_date' — vi bruker 'created_at'
  const mapped = col === 'created_date' ? 'created_at' : col;
  return query.order(mapped, { ascending: !desc });
}

function makeEntity(entityName) {
  const table = TABLES[entityName];
  if (!table) throw new Error(`Ukjent entitet: ${entityName}`);
  const filterSoftDeleted = SOFT_DELETE_TABLES.has(table);

  const baseSelect = () => {
    let q = sb.from(table).select('*');
    if (filterSoftDeleted) q = q.is('deleted_at', null);
    return q;
  };

  return {
    async list(sort, limit) {
      let q = baseSelect();
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async filter(where, sort, limit) {
      let q = baseSelect().match(where ?? {});
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },

    async get(id) {
      let q = sb.from(table).select('*').eq('id', id);
      if (filterSoftDeleted) q = q.is('deleted_at', null);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },

    async create(row) {
      const { data, error } = await sb
        .from(table)
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, patch) {
      const { data, error, count } = await sb
        .from(table)
        .update(patch, { count: 'exact' })
        .eq('id', id)
        .select();
      if (error) throw error;
      if (!data || data.length === 0) {
        // eslint-disable-next-line no-console
        console.error(`UPDATE ${table} (id=${id}) returnerte 0 rader. RLS-blokkering? count=${count}, patch=`, patch);
        throw new Error(`Update på ${table} traff 0 rader (RLS?). Se konsoll.`);
      }
      return data[0];
    },

    async delete(id) {
      if (filterSoftDeleted) {
        const { error } = await sb
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb.from(table).delete().eq('id', id);
        if (error) throw error;
      }
    },
  };
}

const entityCache = {};
const entities = new Proxy(
  {},
  {
    get(_, name) {
      if (typeof name !== 'string') return undefined;
      if (!entityCache[name]) entityCache[name] = makeEntity(name);
      return entityCache[name];
    },
  }
);

const auth = {
  async me() {
    // getSession() skal lese fra localStorage uten nettverkskall, men
    // Supabase JS sin init-pipeline kan blokkere første kall etter
    // page load — gi den 3s, fall ellers tilbake til null-session så
    // appen rendrer.
    const sessionResult = await withTimeout(sb.auth.getSession(), 3000);
    if (sessionResult?.__timeout) {
      // eslint-disable-next-line no-console
      console.warn('me(): getSession timeout 3s, returnerer null');
      return null;
    }
    const session = sessionResult?.data?.session;
    const user = session?.user;
    if (!user) return null;

    // OBS: profil-queryen kan henge umiddelbart etter sign-in
    // (Supabase-klienten har et bug der queue-en blokkeres til
    // første token-refresh). Vi gir den 5 sek; hvis den ikke svarer
    // returnerer vi basisbrukeren så app-bootstrap ikke henger.
    const profilePromise = sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(
        () => resolve({ data: null, error: new Error('profile-timeout 5s') }),
        5000
      )
    );
    const { data: profile, error: profileErr } = await Promise.race([
      profilePromise,
      timeoutPromise,
    ]);
    if (profileErr) {
      // eslint-disable-next-line no-console
      console.warn('me() profile:', profileErr.message || profileErr);
    }

    return {
      id: user.id,
      email: user.email,
      // Felt fra auth.users.user_metadata (settes via updateMe)
      ...(user.user_metadata ?? {}),
      // Felt fra profiles-tabellen overskriver om duplikat
      ...(profile ?? {}),
      role: profile?.role ?? 'user',
    };
  },

  async isAuthenticated() {
    const {
      data: { session },
    } = await sb.auth.getSession();
    return !!session;
  },

  // Magic-link via e-post. Brukeren får en lenke i mailen som logger
  // dem inn etter klikk. Bruker timeout men har ingen "ble den sendt
  // likevel"-fallback — brukeren får eventuelt prøvd igjen.
  async login(email) {
    if (!email) throw new Error('E-post mangler');
    const result = await withTimeout(
      sb.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      }),
      15000
    );
    if (result?.__timeout) {
      return {
        data: null,
        error: new Error('Tidsavbrudd – prøv igjen. Lenken kan ha blitt sendt likevel.'),
      };
    }
    return result;
  },

  // Tradisjonell e-post + passord.
  //
  // KJENT BUG: sb.auth.signInWithPassword skriver session til
  // localStorage server-side OK, men klient-Promise kan henge på
  // grunn av en lock-bug i @supabase/supabase-js. Vi løser det ved
  // å sjekke getSession() etter timeout — hvis session finnes,
  // var login en suksess uansett.
  async loginWithPassword(email, password) {
    if (!email || !password) throw new Error('E-post og passord kreves');
    const result = await withTimeout(
      sb.auth.signInWithPassword({ email, password }),
      8000
    );
    if (result?.__timeout) {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session) {
        return { data: { user: session.user, session }, error: null };
      }
      return {
        data: null,
        error: new Error('Tidsavbrudd – sjekk passord og prøv igjen.'),
      };
    }
    return result;
  },

  // Sett/endre passord på innlogget bruker.
  //
  // OBS: sb.auth.updateUser og sb.auth.refreshSession henger for dette
  // prosjektet (samme grunn til at updateMe bypasser auth-API for
  // profil-felt). Vi ringer derfor en Edge Function (`set-password`)
  // som verifiserer JWT-en med anon-nøkkelen og oppdaterer passordet
  // med service-role via admin-API server-side.
  async setPassword(password) {
    if (!password) throw new Error('Passord mangler');

    const {
      data: { session },
    } = await sb.auth.getSession();
    if (!session) {
      return { data: null, error: new Error('Ikke innlogget') };
    }

    // 20s timeout så UI ikke står og spinner i det uendelige.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/set-password`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_KEY,
        },
        body: JSON.stringify({ password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          data: null,
          error: new Error(body?.error || `HTTP ${res.status}`),
        };
      }
      return { data: body, error: null };
    } catch (e) {
      if (e?.name === 'AbortError') {
        return {
          data: null,
          error: new Error('Tidsavbrudd – Edge Function svarte ikke på 20 sek.'),
        };
      }
      return { data: null, error: e };
    } finally {
      clearTimeout(t);
    }
  },

  async logout() {
    await sb.auth.signOut();
    window.location.assign('/');
  },

  // Oppdater brukerens egne profil-felt. Alt skrives til public.profiles
  // (vanlig PostgREST-PATCH). Vi unngår sb.auth.updateUser fordi det
  // går via auth-serveren og har vist seg å henge i praksis.
  async updateMe(patch) {
    const {
      data: { session },
    } = await sb.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Ikke innlogget');

    const profileFields = ['display_name', 'full_name'];
    const profilePatch = {};
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (profileFields.includes(key)) profilePatch[key] = value;
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await sb
        .from('profiles')
        .update(profilePatch)
        .eq('id', user.id);
      if (error) throw error;
    }
  },

  // Base44 brukte dette for full-page redirect til en hostet login.
  // Med magic-link finnes ingen tilsvarende side, så denne er en
  // no-op for nå. C4 vil håndtere login-knapp/modal i Layout.
  redirectToLogin() {
    // eslint-disable-next-line no-console
    console.warn(
      'auth.redirectToLogin: ikke implementert i Supabase-adapter (magic-link via Layout)'
    );
  },
};

// Geolokasjon via Supabase Edge Function (get-geolocation).
// Edge functionen kaller AbstractAPI IP-geolocation med klientens IP
// fra request-headers. Returnerer { country, country_code, city }.
// Stille feil — geo er kun for admin-statistikk og må aldri blokkere
// bønne-fullføring.
const geo = {
  async lookup() {
    try {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session) {
        // eslint-disable-next-line no-console
        console.log('[geo.lookup] no session');
        return { country: null, city: null };
      }

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-geolocation`, {
          method: 'GET',
          signal: ctrl.signal,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: SUPABASE_KEY,
          },
        });
        // eslint-disable-next-line no-console
        console.log('[geo.lookup] HTTP', res.status);
        if (!res.ok) return { country: null, city: null };
        const body = await res.json();
        // eslint-disable-next-line no-console
        console.log('[geo.lookup] response:', body);
        return body;
      } finally {
        clearTimeout(t);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('[geo.lookup] exception:', e);
      return { country: null, city: null };
    }
  },
};

// Brukerstyring — bare eiere kan kalle disse. Edge Function
// 'manage-user' validerer rollen og bruker service_role server-side.
const users = {
  async setRole(userId, role) {
    if (!userId || !role) throw new Error('userId og role kreves');
    return callManageUser({ action: 'set-role', targetUserId: userId, newRole: role });
  },
  async deleteUser(userId) {
    if (!userId) throw new Error('userId kreves');
    return callManageUser({ action: 'delete', targetUserId: userId });
  },
};

async function callManageUser(body) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return { error: new Error('Ikke innlogget') };

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-user`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: new Error(data?.error || `HTTP ${res.status}`) };
    return { data, error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Uventet feil') };
  } finally {
    clearTimeout(t);
  }
}

// Logger en klient-side feil til client_errors-tabellen. Brukes til å
// fange opp stille feil (RLS-avvisning, nett-timeout, etc) som
// ellers bare ville endt i console.error. Aldri throw — selv om
// loggingen feiler, må appen fortsette.
async function logError(context, error, extra = null) {
  try {
    const msg =
      error?.message || (typeof error === 'string' ? error : JSON.stringify(error)) || '';
    let user_id = null;
    try {
      const { data } = await sb.auth.getSession();
      user_id = data?.session?.user?.id ?? null;
    } catch {
      /* ignorer */
    }
    await sb.from('client_errors').insert({
      user_id,
      context,
      message: String(msg).slice(0, 1000),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
      url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : null,
      extra: extra || null,
    });
  } catch {
    /* svelg — feil-logger skal aldri krasje appen */
  }
}

export const db = {
  entities,
  auth,
  geo,
  users,
  logError,
  // Tomme stubs for kall som ble fjernet i Fase A (PDF).
  // Kaster slik at evt. gjenværende referanser blir synlige i runtime.
  integrations: {
    Core: {
      UploadFile: async () => {
        throw new Error('UploadFile er fjernet (var Base44-spesifikk)');
      },
    },
  },
  functions: {
    invoke: async (name) => {
      throw new Error(`db.functions.invoke('${name}') er fjernet`);
    },
  },
};

export default db;
