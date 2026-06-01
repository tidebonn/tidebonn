-- 005_restructure_content_pages.sql
--
-- Restrukturering av «Les mer»-seksjonen:
--   • Renamer eksisterende slug 'om-tidebonn' → 'hva-er-tidebonn'
--   • Inserter to nye tomme rader: 'hvordan-tidebonn' og 'om-areopagos'
--   • 'om-appen' beholdes urørt
--
-- Sidene rendres via /HvaErTidebonn, /HvordanTidebonn, /About,
-- /OmAreopagos (kobles til via /LesMer-landingsside).

-- 1) Rename eksisterende slug
update content_pages
set slug = 'hva-er-tidebonn',
    title = coalesce(nullif(title, ''), 'Hva er tidebønn')
where slug = 'om-tidebonn';

-- 2) Insert nye sider (idempotent — ingenting skjer om de finnes)
insert into content_pages (slug, title, content)
values
  ('hva-er-tidebonn', 'Hva er tidebønn', null),
  ('hvordan-tidebonn', 'Hvordan be tidebønn', null),
  ('om-appen',        'Om appen',          null),
  ('om-areopagos',    'Om Areopagos',      null)
on conflict (slug) do nothing;
