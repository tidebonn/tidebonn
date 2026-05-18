import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const pages = [
  { slug: 'om-tidebonn', title: 'Om tidebønn', file: '/tmp/om-tidebonn.html' },
  { slug: 'om-appen', title: 'Om appen', file: '/tmp/om-appen.html' },
];

for (const page of pages) {
  const content = await readFile(page.file, 'utf8');
  const { error } = await sb.from('content_pages').upsert(
    { slug: page.slug, title: page.title, content },
    { onConflict: 'slug' },
  );
  console.log(page.slug, error ? 'ERROR: ' + error.message : 'OK (' + content.length + ' bytes)');
}
