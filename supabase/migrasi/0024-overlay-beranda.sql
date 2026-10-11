-- ============================================================
-- MIGRASI 0024 — Pengaturan lapisan warna & gradasi foto beranda
--
-- Foto besar beranda diberi lapisan gelap supaya tulisan putih di atasnya
-- selalu terbaca. Sebelumnya nilai lapisan itu ditulis tetap di kode.
-- Migrasi ini menjadikannya dapat diatur Super Admin:
--   - warna lapisan
--   - tingkat kegelapan (0–100)
--   - arah gradasi (kiri→kanan, terang di kanan, dsb.)
--   - bentuk gradasi (tajam di kiri, merata, gelap merata)
-- ============================================================

alter table public.site_settings
  add column if not exists hero_overlay_warna   text,
  add column if not exists hero_overlay_pekat   integer,
  add column if not exists hero_overlay_arah    text,
  add column if not exists hero_overlay_bentuk  text;

comment on column public.site_settings.hero_overlay_warna is
  'Warna lapisan di atas foto besar beranda (kode heksadesimal).';
comment on column public.site_settings.hero_overlay_pekat is
  'Tingkat kegelapan lapisan, 0 (bening) sampai 100 (gelap penuh).';
comment on column public.site_settings.hero_overlay_arah is
  'Arah gradasi: kiri-ke-kanan, kanan-ke-kiri, atas-ke-bawah, atau merata.';
comment on column public.site_settings.hero_overlay_bentuk is
  'Bentuk gradasi: bertahap, merata, atau tajam di kiri.';

-- Nilai awal: sama dengan tampilan yang dipakai sekarang
update public.site_settings set
  hero_overlay_warna  = coalesce(hero_overlay_warna,  '#1b4a22'),
  hero_overlay_pekat  = coalesce(hero_overlay_pekat,  88),
  hero_overlay_arah   = coalesce(hero_overlay_arah,   'kiri-ke-kanan'),
  hero_overlay_bentuk = coalesce(hero_overlay_bentuk, 'bertahap')
where id = 1;

-- View publik memuat kolom baru
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
  peta_lintang, peta_bujur, peta_zoom,
  hero_judul, hero_takbir, hero_ringkasan, hero_tombol1, hero_tombol2, hero_foto_path,
  hero_overlay_warna, hero_overlay_pekat, hero_overlay_arah, hero_overlay_bentuk,
  visi, misi,
  bidang_1_nama, bidang_1_isi, bidang_2_nama, bidang_2_isi, bidang_3_nama, bidang_3_isi
from public.site_settings
where id = 1;

grant select on public.public_site_settings to anon, authenticated;

select 'pengaturan overlay siap' as hasil,
       hero_overlay_warna as warna, hero_overlay_pekat as pekat,
       hero_overlay_arah as arah, hero_overlay_bentuk as bentuk
from public.site_settings where id = 1;
