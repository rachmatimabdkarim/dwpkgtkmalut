-- ============================================================
-- MIGRASI 0009 — VIEW PUBLIK + PENGATURAN TAMPILAN SITUS
-- Tujuan: web publik HANYA boleh membaca dari view khusus ini.
-- View hanya memuat kolom yang aman. Data internal (RAB, catatan
-- persetujuan, bukti biaya, nama peserta) sama sekali tidak masuk.
-- ============================================================

-- ---------- 1. Pengaturan tampilan situs ----------
create table if not exists public.site_settings (
  id              smallint primary key default 1 check (id = 1),
  nama_aplikasi   text not null default 'Sistem Informasi DWP',
  nama_unit       text not null default 'Kantor GTK Malut',
  nama_organisasi text not null default 'Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara',
  warna_utama     text not null default '#0f766e',
  logo_path       text,
  favicon_path    text,
  alamat          text,
  telepon         text,
  email           text,
  diperbarui_pada timestamptz not null default now(),
  diperbarui_oleh uuid references public.profiles(id) on delete set null
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists site_settings_baca on public.site_settings;
create policy site_settings_baca on public.site_settings for select to authenticated using (true);

drop policy if exists site_settings_tulis_super on public.site_settings;
create policy site_settings_tulis_super on public.site_settings for all to authenticated
  using (public.apakah_super()) with check (public.apakah_super());

grant select on public.site_settings to authenticated;
grant insert, update on public.site_settings to authenticated;

-- ---------- 2. Kolom "slug" pada berita ----------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  judul         text not null,
  slug          text not null unique,
  ringkasan     text,
  isi           text,
  sumber        text not null default 'manual' check (sumber in ('manual','otomatis')),
  activity_id   uuid references public.activities(id) on delete set null,
  gambar_path   text,
  status        text not null default 'terbit' check (status in ('draf','antrean','terbit','arsip')),
  perlu_tinjauan boolean not null default false,
  terbit_pada   timestamptz,
  dibuat_oleh   uuid references public.profiles(id) on delete set null,
  dibuat_pada   timestamptz not null default now(),
  diperbarui_pada timestamptz not null default now()
);

create index if not exists idx_posts_status on public.posts(status, terbit_pada desc);

alter table public.posts enable row level security;

drop policy if exists posts_baca on public.posts;
create policy posts_baca on public.posts for select to authenticated using (true);

drop policy if exists posts_tulis on public.posts;
create policy posts_tulis on public.posts for all to authenticated
  using (public.apakah_salah_satu(array['super_admin','editor','ketua','wakil_ketua','sekretaris']))
  with check (public.apakah_salah_satu(array['super_admin','editor','ketua','wakil_ketua','sekretaris']));

grant select, insert, update, delete on public.posts to authenticated;

-- ---------- 3. VIEW PUBLIK ----------

-- Agenda: hanya kegiatan yang sudah disetujui/berjalan dan tidak disembunyikan.
-- Yang TIDAK ikut: RAB, TOR, catatan persetujuan, peserta, bukti.
create or replace view public.public_agenda as
select
  a.id,
  a.kode,
  a.judul,
  coalesce(nullif(a.ringkasan, ''), left(coalesce(a.tujuan, ''), 240)) as ringkasan,
  a.tanggal_mulai,
  a.tanggal_selesai,
  a.tempat,
  a.status,
  -- tautan sederhana untuk alamat berita/agenda
  regexp_replace(lower(a.judul), '[^a-z0-9]+', '-', 'g') as slug
from public.activities a
where a.is_hidden = false
  and a.status not in ('draf','diajukan','dalam_review','revisi','ditolak');

-- Berita: hanya yang sudah terbit.
create or replace view public.public_news as
select
  p.id,
  p.judul,
  p.slug,
  p.ringkasan,
  p.isi,
  p.gambar_path,
  p.terbit_pada,
  p.activity_id,
  p.sumber
from public.posts p
where p.status = 'terbit';

-- Galeri: hanya foto bertanda boleh publik (dari tabel berkas).
-- Struktur tabel `attachments` sudah punya kolom visibilitas & entitas.
create or replace view public.public_gallery as
select
  at.id,
  at.entitas_id as activity_id,
  at.path,
  at.keterangan,
  at.urutan,
  at.bucket,
  at.diunggah_pada
from (
  select a.id, a.entitas_id, a.path, a.keterangan,
         row_number() over (partition by a.entitas_id order by a.diunggah_pada) as urutan,
         a.bucket, a.diunggah_pada
  from public.attachments a
  where a.bucket = 'publik'
    and a.status = 'resmi'
    and a.visibilitas = 'publik'
    and coalesce(a.kategori, '') in ('foto_kegiatan','banner')
) at;

-- Pengaturan situs untuk publik: hanya kolom yang aman.
create or replace view public.public_site_settings as
select
  nama_aplikasi,
  nama_unit,
  nama_organisasi,
  warna_utama,
  logo_path,
  favicon_path,
  alamat,
  telepon,
  email
from public.site_settings
where id = 1;

-- Susunan pengurus untuk publik: nama, bidang, jabatan, email.
create or replace view public.public_officers as
select
  o.nama,
  o.bidang,
  o.jabatan,
  o.email,
  o.urutan
from public.officers o
order by o.urutan;

-- ---------- 4. Hak baca view publik ----------
-- Halaman publik dibaca lewat kunci publik (anon) hanya untuk view ini.
grant select on public.public_agenda to anon, authenticated;
grant select on public.public_news to anon, authenticated;
grant select on public.public_gallery to anon, authenticated;
grant select on public.public_site_settings to anon, authenticated;
grant select on public.public_officers to anon, authenticated;

select 'view publik siap' as keterangan;
