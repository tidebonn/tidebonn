-- 008_content_pages_nav.sql
--
-- Gjør content_pages selv-organiserende:
--   • nav_visibility  — 'menu' (vises i mobil-meny + Info-landing)
--                     | 'info-only' (kun Info-landing)
--   • order_index     — heltallsrekkefølge (lavere først). Seedes
--                       1..4 for de eksisterende sidene, default 100
--                       for nye så de havner bakerst.

alter table content_pages
  add column if not exists nav_visibility text not null default 'menu',
  add column if not exists order_index int not null default 100;

-- Seed rekkefølge for de fire eksisterende sidene
update content_pages set order_index = 1 where slug = 'hva-er-tidebonn'  and order_index = 100;
update content_pages set order_index = 2 where slug = 'hvordan-tidebonn' and order_index = 100;
update content_pages set order_index = 3 where slug = 'om-appen'         and order_index = 100;
update content_pages set order_index = 4 where slug = 'om-areopagos'     and order_index = 100;
