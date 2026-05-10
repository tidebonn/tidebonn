// Supabase-adapter som eksponerer samme form som den gamle Base44-klienten.
// Alle sider og komponenter importerer som default: `import db from '@/api/client'`.
//
// Fasade:
//   db.entities.<Name>.{ list, filter, get, create, update, delete }
//   db.auth.{ me, isAuthenticated, login, logout, redirectToLogin }
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

export const sb = createClient(SUPABASE_URL ?? '', SUPABASE_KEY ?? '');

// Base44-entitetsnavn → Supabase-tabellnavn
const TABLES = {
  Prayer: 'prayers',
  PrayerSeries: 'prayer_series',
  UserProgress: 'user_progress',
  PrayerLog: 'prayer_logs',
  ContentPage: 'content_pages',
  User: 'profiles',
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
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;
    const { data: profile, error: profileErr } = await sb
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (profileErr) {
      // eslint-disable-next-line no-console
      console.error('me() profile-feil:', profileErr);
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
  // dem inn etter klikk.
  async login(email) {
    if (!email) throw new Error('E-post mangler');
    return sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
  },

  async logout() {
    await sb.auth.signOut();
    window.location.assign('/');
  },

  // Oppdater brukerens egne profil-felt. Skriver display_name og
  // andre fritekst-felt til auth.users.user_metadata; profil-rolle
  // og andre tabell-felt skrives til public.profiles.
  async updateMe(patch) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Ikke innlogget');

    const metadataKeys = ['display_name', 'full_name'];
    const profileKeys = ['gender', 'birth_date'];

    const metadata = {};
    const profilePatch = {};
    for (const [key, value] of Object.entries(patch ?? {})) {
      if (metadataKeys.includes(key)) metadata[key] = value;
      else if (profileKeys.includes(key)) profilePatch[key] = value;
    }

    if (Object.keys(metadata).length > 0) {
      const { error } = await sb.auth.updateUser({ data: metadata });
      if (error) throw error;
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

export const db = {
  entities,
  auth,
  // Tomme stubs for kall som ble fjernet i Fase A (PDF, geo).
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
