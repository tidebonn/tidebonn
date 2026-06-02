-- 007_content_pages_menu_label.sql
--
-- Legger til menu_label-kolonne på content_pages. Brukes som
-- visningsnavn i mobil-menyen og info-dropdown, slik at admin kan
-- redigere menyteksten uavhengig av sidens egen tittel.
--
-- Hvis menu_label er null/tom, faller koden tilbake til title (og
-- til slutt en hardkodet fallback i Layout.jsx for å unngå tomt
-- menypunkt).

alter table content_pages
  add column if not exists menu_label text;
