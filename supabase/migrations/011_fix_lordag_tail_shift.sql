-- 011_fix_lordag_tail_shift.sql
--
-- Korreksjon etter migrasjon 010: tail-tider (laudes/sekst) på dager
-- hvor day mod 7 == 0 (= slutten av hver bønnedøgn-uke) havnet én uke
-- for tidlig.
--
-- Roten: seed-skriptet (supabase/seed-prayers.mjs) tagget filer som
-- uke{X}_lørdag_* med day=(X-1)*7+1, men PDF-konvensjonen lumper
-- BÅDE 1. Lørdag av uke X (vesper/komp = head av bø (X-1)*7+1) OG
-- 2. Lørdag av uke X (laudes/sekst = tail av bø 7*X) under samme
-- "uke X Lørdag"-overskrift. Vesper/komp havnet riktig sted, men
-- laudes/sekst burde vært tagget med day=7*X.
--
-- Etter migrasjon 010 (tail-shift -1) ble disse til day=7*X-1, fortsatt
-- en uke for tidlig. Denne migrasjonen shifter dem +7 (mod cycle_len)
-- så de havner på riktig bønnedøgn:
--   day=28 laudes/sekst → day=7  (uke 1 last)
--   day=7  laudes/sekst → day=14 (uke 2 last)
--   day=14 laudes/sekst → day=21 (uke 3 last)
--   day=21 laudes/sekst → day=28 (uke 4 last = wraparound)
--
-- Idempotent via prayer_series.lordag_tail_fixed_at.

alter table prayer_series
  add column if not exists lordag_tail_fixed_at timestamptz;

-- Backup (kun første kjøring)
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'prayers_pre_lordag_fix_backup'
  ) then
    create table prayers_pre_lordag_fix_backup as select * from prayers;
  end if;
end $$;

-- Fiks
do $$
declare
  series_rec record;
  cycle_len int;
  hour_of_start numeric;
begin
  for series_rec in
    select * from prayer_series
    where bonnedogn_migrated_at is not null
      and lordag_tail_fixed_at is null
      and is_active = true
  loop
    -- Bare uke-modus med syklus delelig på 7
    if series_rec.sort_by != 'weeks' then
      continue;
    end if;

    cycle_len := coalesce(series_rec.total_weeks, 4) * 7;

    hour_of_start := case coalesce(series_rec.start_time, 'laudes')
      when 'matutin' then 2
      when 'laudes' then 6
      when 'prim' then 6.5
      when 'ters' then 9
      when 'sekst' then 12
      when 'non' then 15
      when 'vesper' then 18
      when 'kompletorium' then 21
      else 6
    end;

    -- Pass 1: flytt tail-tider på end-of-week-posisjoner ut av valid range
    update prayers
    set day = day + 2000
    where series_id = series_rec.id
      and day between 1 and cycle_len
      and day % 7 = 0  -- end-of-bønnedøgn-week (7, 14, 21, 28 for cycle 28)
      and (case time_of_day
        when 'matutin' then 2
        when 'laudes' then 6
        when 'prim' then 6.5
        when 'ters' then 9
        when 'sekst' then 12
        when 'non' then 15
        when 'vesper' then 18
        when 'kompletorium' then 21
        else 0
      end) < hour_of_start;

    -- Pass 2: shift +7 med wraparound mod cycle_len
    -- temp_day=2007 (var 7) → 14
    -- temp_day=2014 (var 14) → 21
    -- temp_day=2021 (var 21) → 28
    -- temp_day=2028 (var 28) → 7
    update prayers
    set day = ((day - 2000 - 1 + 7) % cycle_len) + 1
    where series_id = series_rec.id
      and day > 2000;

    update prayer_series
    set lordag_tail_fixed_at = now()
    where id = series_rec.id;
  end loop;
end $$;

-- -----------------------------------------------------------------
-- ROLLBACK (kjør kun hvis fiksen gikk feil — kommentert ut)
-- -----------------------------------------------------------------
-- truncate prayers;
-- insert into prayers select * from prayers_pre_lordag_fix_backup;
-- update prayer_series set lordag_tail_fixed_at = null;
