# Tidebønn

Progressiv webapp (PWA) for tidebønner på [tidebonn.no](https://tidebonn.no).
Bønnene følger et «bønnedøgn» som starter ved en valgt liturgisk tid
(f.eks. vesper), ikke ved midnatt — logikken ligger i `src/lib/bonnedogn.js`.

## Stack

- Vite 6 + React 18 (JSX)
- Tailwind CSS og shadcn/ui-komponenter i `src/components/ui`
- Supabase (Postgres, Auth, Edge Functions) bak fasaden i `src/api/client.js`
- vite-plugin-pwa / Workbox — service worker i `src/sw.js`, web-push-varsler
- react-router-dom; sider registreres i `src/pages.config.js`

## Kom i gang

```sh
npm install
npm run dev
```

Opprett `.env.local` med `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
og `VITE_VAPID_PUBLIC_KEY`.

| Kommando        | Hva                                                |
| --------------- | -------------------------------------------------- |
| `npm run dev`   | Vite dev-server                                    |
| `npm run build` | Produksjonsbygg til `dist/` (stille utskrift = OK) |
| `npm run lint`  | ESLint (`eslint . --quiet`)                        |
| `npm test`      | Enhetstester med `node --test` i `test/`           |
| `npm run seed`  | Lokalt seed-skript for bønner (aldri mot prod)     |

## Deploy

Push til `main` → GitHub Actions (`.github/workflows/deploy.yml`) bygger med
Vercel CLI og deployer til produksjon på Vercel. Ingen manuell deploy.

## Supabase

- **Migrasjoner** ligger i `supabase/migrations/` (nummerert `NNN_*.sql`).
  De kjøres mot prosjektet via Supabase MCP (`apply_migration`); fila i
  repoet er kopien som dokumenterer hva som er kjørt. `supabase/schema.sql`
  er et øyeblikksbilde av skjemaet.
- **Edge-funksjoner** (Deno) ligger i `supabase/functions/`:
  `get-geolocation`, `manage-user`, `send-pending-pushes`, `set-password`.
  Deployes via Supabase MCP (`deploy_edge_function`).
