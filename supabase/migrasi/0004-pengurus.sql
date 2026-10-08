-- ============================================================
-- MIGRASI 0004 — STRUKTUR PENGURUS (data susunan DWP GTK Malut)
-- ============================================================

-- Seksi/bidang (dipakai halaman Pengurus dan pengelompokan kegiatan)
create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  urutan      smallint not null default 99,
  dibuat_pada timestamptz not null default now()
);

insert into public.sections (nama, urutan) values
  ('Pengurus Harian', 1),
  ('Bidang Pendidikan', 2),
  ('Bidang Ekonomi', 3),
  ('Bidang Sosial Budaya', 4)
on conflict (nama) do nothing;

-- Tambahan pada tabel periode: catatan
alter table public.periods add column if not exists catatan text;

-- Tambahan pada tabel jabatan (positions): kaitan ke seksi
alter table public.positions add column if not exists section_id uuid references public.sections(id) on delete set null;
alter table public.positions add column if not exists periode_id uuid references public.periods(id) on delete set null;
alter table public.positions add column if not exists profile_id uuid references public.profiles(id) on delete set null;

-- Keamanan
alter table public.sections enable row level security;

drop policy if exists sections_baca on public.sections;
create policy sections_baca on public.sections for select to authenticated using (true);

drop policy if exists sections_tulis on public.sections;
create policy sections_tulis on public.sections for all to authenticated
  using (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']))
  with check (public.apakah_salah_satu(array['super_admin','ketua','wakil_ketua','sekretaris']));

grant select, insert, update, delete on public.sections to authenticated;
