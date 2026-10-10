-- ============================================================
-- MIGRASI 0023 — Konten beranda baru
--
-- Beranda gaya baru butuh konten yang bisa diubah Super Admin tanpa
-- menyentuh kode: kalimat pembuka, visi & misi, dan tiga bidang program.
-- Semuanya disimpan di site_settings dan dibaca lewat view publik.
-- ============================================================

alter table public.site_settings
  add column if not exists hero_judul      text,
  add column if not exists hero_takbir     text,  -- kalimat kecil di atas judul
  add column if not exists hero_ringkasan  text,
  add column if not exists hero_tombol1    text,
  add column if not exists hero_tombol2    text,
  add column if not exists hero_foto_path  text,
  add column if not exists visi            text,
  add column if not exists misi            text,  -- satu misi per baris
  add column if not exists bidang_1_nama   text,
  add column if not exists bidang_1_isi    text,
  add column if not exists bidang_2_nama   text,
  add column if not exists bidang_2_isi    text,
  add column if not exists bidang_3_nama   text,
  add column if not exists bidang_3_isi    text;

comment on column public.site_settings.hero_judul is
  'Kalimat besar di foto beranda.';
comment on column public.site_settings.misi is
  'Daftar misi, satu baris satu misi.';
comment on column public.site_settings.hero_foto_path is
  'Path foto beranda di penyimpanan (bucket publik).';

-- Nilai awal: sesuai rancangan yang disetujui
update public.site_settings set
  hero_takbir     = coalesce(hero_takbir, 'Selamat Datang'),
  hero_judul      = coalesce(hero_judul, 'Bersama Membangun Keluarga Sejahtera, Pendidikan Bermutu'),
  hero_ringkasan  = coalesce(hero_ringkasan,
    'Dharma Wanita Persatuan Kantor GTK Provinsi Maluku Utara memperkuat peran perempuan dalam keluarga, dunia pendidikan, dan pembangunan daerah.'),
  hero_tombol1    = coalesce(hero_tombol1, 'Lihat Agenda Kegiatan'),
  hero_tombol2    = coalesce(hero_tombol2, 'Kenali Kami'),
  visi            = coalesce(visi,
    'Menjadi organisasi istri pegawai Aparatur Sipil Negara yang profesional untuk memperkuat peran serta perempuan dalam pembangunan bangsa.'),
  misi            = coalesce(misi,
    E'Mengembangkan sumber daya manusia DWP yang berkualitas dan berwawasan global.\nMensejahterakan anggota, keluarga, dan masyarakat melalui Bidang Pendidikan, Ekonomi, dan Sosial Budaya secara demokratis.\nMeningkatkan kerja sama multipihak dalam pelaksanaan program kerja DWP.\nMengembangkan sistem informasi manajemen DWP secara terintegrasi.'),
  bidang_1_nama   = coalesce(bidang_1_nama,  'Bidang Pendidikan'),
  bidang_1_isi    = coalesce(bidang_1_isi,
    'Peningkatan kapasitas anggota melalui pelatihan, literasi digital, dan pendampingan belajar keluarga.'),
  bidang_2_nama   = coalesce(bidang_2_nama,  'Bidang Ekonomi'),
  bidang_2_isi    = coalesce(bidang_2_isi,
    'Penguatan usaha anggota melalui bazar, pelatihan kewirausahaan, dan pengembangan produk lokal Maluku Utara.'),
  bidang_3_nama   = coalesce(bidang_3_nama,  'Bidang Sosial Budaya'),
  bidang_3_isi    = coalesce(bidang_3_isi,
    'Kegiatan sosial, bakti masyarakat, dan pelestarian budaya untuk mempererat kebersamaan anggota.')
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
  visi, misi,
  bidang_1_nama, bidang_1_isi, bidang_2_nama, bidang_2_isi, bidang_3_nama, bidang_3_isi
from public.site_settings
where id = 1;

grant select on public.public_site_settings to anon, authenticated;

select 'konten beranda siap' as hasil;
