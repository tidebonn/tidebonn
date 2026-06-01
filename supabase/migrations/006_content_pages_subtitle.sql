-- 006_content_pages_subtitle.sql
--
-- Legger til subtitle-kolonne på content_pages. Brukes som
-- kort-blurb under tittelen på /LesMer-landingen, og kan
-- redigeres av admin sammen med tittel og innhold.

alter table content_pages
  add column if not exists subtitle text;

-- Seed sensible default-undertitler for de fire eksisterende sidene
-- (idempotent — endrer kun rader som ikke allerede har subtitle).
update content_pages
   set subtitle = 'En kort innføring i tidebønnens historie, struktur og betydning.'
 where slug = 'hva-er-tidebonn' and subtitle is null;

update content_pages
   set subtitle = 'Praktisk veiledning til å bruke appen som ditt bønnerom.'
 where slug = 'hvordan-tidebonn' and subtitle is null;

update content_pages
   set subtitle = 'Bakgrunnen for Tidebønn-appen og hvem som står bak.'
 where slug = 'om-appen' and subtitle is null;

update content_pages
   set subtitle = 'Om misjonsstiftelsen som har utviklet appen.'
 where slug = 'om-areopagos' and subtitle is null;
