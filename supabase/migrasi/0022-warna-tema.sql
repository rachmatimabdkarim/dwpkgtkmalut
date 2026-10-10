-- ============================================================
-- MIGRASI 0022 — Pengaturan warna tema website
--
-- Sebelumnya hanya ada SATU kolom warna (`warna_utama`). Desain baru
-- butuh beberapa warna: dasar gelap, aksen, tombol, dan halaman.
-- Migrasi ini menambah kolomnya, dan mengisi nilai awal dengan
-- warna khas DWP (diambil dari lambang resmi):
--   hijau tua #1b4a22 · emas #c99a1e · merah #a01010
-- ============================================================

alter table public.site_settings
  add column if not exists warna_dasar   text,  -- menu, footer, judul, blok gelap
  add column if not exists warna_aksen   text,  -- garis sorotan, tanda, ikon
  add column if not exists warna_tombol  text,  -- tombol utama (aksi)
  add column if not exists warna_halaman text,  -- latar lembut antar bagian
  add column if not exists warna_teks    text;  -- warna huruf utama

comment on column public.site_settings.warna_dasar is
  'Warna dasar gelap: menu, footer, judul, dan blok gelap.';
comment on column public.site_settings.warna_aksen is
  'Warna aksen: garis sorotan, tanda kutip, ikon, penanda.';
comment on column public.site_settings.warna_tombol is
  'Warna tombol utama (ajakan bertindak).';
comment on column public.site_settings.warna_halaman is
  'Warna latar lembut untuk memisahkan bagian halaman.';
comment on column public.site_settings.warna_teks is
  'Warna huruf utama pada latar terang.';

-- Isi nilai awal dengan warna khas DWP bila belum diatur
update public.site_settings set
  warna_dasar   = coalesce(warna_dasar,   '#1b4a22'),
  warna_aksen   = coalesce(warna_aksen,   '#c99a1e'),
  warna_tombol  = coalesce(warna_tombol,  '#c99a1e'),
  warna_halaman = coalesce(warna_halaman, '#f7f6ef'),
  warna_teks    = coalesce(warna_teks,    '#33382f')
where id = 1;

-- Warna utama tetap dipakai untuk tombol sekunder/tautan, samakan dengan dasar
update public.site_settings set warna_utama = coalesce(nullif(warna_utama, ''), '#1b4a22') where id = 1;

-- View publik harus ikut memuat kolom warna baru
drop view if exists public.public_site_settings;

create view public.public_site_settings as
select
  id,
  nama_aplikasi, nama_unit, nama_organisasi,
  warna_utama, warna_dasar, warna_aksen, warna_tombol, warna_halaman, warna_teks,
  logo_path, favicon_path,
  alamat, telepon, email,
  sambutan, profil_singkat,
  sub_judul_agenda, sub_judul_berita, sub_judul_galeri, sub_judul_unduhan,
  peta_lintang, peta_bujur, peta_zoom
from public.site_settings
where id = 1;

grant select on public.public_site_settings to anon, authenticated;

select 'pengaturan warna siap' as hasil;
