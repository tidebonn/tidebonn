-- Migrasjon 001: Fjern ubrukte strukturerte felt på prayers
--
-- Bakgrunn: appen ble forenklet til kun freetext-bønner (full HTML i
-- free_text_content). De gamle strukturerte feltene (hymne, psalm,
-- canticle, reading, etc.) ble aldri brukt i den endelige løysingen.
--
-- Frontend-konsekvens: PrayerEditor i admin-modulen og PrayerContent-
-- renderen referer fortsatt til disse feltene. Det ryddes i Fase D.

alter table prayers
  drop column if exists lords_prayer,
  drop column if exists opening,
  drop column if exists hymne,
  drop column if exists psalm,
  drop column if exists psalm_2,
  drop column if exists psalm_3,
  drop column if exists canticle,
  drop column if exists reading,
  drop column if exists short_reading,
  drop column if exists response,
  drop column if exists examination,
  drop column if exists kyrie,
  drop column if exists intercession,
  drop column if exists closing_prayer,
  drop column if exists blessing;
