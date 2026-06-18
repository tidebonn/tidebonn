-- 010_migrate_to_bonnedogn_tagging.sql
--
-- Migrerer prayers fra kalenderdag-tagging til bønnedøgn-tagging.
--
-- Før:  day=1 inneholder Lørdagens [laudes, sekst, vesper, komp]
--                       (alle 4 bønner på samme kalenderdag Lør)
-- Etter: day=1 inneholder bønnedøgn 1 = Lør vesper → Søn vesper
--                       (Lør vesper, Lør komp, Søn laudes, Søn sekst)
--
-- Algoritme: alle bønner med klokketid < start_time («tail»-tider) er
-- liturgisk del av FORRIGE bønnedøgn. Vi shifter dem ett bønnedøgn
-- bakover med wraparound:
--   for hver tail-bønn p: p.day := ((p.day - 2 + cycle_length) mod cycle_length) + 1
-- Head-tider (klokketid >= start_time) flyttes ikke.
--
-- Idempotent: kjører ikke samme serie to ganger (sjekker
-- bonnedogn_migrated_at). Backup-tabell prayers_pre_bonnedogn_backup
-- opprettes på første kjøring og kan brukes til å rulle tilbake.

-- 1. Tracking-kolonne
alter table prayer_series
  add column if not exists bonnedogn_migrated_at timestamptz;

-- 2. Backup (opprettes bare første gang)
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'prayers_pre_bonnedogn_backup'
  ) then
    create table prayers_pre_bonnedogn_backup as select * from prayers;
  end if;
end $$;

-- 3. Migrering (skipper serier som allerede er migrert)
do $$
declare
  series_rec record;
  cycle_len int;
  hour_of_start numeric;
begin
  for series_rec in
    select * from prayer_series
    where bonnedogn_migrated_at is null
      and is_active = true
  loop
    cycle_len := case
      when series_rec.sort_by = 'weeks' then coalesce(series_rec.total_weeks, 4) * 7
      else coalesce(series_rec.total_days, 30)
    end;

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

    -- Pass 1: flytt tail-bønner midlertidig ut av gyldig dag-range
    -- (day + 1000) så vi unngår unique-constraint-konflikter på
    -- (series_id, day, time_of_day) under Pass 2.
    update prayers
    set day = day + 1000
    where series_id = series_rec.id
      and day between 1 and cycle_len
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

    -- Pass 2: bring tilbake med en dag bakover-shift og wraparound.
    -- temp_day=1001 (var day=1) → day=cycle_len
    -- temp_day=1002 (var day=2) → day=1
    -- temp_day=1003 (var day=3) → day=2
    -- …
    -- temp_day=1000+cycle_len (var day=cycle_len) → day=cycle_len-1
    update prayers
    set day = ((day - 1000 + cycle_len - 2) % cycle_len) + 1
    where series_id = series_rec.id
      and day > 1000;

    -- Marker serien som migrert
    update prayer_series
    set bonnedogn_migrated_at = now()
    where id = series_rec.id;
  end loop;
end $$;

-- -----------------------------------------------------------------
-- ROLLBACK (kjør kun hvis migreringen gikk feil — kommentert ut)
-- -----------------------------------------------------------------
-- truncate prayers;
-- insert into prayers select * from prayers_pre_bonnedogn_backup;
-- update prayer_series set bonnedogn_migrated_at = null;
